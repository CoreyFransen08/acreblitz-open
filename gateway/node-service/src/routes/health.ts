import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'node-service',
    timestamp: new Date().toISOString(),
  });
});
