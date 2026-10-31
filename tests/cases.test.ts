import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { cases } from '../lib/game/cases';
import { contentErrors, moves } from '../lib/game/schema';
import { gameReducer, newGame, score, revealedIds } from '../lib/game/rules';

describe('authored library', () => {
  it('contains ten coherent, finite cases', () => {
    expect(contentErrors(cases)).toEqual([]);
    expect(cases.map((c) => c.verdict.falseClaimId)).toEqual(
      expect.arrayContaining(['c1', 'c2', 'c3', 'c4']),
    );
  });
  for (const c of cases) {
    it(`${c.title} has a 130-point evidence route and explains every wrong choice`, () => {
      let s = newGame(c);
      for (const move of ['second', 'primary'] as const)
        s = gameReducer(s, { type: 'research', claimId: c.verdict.falseClaimId, move }, c);
      s = gameReducer(s, { type: 'image' }, c);
      s = gameReducer(s, { type: 'interview', statementId: 'w2' }, c);
      s = gameReducer(s, { type: 'accuse', claimId: c.verdict.falseClaimId }, c);
      expect(score(s, c)).toBe(130);
      for (const claim of c.claims.filter((x) => x.id !== c.verdict.falseClaimId)) {
        const wrong = gameReducer(newGame(c), { type: 'accuse', claimId: claim.id }, c);
        expect(score(wrong, c)).toBe(0);
        expect(revealedIds(wrong, c)).toEqual(
          expect.arrayContaining([...claim.supportEvidenceIds, ...c.verdict.decisiveEvidenceIds]),
        );
      }
    });
    for (const claim of c.claims)
      for (const move of moves)
        it(`${c.id}/${claim.id}/${move.id} spends exactly one turn`, () => {
          const original = newGame(c);
          const result = gameReducer(
            original,
            { type: 'research', claimId: claim.id, move: move.id },
            c,
          );
          expect(result.research).toHaveLength(1);
          expect(
            gameReducer(result, { type: 'research', claimId: claim.id, move: move.id }, c),
          ).toBe(result);
          expect(original.research).toHaveLength(0);
        });
    it(`${c.title} ships its original illustration and two prepared images`, () => {
      expect(readFileSync(`public/art/${c.art}.svg`, 'utf8')).toContain('<svg');
      for (const suffix of ['', '-card']) {
        const image = readFileSync(`public/cases/${c.id}-s1${suffix}.png`);
        expect(image.subarray(1, 4).toString()).toBe('PNG');
        expect(image.length).toBeLessThan(1_000_000);
      }
    });
  }
});
