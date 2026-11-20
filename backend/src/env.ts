import dotenv from 'dotenv';
dotenv.config();

export interface AppEnv {
  PORT: number;
  LLM_PROVIDER: string;
  LLM_API_KEY?: string;
  GEMINI_API_KEY?: string;
  FRONTEND_URL: string;
}

export const env: AppEnv = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  LLM_PROVIDER: process.env.LLM_PROVIDER || 'gemini',
  LLM_API_KEY: process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || '',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};
