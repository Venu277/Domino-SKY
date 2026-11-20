import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { env } from './env.js';
import { adviseRouter } from './routes/advise.js';

const app = express();

app.use(
  cors({
    origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);

app.use(express.json());

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'domino-sky-backend',
    provider: env.LLM_PROVIDER,
    hasApiKey: Boolean(env.LLM_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Advisor Routes
app.use('/api/advise', adviseRouter);

export const server = app.listen(env.PORT, () => {
  console.log(`[Domino Sky Backend] Server running on port ${env.PORT}`);
  console.log(`[Domino Sky Backend] LLM Provider: ${env.LLM_PROVIDER} (API Key: ${env.LLM_API_KEY ? 'Configured' : 'None (Using Template Fallback)'})`);
});

export default app;
