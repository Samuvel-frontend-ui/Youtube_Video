import type { VercelRequest, VercelResponse } from '@vercel/node';
import serverless from 'serverless-http';
import { createApp } from '../server/app.ts';

const handler = serverless(createApp());

export default function vercelHandler(req: VercelRequest, res: VercelResponse): void | Promise<unknown> {
  return handler(req as never, res as never);
}
