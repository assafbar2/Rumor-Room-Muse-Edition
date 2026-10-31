import type { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'node:stream';
import { handleWitness } from '@/lib/server/witness';

export const config = { api: { bodyParser: false }, maxDuration: 30 };
export default async function witness(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use a POST request.' } });
    return;
  }
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers))
    if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  const init: RequestInit & { duplex: 'half' } = {
    method: 'POST',
    headers,
    body: Readable.toWeb(req) as ReadableStream<Uint8Array>,
    duplex: 'half',
  };
  const response = await handleWitness(new Request('http://localhost/api/ai/witness', init), {
    AI_ENABLED: process.env.AI_ENABLED,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    APP_ORIGIN: process.env.APP_ORIGIN,
  });
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.status(response.status).send(await response.text());
}
