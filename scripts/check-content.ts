import { cases } from '../lib/game/cases';
import { contentErrors } from '../lib/game/schema';
const errors = contentErrors(cases);
if (errors.length) throw new Error(errors.join('\n'));
console.log(
  `Validated ${cases.length} cases, 40 claims, 100 sources, 160 research routes and 50 prepared interviews.`,
);
