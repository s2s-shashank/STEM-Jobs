/**
 * Career Finder: the matching rules.
 *
 * This file is pure logic - no DOM, no Astro, no network - so it can be
 * tested on its own and reused by anything that needs to turn answers into
 * job suggestions.
 */
import { TAG_PHRASES } from '../data/finder-questions';

export { TAG_PHRASES };

export interface FinderPayload {
  /** The questions, with their fun facts already filled with real numbers. */
  questions: ClientQuestion[];
  occupations: {
    soc: string;
    title: string;
    category: string;
    blurb: string;
    education: string;
    tags: string[];
    states: Record<string, [number, number, number]>;
  }[];
  generated: string;
}

export interface FinderAnswers {
  [questionId: string]: string[];
}

export interface ClientOption {
  id: string;
  emoji: string;
  label: string;
  tags: string[];
  fun?: { soc: string; text: string };
}

export interface ClientQuestion {
  id: string;
  title: string;
  kicker?: string;
  multi?: boolean;
  options: ClientOption[];
}

export interface Match {
  soc: string;
  title: string;
  category: string;
  blurb: string;
  education: string;
  employment: number;
  medianWage: number;
  growth: number;
  score: number;
  /** Why it matched, in plain words. */
  reasons: string[];
}

/** The question set, kept here so scoring can run without the DOM. */
let questionCache: ClientQuestion[] = [];

export function setQuestions(questions: ClientQuestion[]): void {
  questionCache = questions;
}

function findOption(
  questionId: string,
  optionId: string,
): ClientOption | undefined {
  const q = questionCache.find((x) => x.id === questionId);
  return q?.options.find((o) => o.id === optionId);
}

/**
 * Where the numbers for a given state come from.
 *
 * "other" averages the three states, so a student who lives outside them
 * still gets a sensible salary and growth figure. A state that reports no
 * pay for a job (rare, but it happens) is skipped rather than averaged in
 * as zero - and if the state the student chose has no pay for the job at
 * all, we fall back to the other states so the card is never blank.
 */
function stateStats(
  occ: FinderPayload['occupations'][number],
  state: string,
): { employment: number; medianWage: number; growth: number } {
  const all = Object.entries(occ.states);
  const preferred =
    state === 'other'
      ? all
      : all.filter(([code]) => code === state);

  // The chosen state, or every state if that one has nothing for this job.
  const rows =
    preferred.length && preferred.some(([, r]) => r[1] > 0)
      ? preferred
      : all;

  if (rows.length === 0) {
    return { employment: 0, medianWage: 0, growth: 0 };
  }

  const paid = rows.filter(([, r]) => r[1] > 0);
  const use = paid.length ? paid : rows;

  const employment = rows.reduce((s, [, r]) => s + r[0], 0);
  const medianWage = Math.round(
    use.reduce((s, [, r]) => s + r[1], 0) / use.length,
  );
  const growth = rows.reduce((s, [, r]) => s + r[2], 0) / rows.length;

  return { employment, medianWage, growth };
}

/**
 * Score every occupation against the student's answers.
 *
 * Each answer contributes interest tags. An occupation scores a point for
 * every tag it shares with the student. Results are then spread across
 * categories so a student who only picked "helping people" still sees a
 * couple of engineering jobs next to the health ones - but the list stays
 * ordered by how good the match is.
 */
export function scoreMatches(
  payload: FinderPayload,
  answers: FinderAnswers,
  state: string,
  limit = 12,
): Match[] {
  const tagCounts: Record<string, number> = {};
  for (const [questionId, optionIds] of Object.entries(answers)) {
    if (questionId === 'state') continue;
    for (const optionId of optionIds) {
      const option = findOption(questionId, optionId);
      if (!option) continue;
      for (const tag of option.tags) {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      }
    }
  }

  const scored = payload.occupations.map((occ) => {
    const stats = stateStats(occ, state);
    let score = 0;
    const reasons: string[] = [];
    for (const tag of occ.tags) {
      const count = tagCounts[tag] ?? 0;
      if (count > 0) {
        score += count;
        reasons.push(TAG_PHRASES[tag] ?? tag);
      }
    }
    return {
      soc: occ.soc,
      title: occ.title,
      category: occ.category,
      blurb: occ.blurb,
      education: occ.education,
      employment: stats.employment,
      medianWage: stats.medianWage,
      growth: stats.growth,
      score,
      reasons,
    };
  });

  const hit = scored.filter((m) => m.score > 0);

  // Nothing matched (very defensive - should not happen): show the biggest
  // jobs so the student still gets something useful.
  if (hit.length === 0) {
    return scored
      .sort((a, b) => b.employment - a.employment)
      .slice(0, limit);
  }

  // Sort by match quality, then by how much the job is growing.
  hit.sort(
    (a, b) =>
      b.score - a.score || b.growth - a.growth || b.employment - a.employment,
  );

  // A job that barely matched is noise - drop it rather than pad the list.
  const floor = Math.max(2, Math.ceil(hit[0].score / 3));
  const pool = hit.filter((m) => m.score >= floor);

  // Spread the results across categories so one field cannot take over the
  // whole list. We walk the pool in order and take the best job from each
  // category, so the list still reads from "best match" downwards.
  const MAX_PER_CATEGORY = 2;
  const used = new Map<string, number>();
  const chosen: Match[] = [];
  const taken = new Set<string>();

  let progress = true;
  while (chosen.length < limit && progress) {
    progress = false;
    for (const m of pool) {
      if (chosen.length >= limit) break;
      if (taken.has(m.soc)) continue;
      const count = used.get(m.category) ?? 0;
      if (count >= MAX_PER_CATEGORY) continue;
      taken.add(m.soc);
      used.set(m.category, count + 1);
      chosen.push(m);
      progress = true;
    }
  }

  // If spreading left the list short, top it up with the best of what is
  // left so the student always has a full set of suggestions.
  for (const m of pool) {
    if (chosen.length >= limit) break;
    if (taken.has(m.soc)) continue;
    taken.add(m.soc);
    chosen.push(m);
  }

  return chosen;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export function money(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

export function growthLabel(growth: number): string {
  if (growth >= 20) return 'Exploding';
  if (growth >= 8) return 'Growing fast';
  if (growth >= 2) return 'Growing';
  if (growth >= 0) return 'Steady';
  return 'Shrinking';
}

export function growthTone(growth: number): string {
  if (growth >= 8) return 'is-good';
  if (growth >= 0) return 'is-steady';
  return 'is-down';
}
