import type { VercelRequest, VercelResponse } from '@vercel/node';
import serverless from 'serverless-http';
import { createApp } from '../server/app.js';

const handler = serverless(createApp());

export default function vercelHandler(req: VercelRequest, res: VercelResponse): void | Promise<unknown> {
  const requestUrl = req.url || '/';
  const parsedUrl = new URL(requestUrl, 'http://localhost');
  const fromQueryObject = req.query?.__path;
  const routedPath = typeof fromQueryObject === 'string' ? fromQueryObject : parsedUrl.searchParams.get('__path');
  if (typeof routedPath === 'string' && routedPath.length > 0) {
    const params = new URLSearchParams(parsedUrl.searchParams);
    params.delete('__path');
    const nextQuery = params.toString();
    req.url = `/api/${routedPath}${nextQuery ? `?${nextQuery}` : ''}`;
  }
  return handler(req as never, res as never);
}
