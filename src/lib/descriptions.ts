/**
 * Plain-language descriptions of what each job actually involves.
 *
 * Written for high school students: short sentences, no jargon, active
 * voice. The file is hand-written (src/data/descriptions.json) so a teacher
 * can edit or add to it.
 */
import descriptions from '../data/descriptions.json';
import { CATEGORY_MAP } from '../data/states';

export interface JobDescription {
  /** One line: what the job is. */
  what: string;
  /** What a working day looks like. */
  day: string;
  /** What school subjects help. */
  school: string;
}

const TABLE = descriptions as Record<string, JobDescription>;

/**
 * Look up a description, falling back to the category-level description so
 * every job page still says something useful.
 */
export function describe(soc: string, category: string): JobDescription {
  const found = TABLE[soc];
  if (found) return found;

  const fallback = CATEGORY_MAP[category];
  return {
    what:
      fallback?.blurb ??
      'A job that uses science, technology, engineering or maths.',
    day: 'It varies a lot from job to job, but most STEM work involves solving a problem, testing an idea and explaining the result.',
    school: 'Maths and science, plus a two-year degree, certificate or apprenticeship for most paths.',
  };
}
