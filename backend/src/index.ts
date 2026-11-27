import 'dotenv/config';
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
import { prisma } from './services/db.js';
import { authMiddleware } from './middleware/auth.js';

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

app.use(helmet());
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
    res.json({success:true,data:{status:'ready'}});
  } catch {
    res.status(503).json({success:false,error:'Database not ready'});
  }
});

app.use('/api/analysis', authMiddleware, analysisRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/telegram', telegramRoutes);

app.use(errorHandler);

let recovering = false;
async function recover() {
  if (recovering) return;
  recovering = true;
  try { await recoverExpiredRadarRuns(); } catch (e) { console.error('Radar recovery failed', e); } finally { recovering = false; }
}
const server=app.listen(PORT, () => {
  void recover();
  setInterval(() => void recover(), 60_000).unref();
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