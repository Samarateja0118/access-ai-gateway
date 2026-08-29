import express from 'express';
import type { Express } from 'express';
import { healthRouter } from './routes/health.js';
import { chatRouter } from './routes/chat.js';
import { doorsRouter } from './routes/doors.js';

export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: '64kb' }));
  app.use(healthRouter);
  app.use('/api', chatRouter);
  app.use('/api', doorsRouter);
  return app;
}
