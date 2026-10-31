import { describe, expect, it } from 'vitest';
import { cases } from '../lib/game/cases';
import {
  discoveredIds,
  gameReducer,
  interviewsLeft,
  newGame,
  researchLeft,
  restoreGame,
  score,
} from '../lib/game/rules';
const c = cases[0];
describe('game boundaries', () => {
  it('charges an empty lookup and keeps image/interview/verdict available at zero turns', () => {
    let s = newGame(c);
    s = gameReducer(s, { type: 'research', claimId: 'c4', move: 'fresh' }, c);
    expect(discoveredIds(s, c)).toEqual([]);
    for (const move of ['trace', 'second', 'primary'] as const)
      s = gameReducer(s, { type: 'research', claimId: 'c2', move }, c);
    expect(researchLeft(s)).toBe(0);
    expect(gameReducer(s, { type: 'research', claimId: 'c1', move: 'primary' }, c)).toBe(s);
    s = gameReducer(s, { type: 'image' }, c);
    s = gameReducer(s, { type: 'interview', statementId: 'w2' }, c);
    s = gameReducer(s, { type: 'accuse', claimId: 'c1' }, c);
    expect(s.imagePinned).toBe(true);
    expect(s.interviewIds).toEqual(['w2']);
    expect(score(s, c)).toBe(100);
  });
  it('deduplicates documents while retaining the distinct moves', () => {
    let s = newGame(c);
    for (const move of ['trace', 'primary', 'second'] as const)
      s = gameReducer(s, { type: 'research', claimId: 'c2', move }, c);
    expect(s.research).toHaveLength(3);
    expect(discoveredIds(s, c)).toEqual(['e5', 'e6']);
  });
  it('does not pre-reveal the primary record or answer', () => {
    const s = newGame(c);
    expect(discoveredIds(s, c)).toEqual([]);
    expect(s.accusation).toBeNull();
    expect(c.artifact.initialNote).not.toContain('DATE TBC');
  });
  it('allows two distinct prepared questions and stops duplicate/extra questions', () => {
    let s = gameReducer(newGame(c), { type: 'interview', statementId: 'w1' }, c);
    expect(gameReducer(s, { type: 'interview', statementId: 'w1' }, c)).toBe(s);
    s = gameReducer(s, { type: 'interview', statementId: 'w2' }, c);
    expect(interviewsLeft(s)).toBe(0);
    expect(gameReducer(s, { type: 'interview', statementId: 'w3' }, c)).toBe(s);
  });
  it('scores an honest zero-research guess and locks completed games', () => {
    const s = gameReducer(newGame(c), { type: 'accuse', claimId: 'c1' }, c);
    expect(score(s, c)).toBe(160);
    expect(s.research).toHaveLength(0);
    for (const a of [
      { type: 'image' },
      { type: 'interview', statementId: 'w1' },
      { type: 'research', claimId: 'c1', move: 'trace' },
      { type: 'accuse', claimId: 'c2' },
    ] as const)
      expect(gameReducer(s, a, c)).toBe(s);
  });
  it('bounds live attempts independently from successful interview turns', () => {
    let s = newGame(c);
    const id = crypto.randomUUID();
    s = gameReducer(s, { type: 'live-start', requestId: id }, c);
    expect(s.liveDispatchesUsed).toBe(1);
    expect(gameReducer(s, { type: 'live-start', requestId: crypto.randomUUID() }, c)).toBe(s);
    expect(gameReducer(s, { type: 'accuse', claimId: 'c1' }, c)).toBe(s);
    expect(gameReducer(s, { type: 'live-failure', requestId: crypto.randomUUID() }, c)).toBe(s);
    s = gameReducer(s, { type: 'live-failure', requestId: id }, c);
    expect(interviewsLeft(s)).toBe(2);
    const next = crypto.randomUUID();
    s = gameReducer(s, { type: 'live-start', requestId: next }, c);
    s = gameReducer(s, { type: 'live-failure', requestId: next }, c);
    expect(gameReducer(s, { type: 'live-start', requestId: crypto.randomUUID() }, c)).toBe(s);
    expect(interviewsLeft(s)).toBe(2);
  });
  it('restores pending dispatch as interrupted without refunding it or resending', () => {
    let s = newGame(c);
    s = gameReducer(s, { type: 'live-start', requestId: crypto.randomUUID() }, c);
    const result = restoreGame(s, c)!;
    expect(result.interrupted).toBe(true);
    expect(result.game.pendingRequestId).toBeNull();
    expect(result.game.liveDispatchesUsed).toBe(1);
  });
  it('validates a live reply before consuming an interview', () => {
    const id = crypto.randomUUID();
    const s = gameReducer(newGame(c), { type: 'live-start', requestId: id }, c);
    const good = gameReducer(
      s,
      {
        type: 'live-success',
        requestId: id,
        reply: {
          text: c.witness.statements[0].text,
          statementIds: ['w1'],
          model: 'openai/gpt-6-astra',
        },
      },
      c,
    );
    expect(interviewsLeft(good)).toBe(1);
    expect(good.pendingRequestId).toBeNull();
    const bad = gameReducer(
      s,
      {
        type: 'live-success',
        requestId: id,
        reply: { text: 'Invented testimony.', statementIds: ['w99'], model: 'openai/gpt-6-astra' },
      },
      c,
    );
    expect(interviewsLeft(bad)).toBe(2);
    expect(bad.pendingRequestId).toBeNull();
  });
  it('rejects malformed saves instead of trusting counters or duplicated actions', () => {
    const s = newGame(c);
    expect(restoreGame({ ...s, order: ['c1', 'c1', 'c3', 'c4'] }, c)).toBeNull();
    expect(restoreGame({ ...s, caseId: cases[1].id }, c)).toBeNull();
    expect(restoreGame({ ...s, score: 99999 }, c)).toBeNull();
    expect(
      restoreGame(
        {
          ...s,
          research: [
            { claimId: 'c1', move: 'trace' },
            { claimId: 'c1', move: 'trace' },
          ],
        },
        c,
      ),
    ).toBeNull();
    expect(restoreGame({ ...s, interviewIds: ['w1', 'w1'] }, c)).toBeNull();
    expect(restoreGame({ ...s, pendingRequestId: crypto.randomUUID() }, c)).toBeNull();
  });
});
