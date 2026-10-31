import { z } from 'zod';
import {
  CaseFile,
  ClaimId,
  ClaimIdSchema,
  Move,
  MoveSchema,
  ReplySchema,
  WitnessReply,
} from './schema';

export const GameSchema = z
  .object({
    version: z.literal(1),
    caseId: z.string(),
    gameId: z.uuid(),
    order: z.array(ClaimIdSchema).length(4),
    research: z.array(z.object({ claimId: ClaimIdSchema, move: MoveSchema })).max(4),
    interviewIds: z.array(z.string()).max(2),
    imagePinned: z.boolean(),
    liveDispatchesUsed: z.number().int().min(0).max(2),
    liveReplies: z.array(ReplySchema.extend({ requestId: z.uuid(), model: z.string() })).max(2),
    pendingRequestId: z.uuid().nullable(),
    accusation: ClaimIdSchema.nullable(),
  })
  .strict();
export type Game = z.infer<typeof GameSchema>;
export type GameAction =
  | { type: 'research'; claimId: ClaimId; move: Move }
  | { type: 'interview'; statementId: string }
  | { type: 'image' }
  | { type: 'accuse'; claimId: ClaimId }
  | { type: 'live-start'; requestId: string }
  | { type: 'live-success'; requestId: string; reply: WitnessReply & { model: string } }
  | { type: 'live-failure'; requestId: string };

export function newGame(c: CaseFile): Game {
  const order = c.claims.map((x) => x.id);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    version: 1,
    caseId: c.id,
    gameId: crypto.randomUUID(),
    order,
    research: [],
    interviewIds: [],
    imagePinned: false,
    liveDispatchesUsed: 0,
    liveReplies: [],
    pendingRequestId: null,
    accusation: null,
  };
}
export const researchLeft = (s: Game) => 4 - s.research.length;
export const interviewsLeft = (s: Game) => 2 - s.interviewIds.length - s.liveReplies.length;
export const score = (s: Game, c: CaseFile) =>
  s.accusation === c.verdict.falseClaimId ? 100 + 15 * researchLeft(s) : 0;
export const discoveredIds = (s: Game, c: CaseFile) => [
  ...new Set(s.research.flatMap((r) => c.research[r.claimId][r.move].sourceIds)),
];
export const hasResearched = (s: Game, claim: ClaimId, move: Move) =>
  s.research.some((r) => r.claimId === claim && r.move === move);
export function revealedIds(s: Game, c: CaseFile): string[] {
  if (!s.accusation) return [];
  return [
    ...new Set([
      ...c.verdict.decisiveEvidenceIds,
      ...(c.claims.find((x) => x.id === s.accusation)?.supportEvidenceIds || []),
    ]),
  ].filter((id) => !discoveredIds(s, c).includes(id));
}
export function gameReducer(s: Game, action: GameAction, c: CaseFile): Game {
  if (s.caseId !== c.id || s.accusation) return s;
  if (action.type === 'live-success' || action.type === 'live-failure') {
    if (s.pendingRequestId !== action.requestId) return s;
    if (action.type === 'live-failure') return { ...s, pendingRequestId: null };
    // The model field is metadata, not part of the reply schema.
    const body = ReplySchema.safeParse({
      text: action.reply.text,
      statementIds: action.reply.statementIds,
    });
    if (
      !body.success ||
      !body.data.statementIds.every((id) => c.witness.statements.some((w) => w.id === id)) ||
      (body.data.statementIds.length === 0 && body.data.text !== "That isn't in my notes.")
    )
      return { ...s, pendingRequestId: null };
    return {
      ...s,
      pendingRequestId: null,
      liveReplies: [
        ...s.liveReplies,
        { ...body.data, requestId: action.requestId, model: action.reply.model },
      ],
    };
  }
  if (s.pendingRequestId) return s;
  switch (action.type) {
    case 'research':
      if (
        researchLeft(s) < 1 ||
        hasResearched(s, action.claimId, action.move) ||
        !c.research[action.claimId]?.[action.move]
      )
        return s;
      return { ...s, research: [...s.research, { claimId: action.claimId, move: action.move }] };
    case 'interview':
      if (
        interviewsLeft(s) < 1 ||
        s.interviewIds.includes(action.statementId) ||
        !c.witness.statements.some((w) => w.id === action.statementId)
      )
        return s;
      return { ...s, interviewIds: [...s.interviewIds, action.statementId] };
    case 'image':
      return s.imagePinned ? s : { ...s, imagePinned: true };
    case 'accuse':
      return c.claims.some((x) => x.id === action.claimId)
        ? { ...s, accusation: action.claimId }
        : s;
    case 'live-start':
      if (
        interviewsLeft(s) < 1 ||
        s.liveDispatchesUsed >= 2 ||
        !z.uuid().safeParse(action.requestId).success
      )
        return s;
      return {
        ...s,
        liveDispatchesUsed: s.liveDispatchesUsed + 1,
        pendingRequestId: action.requestId,
      };
  }
}

export function restoreGame(
  value: unknown,
  c: CaseFile,
  options: { preservePending?: boolean } = {},
): { game: Game; interrupted: boolean } | null {
  const parsed = GameSchema.safeParse(value);
  if (!parsed.success) return null;
  const s = parsed.data;
  if (
    s.caseId !== c.id ||
    new Set(s.order).size !== 4 ||
    new Set(s.research.map((r) => `${r.claimId}:${r.move}`)).size !== s.research.length ||
    new Set(s.interviewIds).size !== s.interviewIds.length ||
    s.interviewIds.some((id) => !c.witness.statements.some((w) => w.id === id)) ||
    interviewsLeft(s) < 0 ||
    s.liveReplies.length > s.liveDispatchesUsed ||
    new Set(s.liveReplies.map((r) => r.requestId)).size !== s.liveReplies.length
  )
    return null;
  for (const reply of s.liveReplies)
    if (
      reply.statementIds.some((id) => !c.witness.statements.some((w) => w.id === id)) ||
      (!reply.statementIds.length && reply.text !== "That isn't in my notes.")
    )
      return null;
  if (
    s.pendingRequestId &&
    (s.accusation ||
      s.liveDispatchesUsed <= s.liveReplies.length ||
      s.liveReplies.some((r) => r.requestId === s.pendingRequestId) ||
      interviewsLeft(s) < 1)
  )
    return null;
  return {
    game: options.preservePending ? s : { ...s, pendingRequestId: null },
    interrupted: !options.preservePending && !!s.pendingRequestId,
  };
}
