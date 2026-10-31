import { afterEach, describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import type { NextApiRequest, NextApiResponse } from 'next';
import witness from '../pages/api/ai/witness';
afterEach(() => vi.unstubAllEnvs());
function response() {
  const res = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn(), send: vi.fn() };
  res.setHeader.mockReturnValue(res);
  res.status.mockReturnValue(res);
  return res;
}
describe('Node API adapter', () => {
  it.each(['GET', 'DELETE', 'TRACE', 'TRACK', 'CONNECT'])(
    'returns a sanitized 405 for %s before constructing a Web Request',
    async (method) => {
      const res = response();
      await witness({ method, headers: {} } as NextApiRequest, res as unknown as NextApiResponse);
      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({
        error: { code: 'METHOD_NOT_ALLOWED', message: 'Use a POST request.' },
      });
      expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
    },
  );
  it('passes a real Node stream through validation with AI disabled', async () => {
    vi.stubEnv('APP_ORIGIN', 'https://game.example');
    vi.stubEnv('AI_ENABLED', 'false');
    const input = {
      caseId: 't1-leaked-launch',
      gameId: crypto.randomUUID(),
      requestId: crypto.randomUUID(),
      question: 'Where did it come from?',
    };
    const req = Readable.from([Buffer.from(JSON.stringify(input))]);
    Object.assign(req, {
      method: 'POST',
      headers: { origin: 'https://game.example', 'content-type': 'application/json' },
    });
    const res = response();
    await witness(req as NextApiRequest, res as unknown as NextApiResponse);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(JSON.parse(res.send.mock.calls[0][0])).toMatchObject({
      error: { code: 'AI_UNAVAILABLE' },
    });
  });
});
