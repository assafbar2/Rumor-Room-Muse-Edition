import { z } from 'zod';

export const ClaimIdSchema = z.enum(['c1', 'c2', 'c3', 'c4']);
export const MoveSchema = z.enum(['trace', 'second', 'primary', 'fresh']);
export type ClaimId = z.infer<typeof ClaimIdSchema>;
export type Move = z.infer<typeof MoveSchema>;
export const moves: { id: Move; label: string; short: string; description: string }[] = [
  {
    id: 'trace',
    label: 'Trace the leak',
    short: 'Trace',
    description: 'Find where this story started.',
  },
  {
    id: 'second',
    label: 'Second source',
    short: 'Corroborate',
    description: 'Independent witnesses, or an echo?',
  },
  {
    id: 'primary',
    label: 'Official channel',
    short: 'Go direct',
    description: 'Read the first-party record.',
  },
  {
    id: 'fresh',
    label: 'Fresh cut',
    short: 'Update',
    description: 'Find the latest word in the file.',
  },
];

const OutcomeSchema = z.object({ sourceIds: z.array(z.string()), note: z.string().min(1) });
export const CaseSchema = z.object({
  id: z.string().regex(/^t\d+-[a-z0-9]+(?:-[a-z0-9]+)*$/),
  number: z.number().int().min(1).max(10),
  title: z.string(),
  category: z.string(),
  art: z.enum([
    'signal',
    'velvet',
    'kiss',
    'wine',
    'silk',
    'auction',
    'hotel',
    'vinyl',
    'yacht',
    'diamond',
  ]),
  difficulty: z.number().int().min(1).max(3),
  minutes: z.string(),
  teaser: z.string(),
  briefing: z.string(),
  setting: z.string(),
  asOf: z.iso.datetime(),
  windowStart: z.iso.datetime(),
  claims: z
    .array(
      z.object({ id: ClaimIdSchema, text: z.string(), supportEvidenceIds: z.array(z.string()) }),
    )
    .length(4),
  sources: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        publisher: z.string(),
        publishedAt: z.iso.datetime(),
        group: z.string(),
        claimId: ClaimIdSchema,
        relation: z.enum(['context', 'supports', 'contradicts']),
        body: z.string().min(20),
      }),
    )
    .length(10),
  research: z.record(ClaimIdSchema, z.record(MoveSchema, OutcomeSchema)),
  witness: z.object({
    name: z.string(),
    role: z.string(),
    persona: z.string(),
    statements: z
      .array(z.object({ id: z.string(), question: z.string(), text: z.string() }))
      .length(5),
  }),
  artifact: z.object({
    id: z.literal('s1'),
    title: z.string(),
    eyebrow: z.string(),
    headline: z.string(),
    subline: z.string(),
    detail: z.string(),
    footer: z.string(),
    transcript: z.string(),
    initialNote: z.string(),
    comparisonNote: z.string(),
    comparisonEvidenceId: z.string(),
  }),
  verdict: z.object({
    falseClaimId: ClaimIdSchema,
    reasonType: z.string(),
    decisiveEvidenceIds: z.array(z.string()).min(2),
    explanation: z.string(),
    lesson: z.string(),
  }),
});
export type CaseFile = z.infer<typeof CaseSchema>;
export type Source = CaseFile['sources'][number];

export const ReplySchema = z
  .object({
    text: z
      .string()
      .min(1)
      .refine((s) => [...s].length <= 600 && s.trim().split(/\s+/u).length <= 70, 'Reply too long')
      .refine(
        (s) =>
          !/(?:[a-z][a-z0-9+.-]*:\/\/|(?:mailto|data|javascript):|www\.|<[^>]*>|\]\(|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\b|\/))/iu.test(
            s,
          ),
        'Links and markup are not allowed',
      ),
    statementIds: z
      .array(z.string())
      .max(3)
      .refine((ids) => new Set(ids).size === ids.length),
  })
  .strict();
export type WitnessReply = z.infer<typeof ReplySchema>;

export function contentErrors(pack: CaseFile[]): string[] {
  const errors: string[] = [];
  const check = (ok: boolean, message: string) => {
    if (!ok) errors.push(message);
  };
  check(pack.length === 10, 'Expected ten cases');
  check(new Set(pack.map((c) => c.id)).size === pack.length, 'Duplicate case IDs');
  check(new Set(pack.map((c) => c.number)).size === pack.length, 'Duplicate case numbers');
  for (const c of pack) {
    const ids = new Set(c.sources.map((s) => s.id));
    check(ids.size === 10, `${c.id}: duplicate source ID`);
    check(new Set(c.claims.map((x) => x.id)).size === 4, `${c.id}: duplicate claim ID`);
    check(
      new Set(c.witness.statements.map((x) => x.id)).size === 5,
      `${c.id}: duplicate testimony ID`,
    );
    check(
      new Set(c.sources.filter((s) => s.relation === 'contradicts').map((s) => s.claimId)).size ===
        1,
      `${c.id}: exactly one contradicted claim required`,
    );
    for (const s of c.sources) {
      check(
        s.publishedAt >= c.windowStart && s.publishedAt <= c.asOf,
        `${c.id}/${s.id}: source outside window`,
      );
      check(
        s.relation !== 'contradicts' || s.claimId === c.verdict.falseClaimId,
        `${c.id}: wrong contradiction`,
      );
    }
    for (const claim of c.claims) {
      if (claim.id !== c.verdict.falseClaimId)
        check(claim.supportEvidenceIds.length >= 2, `${c.id}/${claim.id}: missing support`);
      for (const id of claim.supportEvidenceIds)
        check(
          c.sources.some((s) => s.id === id && s.claimId === claim.id && s.relation === 'supports'),
          `${c.id}/${id}: invalid support`,
        );
      for (const move of moves)
        for (const id of c.research[claim.id][move.id].sourceIds) {
          check(ids.has(id), `${c.id}: research points at missing ${id}`);
          check(
            c.sources.find((s) => s.id === id)?.claimId === claim.id,
            `${c.id}: research crosses claim boundaries`,
          );
        }
    }
    for (const id of [...c.verdict.decisiveEvidenceIds, c.artifact.comparisonEvidenceId])
      check(ids.has(id), `${c.id}: missing decisive source ${id}`);
    check(
      c.verdict.decisiveEvidenceIds.some(
        (id) => c.sources.find((s) => s.id === id)?.relation === 'contradicts',
      ),
      `${c.id}: no decisive contradiction`,
    );
  }
  return errors;
}
