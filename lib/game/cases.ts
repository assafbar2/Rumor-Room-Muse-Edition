import raw from '@/content/cases.json' with { type: 'json' };
import { CaseSchema } from './schema';

export const cases = raw.map((c) => CaseSchema.parse(c));
export const caseById = (id: string) => cases.find((c) => c.id === id);
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH || ''}${path}`;
