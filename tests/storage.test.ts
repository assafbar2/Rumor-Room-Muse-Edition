import { describe, expect, it } from 'vitest';
import { cases } from '../lib/game/cases';
import { gameReducer, newGame } from '../lib/game/rules';
import {
  emptyProgress,
  mergeProgress,
  readProgress,
  recordScore,
  updateProgress,
  writeProgress,
} from '../lib/game/storage';
describe('local progress', () => {
  it('preserves other tabs’ pending markers during merges but interrupts them on recovery', () => {
    const requestId = crypto.randomUUID();
    const pending = gameReducer(newGame(cases[0]), { type: 'live-start', requestId }, cases[0]);
    let raw = JSON.stringify({ version: 1, ...updateProgress(emptyProgress(), pending) });
    const storage = { getItem: () => raw };
    const snapshot = readProgress(storage, { preservePending: true });
    expect(snapshot.notice).toBe('');
    expect(snapshot.progress.games[cases[0].id].pendingRequestId).toBe(requestId);
    const otherCase = updateProgress(emptyProgress(), newGame(cases[1]));
    const merged = mergeProgress(emptyProgress(), otherCase, snapshot.progress);
    raw = JSON.stringify({ version: 1, ...merged });
    expect(JSON.parse(raw).games[cases[0].id].pendingRequestId).toBe(requestId);
    const recovered = readProgress(storage);
    expect(recovered.notice).toContain('It was not resent');
    expect(recovered.progress.games[cases[0].id].pendingRequestId).toBeNull();
    expect(recovered.progress.games[cases[0].id].liveDispatchesUsed).toBe(1);
    expect(recovered.progress.games[cases[1].id]).toEqual(otherCase.games[cases[1].id]);
  });
  it('merges a stale tab’s changed case without erasing another tab’s save', () => {
    const before = emptyProgress();
    const tabA = updateProgress(before, newGame(cases[0]));
    const tabB = updateProgress(before, newGame(cases[1]));
    const merged = mergeProgress(before, tabB, tabA);
    expect(Object.keys(merged.games)).toEqual([cases[0].id, cases[1].id]);
    expect(merged.games[cases[0].id]).toEqual(tabA.games[cases[0].id]);
  });
  it('recovers corrupt JSON and unavailable storage without crashing', () => {
    expect(readProgress({ getItem: () => '{broken' }).notice).toBeTruthy();
    expect(
      readProgress({
        getItem: () => {
          throw new Error('denied');
        },
      }).progress,
    ).toEqual(emptyProgress());
    expect(
      writeProgress(
        {
          setItem: () => {
            throw new Error('quota');
          },
        },
        emptyProgress(),
      ),
    ).toBe(false);
  });
  it('keeps each case independent and retains a best score through replay', () => {
    const c = cases[0];
    const won = gameReducer(newGame(c), { type: 'accuse', claimId: 'c1' }, c);
    let progress = updateProgress(emptyProgress(), won);
    progress = updateProgress(progress, newGame(c));
    progress = updateProgress(progress, newGame(cases[1]));
    expect(recordScore(progress.records[c.id])).toBe(160);
    expect(Object.keys(progress.games)).toHaveLength(2);
    expect(progress.games[c.id].accusation).toBeNull();
    const lost = gameReducer(progress.games[c.id], { type: 'accuse', claimId: 'c2' }, c);
    expect(recordScore(updateProgress(progress, lost).records[c.id])).toBe(160);
  });
  it('round-trips valid progress and isolates a damaged case', () => {
    let p = updateProgress(emptyProgress(), newGame(cases[0]));
    p = updateProgress(p, newGame(cases[1]));
    let serialized = '';
    writeProgress(
      {
        setItem: (_key, value) => {
          serialized = value;
        },
      },
      p,
    );
    expect(readProgress({ getItem: () => serialized }).progress).toEqual(p);
    const damaged = JSON.parse(serialized);
    damaged.games[cases[0].id].order = [];
    const loaded = readProgress({ getItem: () => JSON.stringify(damaged) });
    expect(loaded.progress.games[cases[0].id]).toBeUndefined();
    expect(loaded.progress.games[cases[1].id]).toEqual(p.games[cases[1].id]);
    expect(loaded.notice).toContain('damaged');
  });
});
