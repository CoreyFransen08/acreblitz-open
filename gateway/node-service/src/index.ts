import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';
import { weatherRouter } from './routes/weather.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/health', healthRouter);
app.use('/weather', weatherRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
  });
});

// Error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('[Error]', err.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
    });
  }
);

app.listen(PORT, () => {
  console.log(`[Node Service] Running on port ${PORT}`);
});
