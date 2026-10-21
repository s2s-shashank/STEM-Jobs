/**
 * Career Finder: server-side helpers.
 *
 * The questions live in src/data/finder-questions.ts because both the
 * server (to fill in the fun facts) and the browser (to render and score)
 * need them. This file holds the parts that only run at build time:
 * tagging occupations, building the payload, and filling in real numbers.
 */
import { allStateData } from './data';
import { CATEGORY_MAP } from '../data/states';
import {
  QUESTIONS,
  type FinderQuestion,
  type FinderOption,
} from '../data/finder-questions';

export { QUESTIONS };
export type { FinderQuestion, FinderOption };

/* ------------------------------------------------------------------ */
/* Interest tags                                                       */
/* ------------------------------------------------------------------ */

/**
 * Every tag gets a phrase we can show the student, so the results screen
 * can explain *why* a job matched instead of just listing jobs.
 */
export const TAG_PHRASES: Record<string, string> = {
  code: 'coding and computers',
  numbers: 'numbers and patterns',
  lab: 'labs and experiments',
  people: 'helping people',
  build: 'building things from scratch',
  hands: 'working with your hands',
  nature: 'the planet and living things',
  space: 'space and flight',
  art: 'design and how things look',
  energy: 'big machines and power',
  animals: 'animals',
  safety: 'keeping people safe',
  food: 'food and how it is made',
  water: 'water and the environment',
  manage: 'leading a team',
};

/**
 * Which tags each category starts with. Every occupation gets these even
 * when no keyword matches, so nothing is ever left untagged.
 */
const CATEGORY_TAGS: Record<string, string[]> = {
  computing: ['code', 'numbers'],
  data: ['numbers', 'code'],
  engineering: ['build', 'lab'],
  architecture: ['build', 'art'],
  science: ['lab', 'nature'],
  health: ['people'],
  trades: ['hands', 'build'],
};

/**
 * Keyword rules. The order matters: "Computer Hardware Engineers" should
 * be tagged as code, not as a generic bit of engineering.
 */
const KEYWORD_RULES: [RegExp, string][] = [
  [
    /software|web developer|web and digital|programmer|database|network|information security|systems analyst|quality assurance|user support|computer/i,
    'code',
  ],
  [/data|statistic|actuar|mathematic|operations research/i, 'numbers'],
  [/engineer|architect|draft|construct|civil/i, 'build'],
  [
    /mechanic|weld|repair|install|operator|assembl|tool and die|maintenance|machin|plumb|electric/i,
    'hands',
  ],
  [
    /nurse|therap|physician|doctor|dentist|pharmac|midwi|paramedic|counsel|dietit|optician|podiatrist|psychiatr|optometrist|surgical|medical|health|audiolog|cardiolog|dermatolog|neurolog|obstetric|pediatric|radiolog|orthotist|respiratory|acupuncturist|chiropractor|genetic|athletic trainer|recreational/i,
    'people',
  ],
  [/veterinar|animal|zoolog|agricultur/i, 'animals'],
  [/food|dietit|nutrition/i, 'food'],
  [/environmental|conservation|soil|forest|wildlife|hydrolog|geoscient|ecolog/i, 'nature'],
  [/aerospace|aircraft|avionic/i, 'space'],
  [/nuclear|reactor/i, 'energy'],
  [
    /power-line|powerhouse|power plant|gas plant|boiler|stationary engineer|electrical power|electric power/i,
    'energy',
  ],
  [/water and wastewater/i, 'water'],
  [
    /fire alarm|security and fire|occupational health and safety|health and safety/i,
    'safety',
  ],
  [/design|draft|architect|survey|cartograph|graphic/i, 'art'],
  [
    /laborator|forensic|microbiolog|biophys|biochem|chemi|physic|material scientist|atmospheric|space scientist|precision instrument/i,
    'lab',
  ],
  [/manager|supervisor|administrator|director/i, 'manage'],
];

