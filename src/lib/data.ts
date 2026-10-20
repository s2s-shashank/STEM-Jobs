/**
 * Data loader.
 *
 * The Python pipeline writes plain JSON into src/data/generated/. Astro
 * imports those files at build time, so the browser never has to fetch
 * data and every page is complete HTML the moment it loads.
 *
 * If a file is missing (fresh clone, pipeline failed) we fall back to an
 * empty state instead of crashing the build.
 */
import type { CategoryMeta, StateMeta } from '../data/states';

export interface Occupation {
  /** O*NET / SOC code, e.g. "15-1252.00" */
  soc: string;
  title: string;
  category: string;
  /** People employed in this occupation in the state. */
  employment: number;
  /** Annual wages in USD. */
  meanWage: number;
  medianWage: number;
  entryWage: number;
  /** Projected job growth, percent over the projection period. */
  growth?: number;
  /** Annual openings projected over the projection period. */
  openings?: number;
  /** Employment by metro area within the state. */
  metros?: Record<string, number>;
  /** One-sentence "what you actually do" description. */
  blurb?: string;
  /** Typical entry-level education. */
  education?: string;
}

export interface LivePosting {
  title: string;
  employer: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  url: string;
  category: string;
}

export interface StateData {
  state: string;
  /** ISO timestamp of the pipeline run that produced this file. */
  generated: string;
  /** Human-friendly "as of" date. */
  asOf: string;
  occupations: Occupation[];
  live: {
    total: number;
    byCategory: Record<string, number>;
    postings: LivePosting[];
    /** Which live sources contributed. */
    sources: { name: string; count: number; url: string }[];
  };
}

const modules = import.meta.glob<{ default: StateData }>(
  '../data/generated/*.json',
  { eager: true },
);

const DATA: Record<string, StateData> = {};
for (const [path, mod] of Object.entries(modules)) {
  const code = path.split('/').pop()?.replace('.json', '') ?? '';
  if (code) DATA[code] = mod.default;
}

export function getStateData(code: string): StateData | undefined {
  return DATA[code];
}

export function hasStateData(code: string): boolean {
  return Boolean(DATA[code]);
}

export function allStateData(): StateData[] {
  return Object.values(DATA);
}

/** Newest generated timestamp across every state file. */
export function lastUpdated(): string | undefined {
  const stamps = allStateData()
    .map((d) => d.generated)
    .filter(Boolean)
    .sort();
  return stamps.at(-1);
}

export function formatDate(iso?: string): string {
  if (!iso) return 'not yet';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'not yet';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatMoney(n?: number): string {
  if (n == null) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

export function formatNumber(n?: number): string {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/**
 * Turn a BLS metro-area title into something a student can read.
 *
 * 'Philadelphia-Camden-Wilmington, PA-NJ-DE-MD' becomes
 * { name: 'Philadelphia–Camden–Wilmington', shared: ['DE', 'MD'] }
 * - the states the area spills into besides the one being shown.
 */
export function formatMetro(title: string): { name: string; shared: string[] } {
  const [place, states = ''] = title.split(',');
  const codes = states
    .split('-')
    .map((code) => code.trim())
    .filter(Boolean);
  const name = place
    .split('-')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('–');
  return { name, shared: codes.slice(1) };
}

/** Sort occupations by employment, biggest first. */
export function byEmployment(occ: Occupation[]): Occupation[] {
  return [...occ].sort((a, b) => b.employment - a.employment);
}

/** Group occupations into categories, keeping categories with data only. */
export function byCategory(
  occ: Occupation[],
  categories: CategoryMeta[],
): { category: CategoryMeta; occupations: Occupation[]; employment: number }[] {
  return categories
    .map((category) => {
      const occupations = occ.filter((o) => o.category === category.id);
      return {
        category,
        occupations,
        employment: occupations.reduce((s, o) => s + o.employment, 0),
      };
    })
    .filter((g) => g.occupations.length > 0);
}

export type { CategoryMeta, StateMeta };
