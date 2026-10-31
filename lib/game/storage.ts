import { z } from 'zod';
import { cases } from './cases';
import { Game, restoreGame, score } from './rules';

export const STORAGE_KEY = 'rumor-room:v1';
const RecordSchema = z
  .object({ correct: z.boolean(), movesUsed: z.number().int().min(0).max(4) })
  .strict();
type ResultRecord = z.infer<typeof RecordSchema>;
export type Progress = { games: Record<string, Game>; records: Record<string, ResultRecord> };
export const emptyProgress = (): Progress => ({ games: {}, records: {} });
export const recordScore = (r?: ResultRecord) => (r?.correct ? 100 + 15 * (4 - r.movesUsed) : 0);

// Merge only the cases this tab changed into the latest persisted snapshot.
// Concurrent edits to the same run remain last-writer-wins; unrelated cases survive.
export function mergeProgress(before: Progress, next: Progress, latest: Progress): Progress {
  const result: Progress = { games: { ...latest.games }, records: { ...latest.records } };
  for (const [id, game] of Object.entries(next.games)) {
    if (game !== before.games[id]) result.games[id] = game;
  }
  for (const [id, record] of Object.entries(next.records)) {
    if (
      record !== before.records[id] &&
      (!result.records[id] || recordScore(record) >= recordScore(result.records[id]))
    )
      result.records[id] = record;
  }
  return result;
}

export function readProgress(
  storage: Pick<Storage, 'getItem'>,
  options: { preservePending?: boolean } = {},
): {
  progress: Progress;
  notice: string;
  unavailable?: boolean;
} {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return {
      progress: emptyProgress(),
      notice:
        'Progress could not be loaded. You can play normally; progress may not survive a refresh.',
      unavailable: true,
    };
  }
  try {
    if (!raw) return { progress: emptyProgress(), notice: '' };
    const envelope = z
      .object({
        version: z.literal(1),
        games: z.record(z.string(), z.unknown()),
        records: z.record(z.string(), z.unknown()),
      })
      .safeParse(JSON.parse(raw));
    if (!envelope.success)
      return {
        progress: emptyProgress(),
        notice: 'An older or damaged save was reset. All ten cases are ready to play.',
      };
    const progress = emptyProgress();
    let damaged = false;
    let interrupted = false;
    for (const c of cases) {
      if (envelope.data.games[c.id]) {
        const restored = restoreGame(envelope.data.games[c.id], c, options);
        if (restored) {
          progress.games[c.id] = restored.game;
          interrupted ||= restored.interrupted;
        } else damaged = true;
      }
      const r = RecordSchema.safeParse(envelope.data.records[c.id]);
      if (r.success) progress.records[c.id] = r.data;
    }
    return {
      progress,
      notice: interrupted
        ? 'Your live interview was interrupted. It was not resent. Prepared questions are still available.'
        : damaged
          ? 'One damaged case save was reset. Your other progress is safe.'
          : '',
    };
  } catch {
    return {
      progress: emptyProgress(),
      notice: 'An older or damaged save was reset. All ten cases are ready to play.',
    };
  }
}

export function updateProgress(progress: Progress, game: Game): Progress {
  const c = cases.find((c) => c.id === game.caseId)!;
  const next: Progress = {
    games: { ...progress.games, [game.caseId]: game },
    records: { ...progress.records },
  };
  if (
    game.accusation &&
    (!next.records[c.id] || score(game, c) >= recordScore(next.records[c.id]))
  ) {
    next.records[c.id] = {
      correct: game.accusation === c.verdict.falseClaimId,
      movesUsed: game.research.length,
    };
  }
  return next;
}
export function writeProgress(storage: Pick<Storage, 'setItem'>, progress: Progress): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...progress }));
    return true;
  } catch {
    return false;
  }
}