/**
 * Software architects design databases and networks, not buildings. These
 * words stop us tagging them as builders and artists.
 */
const NOT_BUILDING = /software|database|network|computer/i;

/**
 * Work out the interest tags for one occupation.
 */
export function occupationTags(title: string, category: string): string[] {
  const tags = new Set<string>(CATEGORY_TAGS[category] ?? []);
  const building = !NOT_BUILDING.test(title);

  for (const [pattern, tag] of KEYWORD_RULES) {
    if (!pattern.test(title)) continue;
    // "Database Architect" is a software job, not a building job.
    if (tag === 'build' || tag === 'art') {
      if (!building) continue;
      if (tag === 'art' && /architect|draft/i.test(title)) continue;
    }
    tags.add(tag);
  }
  return [...tags];
}

/* ------------------------------------------------------------------ */
/* Data payload                                                        */
/* ------------------------------------------------------------------ */

export interface FinderOccupation {
  soc: string;
  title: string;
  category: string;
  blurb: string;
  education: string;
  tags: string[];
  /** state code -> [employment, median wage, growth percent] */
  states: Record<string, [number, number, number]>;
}

/**
 * The payload the browser scores against. It is small on purpose: title,
 * one line of description, the tags, and three numbers per state. The
 * questions ride along too, so a page does not have to carry them.
 */
export function buildFinderPayload(): {
  questions: FinderQuestion[];
  occupations: FinderOccupation[];
  generated: string;
} {
  const bySoc = new Map<string, FinderOccupation>();

  for (const state of allStateData()) {
    for (const o of state.occupations) {
      let entry = bySoc.get(o.soc);
      if (!entry) {
        entry = {
          soc: o.soc,
          title: o.title,
          category: o.category,
          blurb: o.blurb ?? CATEGORY_MAP[o.category]?.blurb ?? '',
          education: o.education ?? '',
          tags: occupationTags(o.title, o.category),
          states: {},
        };
        bySoc.set(o.soc, entry);
      }
      entry.states[state.state] = [
        o.employment ?? 0,
        o.medianWage ?? 0,
        o.growth ?? 0,
      ];
    }
  }

  const occupations = [...bySoc.values()].sort((a, b) =>
    a.title.localeCompare(b.title),
  );

  const stamps = allStateData()
    .map((d) => d.generated)
    .filter(Boolean)
    .sort();

  return {
    questions: preparedQuestions('nj'),
    occupations,
    generated: stamps.at(-1) ?? '',
  };
}

/**
 * Fill the `{title}`, `{jobs}`, `{wage}`, `{hourly}` and `{growth}` tokens
 * in a fun fact with real numbers, so no fact is made up.
 */
export function fillFunFact(
  text: string,
  soc: string,
  state = 'nj',
): string {
  const data = allStateData().find((d) => d.state === state);
  const occ = data?.occupations.find((o) => o.soc === soc);
  if (!occ) return text.replace(/\{[^}]+\}/g, '');

  const wage = occ.medianWage ?? 0;
  const hourly = wage ? Math.round(wage / 2080) : 0;

  return text
    .replace(/\{title\}/g, occ.title)
    .replace(/\{jobs\}/g, (occ.employment ?? 0).toLocaleString('en-US'))
    .replace(/\{wage\}/g, `$${wage.toLocaleString('en-US')}`)
    .replace(/\{hourly\}/g, `$${hourly}`)
    .replace(/\{growth\}/g, `${(occ.growth ?? 0).toFixed(1)}%`);
}

/**
 * The questions with every fun fact filled in with real numbers, ready to
 * be handed to the browser as JSON.
 */
export function preparedQuestions(state = 'nj'): FinderQuestion[] {
  return QUESTIONS.map((q) => ({
    ...q,
    options: q.options.map((o) =>
      o.fun
        ? { ...o, fun: { soc: o.fun.soc, text: fillFunFact(o.fun.text, o.fun.soc, state) } }
        : o,
    ),
  }));
}
