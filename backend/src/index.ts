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
import { authMiddleware } from './middleware/auth.js';
import { getMiniAppOrigin } from './services/telegram-config.js';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS: comma-separated allowlist, e.g. "https://app.vercel.app,https://admin.vercel.app"
const allowedOrigins = (
  process.env.FRONTEND_URL ||
  'http://localhost:5173,http://localhost:5174,http://localhost:5175'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// The Telegram Mini App is served from TELEGRAM_MINI_APP_URL — trust its origin automatically
const miniAppOrigin = getMiniAppOrigin();
if (miniAppOrigin && !allowedOrigins.includes(miniAppOrigin)) {
  allowedOrigins.push(miniAppOrigin);
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
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());
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

app.use('/api/analysis', authMiddleware, analysisRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/telegram', telegramRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app };