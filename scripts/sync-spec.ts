import { readFileSync, writeFileSync } from 'node:fs';
import { cases } from '../lib/game/cases';
import { moves } from '../lib/game/schema';
const text = cases
  .map((c) => {
    const lines = [
      `### ${String(c.number).padStart(2, '0')}. ${c.title}`,
      '',
      `**ID:** \`${c.id}\` · **Genre:** ${c.category} · **Difficulty:** ${c.difficulty}/3`,
      '',
      c.teaser,
      '',
      c.briefing,
      '',
      `Case window: ${c.windowStart} to ${c.asOf}.`,
      '',
      '**Claims**',
      '',
    ];
    for (const claim of c.claims)
      lines.push(
        `- **${claim.id}:** ${claim.text} ${claim.id === c.verdict.falseClaimId ? '(False target.)' : `(Supported by ${claim.supportEvidenceIds.join(', ')}.)`}`,
      );
    lines.push('', '**Source documents**', '');
    for (const s of c.sources)
      lines.push(
        `- **${s.id} — ${s.title}.** ${s.publisher}; ${s.publishedAt}; origin group \`${s.group}\`; ${s.relation} ${s.claimId}. ${s.body}`,
      );
    lines.push(
      '',
      '**Research outcomes**',
      '',
      '| Claim / move | Sources | Note |',
      '|---|---|---|',
    );
    for (const claim of c.claims)
      for (const move of moves) {
        const o = c.research[claim.id][move.id];
        lines.push(
          `| ${claim.id} / ${move.id} | ${o.sourceIds.join(', ') || 'none'} | ${o.note.replaceAll('|', '\\|')} |`,
        );
      }
    lines.push('', `**Witness: ${c.witness.name} — ${c.witness.role}.** ${c.witness.persona}`, '');
    for (const w of c.witness.statements) lines.push(`- **${w.id} — ${w.question}** ${w.text}`);
    lines.push(
      '',
      `**Prepared artifact: ${c.artifact.title}**`,
      '',
      '```text',
      c.artifact.transcript,
      '```',
      '',
      `Before ${c.artifact.comparisonEvidenceId} is discovered: ${c.artifact.initialNote}`,
      '',
      `After ${c.artifact.comparisonEvidenceId}: ${c.artifact.comparisonNote}`,
      '',
      `**Verdict:** ${c.verdict.falseClaimId}; decisive sources ${c.verdict.decisiveEvidenceIds.join(', ')}. ${c.verdict.explanation}`,
      '',
      `**Lesson:** ${c.verdict.lesson}`,
      '',
    );
    return lines.join('\n');
  })
  .join('\n');
const spec = readFileSync('SPEC.md', 'utf8');
const updated = spec.replace(
  /<!-- CASE_LIBRARY_START -->[\s\S]*?<!-- CASE_LIBRARY_END -->/,
  `<!-- CASE_LIBRARY_START -->\n\n${text}\n<!-- CASE_LIBRARY_END -->`,
);
if (process.argv.includes('--check')) {
  if (updated !== spec)
    throw new Error('SPEC.md case appendix is stale. Run npm run content:sync.');
} else writeFileSync('SPEC.md', updated);
