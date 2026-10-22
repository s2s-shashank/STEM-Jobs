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
  /** When the posting went up, if the source says. */
  posted?: string;
  /** When the posting closes, if the source says. */
  closes?: string;
}

export interface PrivateSector {
  /** Postings per occupation code, e.g. { "15-1252": 1518 } */
  occupationCounts: Record<string, number>;
  /** Postings per category id */
  byCategory: Record<string, number>;
  total: number;
  topLocations: { name: string; count: number }[];
  topEmployers: { name: string; count: number }[];
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
    sources: { name: string; count: number; url: string; kind?: string }[];
    /** Private-sector posting counts from CareerOneStop. */
    private?: PrivateSector;
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

/** Growth with a real sign: "+5.2%" or "-4.1%" (never "+-4.1%"). */
export function formatGrowth(n?: number): string {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : '-'}${Math.abs(n).toFixed(1)}%`;
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
 * Turn a yearly salary into numbers a student can picture.
 *
 * A $70,000 job does not mean much to a 14-year-old. $32 an hour, $1,350 a
 * week, or "a used car payment" does.
 */
export interface PayTranslation {
  hourly: number;
  weekly: number;
  monthly: number;
  perDay: number;
  /** Rough comparison a student can picture. */
  comparison: string;
}

export function translatePay(annual?: number): PayTranslation | undefined {
  if (!annual || annual <= 0) return undefined;

  const hourly = annual / 2080;
  const weekly = annual / 52;
  const monthly = annual / 12;
  const perDay = weekly / 5;

  let comparison: string;
  if (hourly >= 60) {
    comparison = 'about the price of a nice dinner out';
  } else if (hourly >= 40) {
    comparison = 'about the price of a movie ticket and a snack';
  } else if (hourly >= 25) {
    comparison = 'about the price of a concert ticket';
  } else if (hourly >= 18) {
    comparison = 'about the price of a large pizza';
  } else {
    comparison = 'about the price of a fast-food meal';
  }

  return {
    hourly: Math.round(hourly),
    weekly: Math.round(weekly),
    monthly: Math.round(monthly),
    perDay: Math.round(perDay),
    comparison,
  };
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
