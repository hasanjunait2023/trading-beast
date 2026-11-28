import 'dotenv/config';
import { deliverTelegramBatch } from './services/telegram-delivery.js';
import {randomUUID} from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { analysisRoutes } from './routes/analysis.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/user.js';
import { adminRoutes } from './routes/admin.js';
import { telegramRoutes } from './routes/telegram.js';
import { errorHandler } from './middleware/errorHandler.js';
import { recoverExpiredRadarRuns } from './services/credits.js';
import { evaluateSessionStartAlerts } from './services/alerts.js';
import { prisma } from './services/db.js';
import { authMiddleware } from './middleware/auth.js';
import { getMiniAppOrigin } from './services/telegram-config.js';

const app: express.Express = express();
const PORT = process.env.PORT || 3000;

// CORS: comma-separated allowlist, e.g. "https://app.vercel.app,https://admin.vercel.app"
const allowedOrigins = [
  process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173,http://localhost:5174,http://localhost:5175'),
  process.env.ADMIN_FRONTEND_URL || ''
].join(',').split(',').map(o=>o.trim()).filter(Boolean);
if (process.env.TRUST_PROXY_HOPS) {
  const hops=Number(process.env.TRUST_PROXY_HOPS);
  if (!Number.isInteger(hops) || hops<1 || hops>5) throw new Error('Invalid TRUST_PROXY_HOPS');
  app.set('trust proxy',hops);
}

// The Telegram Mini App is served from TELEGRAM_MINI_APP_URL — trust its origin automatically
const miniAppOrigin = getMiniAppOrigin();
if (miniAppOrigin && !allowedOrigins.includes(miniAppOrigin)) {
  allowedOrigins.push(miniAppOrigin);
}

app.use(helmet());
app.use((req,res,next)=>{
  const id=randomUUID();
  const start=Date.now();
  res.setHeader('X-Request-Id',id);
  res.on('finish',()=>console.log(JSON.stringify({event:'http',requestId:id,method:req.method,status:res.statusCode,durationMs:Date.now()-start})));
  next();
});
app.use(
  cors({
    origin: (origin, callback) => {
      // Non-browser requests (curl, server-to-server) send no Origin — allow them
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({limit:'64kb'}));
app.use(
  rateLimit({
    skip: req=>['/health','/ready','/api/telegram/webhook'].includes(req.path),
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, error: 'Too many requests' },
  })
);

app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

app.get('/ready', async (_req,res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.radarRun.findFirst({select:{id:true}});
    await prisma.authSession.findFirst({select:{id:true}});
    await prisma.telegramDelivery.findFirst({select:{id:true}});
    res.json({success:true,data:{status:'ready'}});
  } catch {
    res.status(503).json({success:false,error:'Database not ready'});
  }
});

const userLimit=rateLimit({windowMs:60_000,max:90,keyGenerator:req=>(req as import('./middleware/auth.js').AuthRequest).user!.id,standardHeaders:true,legacyHeaders:false,message:{success:false,error:'Too many requests'}});
app.use('/api/analysis', authMiddleware, userLimit, analysisRoutes);
app.use('/api/auth', rateLimit({windowMs:15*60*1000,max:30,standardHeaders:true,legacyHeaders:false}), authRoutes);
app.use('/api/user', authMiddleware, userLimit, userRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/telegram', telegramRoutes);

app.use(errorHandler);

let recovering = false;
async function recover() {
  if (recovering) return;
  recovering = true;
  try { await recoverExpiredRadarRuns(); await prisma.loginCode.deleteMany({where:{expiresAt:{lt:new Date(Date.now()-86400000)}}}); await prisma.authSession.deleteMany({where:{expiresAt:{lt:new Date(Date.now()-86400000)}}}); } catch (e) { console.error('Radar recovery failed', e); } finally { recovering = false; }
}
let delivering=false;
async function deliver(){
  if(delivering || closing)return;
  delivering=true;
  try{await deliverTelegramBatch();}catch(e){console.error('Telegram queue worker failed',e instanceof Error?e.name:'Unknown');}finally{delivering=false;}
}
let evaluatingAlerts=false;
async function evaluateAlerts(){
  if(evaluatingAlerts || closing)return;
  evaluatingAlerts=true;
  try{await evaluateSessionStartAlerts(Math.floor(Date.now()/1000));}catch(e){console.error('Alert evaluation failed',e instanceof Error?e.name:'Unknown');}finally{evaluatingAlerts=false;}
}
const server=app.listen(PORT, () => {
  void deliver();
  setInterval(()=>void deliver(),5000).unref();
  void recover();
  setInterval(() => void recover(), 60_000).unref();
  void evaluateAlerts();
  setInterval(() => void evaluateAlerts(), 60_000).unref();
  console.log(`Server running on port ${PORT}`);
});

let closing=false;
function shutdown(){
  if(closing) return;
  closing=true;
  server.close(()=>{void prisma.$disconnect().finally(()=>process.exit(0));});
  setTimeout(()=>process.exit(1),15000).unref();
}
process.once('SIGTERM',shutdown);
process.once('SIGINT',shutdown);
export { app };