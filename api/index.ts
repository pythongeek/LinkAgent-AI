import { createServer } from 'http';
import app from '../backend/src/server';

// Vercel serverless function handler
export default function handler(req: any, res: any) {
  app(req, res);
}
