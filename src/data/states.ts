/**
 * State and category metadata.
 *
 * The category list lives in categories.json so that the Python pipeline and
 * the site can never drift apart - pipeline/taxonomy.py reads the same file.
 */
import categories from './categories.json';

export interface StateMeta {
  code: string;
  name: string;
  short: string;
  abbr: string;
  blurb: string;
  /** Colour used for this state's charts. */
  color: string;
}

export const STATES: StateMeta[] = [
  {
    code: 'nj',
    name: 'New Jersey',
    short: 'NJ',
    abbr: 'N.J.',
    blurb:
      'Home of the "Science Corridor" between Rutgers, Princeton and Bell Labs - one of the densest STEM hubs on the East Coast.',
    color: '#f2801d',
  },
  {
    code: 'ny',
    name: 'New York',
    short: 'NY',
    abbr: 'N.Y.',
    blurb:
      'From the tech campuses of the Finger Lakes to the biotech belt outside the city, New York is the biggest STEM market in the country.',
    color: '#2f7df6',
  },
  {
    code: 'pa',
    name: 'Pennsylvania',
    short: 'PA',
    abbr: 'Pa.',
    blurb:
      'Philly is a biotech and robotics powerhouse, and the rest of the state adds nuclear energy, advanced manufacturing and aerospace.',
    color: '#10a37f',
  },
];

export interface CategoryMeta {
  id: string;
  label: string;
  color: string;
  icon: string;
  blurb: string;
}

export const CATEGORIES: CategoryMeta[] = categories as CategoryMeta[];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<string, CategoryMeta>;

export const STATE_MAP = Object.fromEntries(
  STATES.map((s) => [s.code, s]),
) as Record<string, StateMeta>;
