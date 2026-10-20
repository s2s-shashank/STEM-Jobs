/**
 * Static metadata about each state we cover.
 * The numbers come from the generated JSON in src/data/generated/ and are
 * merged in at build time - this file only holds the descriptive bits.
 */
export interface StateMeta {
  code: string;
  name: string;
  short: string;
  abbr: string;
  blurb: string;
  /** Colour used for this state's charts. */
  color: string;
  /** Big metros inside the state, used for the "where the jobs live" chart. */
  metros: string[];
}

export const STATES: StateMeta[] = [
  {
    code: 'nj',
    name: 'New Jersey',
    short: 'NJ',
    abbr: 'N.J.',
    blurb:
      'Home of the "Science Corridor" between Rutgers, Princeton and Bell Labs — one of the densest STEM hubs on the East Coast.',
    color: '#f2801d',
    metros: ['Newark', 'Jersey City', 'Princeton', 'Edison', 'Trenton'],
  },
  {
    code: 'ny',
    name: 'New York',
    short: 'NY',
    abbr: 'N.Y.',
    blurb:
      'From the tech campuses of the Finger Lakes to the biotech belt outside the city, New York is the biggest STEM market in the country.',
    color: '#2f7df6',
    metros: ['New York City', 'Buffalo', 'Rochester', 'Albany', 'Syracuse'],
  },
  {
    code: 'pa',
    name: 'Pennsylvania',
    short: 'PA',
    abbr: 'Pa.',
    blurb:
      'Philly is a biotech and robotics powerhouse, and the rest of the state adds nuclear energy, advanced manufacturing and aerospace.',
    color: '#10a37f',
    metros: ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Harrisburg'],
  },
];

/** Category metadata, shared by charts, career pages and the data pipeline. */
export interface CategoryMeta {
  id: string;
  label: string;
  color: string;
  icon: string;
  blurb: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'computing',
    label: 'Computing & Software',
    color: '#2f7df6',
    icon: '💻',
    blurb: 'Software, data, cybersecurity and IT support.',
  },
  {
    id: 'engineering',
    label: 'Engineering',
    color: '#f2801d',
    icon: '⚙️',
    blurb: 'Civil, mechanical, electrical, chemical and aerospace engineers.',
  },
  {
    id: 'science',
    label: 'Science & Research',
    color: '#10a37f',
    icon: '🔬',
    blurb: 'Physicists, chemists, biologists and medical scientists.',
  },
  {
    id: 'health',
    label: 'Health & Medicine',
    color: '#e04f7f',
    icon: '🩺',
    blurb: 'Doctors, nurses, pharmacists and medical technicians.',
  },
  {
    id: 'data',
    label: 'Data & Math',
    color: '#7c5cff',
    icon: '📊',
    blurb: 'Statisticians, actuaries, analysts and mathematicians.',
  },
  {
    id: 'construction',
    label: 'Construction & Trades',
    color: '#0f9bb4',
    icon: '🏗️',
    blurb: 'Surveyors, architects, construction managers and skilled trades.',
  },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<string, CategoryMeta>;

export const STATE_MAP = Object.fromEntries(
  STATES.map((s) => [s.code, s]),
) as Record<string, StateMeta>;
