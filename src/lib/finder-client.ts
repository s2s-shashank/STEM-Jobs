/**
 * Career Finder: browser-side plumbing.
 *
 * The matching rules live in src/lib/finder-score.ts (pure logic, easy to
 * test). This file adds the bits that need a browser: fetching the data
 * file and drawing the result cards.
 *
 * The site has no server, so the popup downloads one small JSON file
 * (src/pages/finder-data.json.ts) the first time it opens, scores the
 * student's answers against it, and draws the results in the browser.
 *
 * Every number shown to a student comes from that JSON file, which is
 * generated from the same government data the rest of the site uses.
 */
import { withBase } from './url';
import {
  scoreMatches,
  money,
  growthLabel,
  growthTone,
  type FinderAnswers,
  type FinderPayload,
  type Match,
} from './finder-score';

export {
  scoreMatches,
  setQuestions,
  type FinderAnswers,
  type FinderPayload,
} from './finder-score';
export const CATEGORY_META: Record<
  string,
  { label: string; icon: string; color: string }
> = {  computing: { label: 'Computing & Software', icon: '💻', color: '#2f7df6' },
  data: { label: 'Data & Math', icon: '📊', color: '#7c5cff' },
  engineering: { label: 'Engineering', icon: '⚙️', color: '#f2801d' },
  architecture: {
    label: 'Architecture & Surveying',
    icon: '📐',
    color: '#b25a1e',
  },
  science: { label: 'Science & Research', icon: '🔬', color: '#10a37f' },
  health: { label: 'Health & Medicine', icon: '🩺', color: '#e04f7f' },
  trades: {
    label: 'Skilled Trades & Technical',
    icon: '🔧',
    color: '#0f9bb4',
  },
};

/* ------------------------------------------------------------------ */
/* Fetching the data file                                              */
/* ------------------------------------------------------------------ */

let payloadPromise: Promise<FinderPayload> | null = null;

export function loadPayload(): Promise<FinderPayload> {
  if (!payloadPromise) {
    payloadPromise = fetch(withBase('/finder-data.json'))
      .then((r) => {
        if (!r.ok) throw new Error(`finder data ${r.status}`);
        return r.json();
      })
      .catch((err) => {
        payloadPromise = null;
        throw err;
      });
  }
  return payloadPromise;
}

/* ------------------------------------------------------------------ */
/* Rendering result cards                                               */
/* ------------------------------------------------------------------ */

export function matchCardHtml(match: Match, state: string): string {
  const meta = CATEGORY_META[match.category];
  const hourly = match.medianWage ? Math.round(match.medianWage / 2080) : 0;
  const stateName =
    state === 'other' ? 'across all three states' : state.toUpperCase();

  const reasons = match.reasons.slice(0, 3);

  return `
    <article class="match" style="--cat:${meta?.color ?? '#6b7a94'}">
      <div class="match__head">
        <span class="match__icon" aria-hidden="true">${meta?.icon ?? '⚗️'}</span>
        <div>
          <h3 class="match__title">
            <a href="${withBase(`/careers/${match.soc}`)}">${escapeHtml(match.title)}</a>
          </h3>
          <p class="match__cat">${meta?.label ?? match.category}</p>
        </div>
      </div>
      <p class="match__blurb">${escapeHtml(match.blurb)}</p>
      ${
        reasons.length
          ? `<p class="match__why"><span aria-hidden="true">✨</span> You said you like ${listOf(
              reasons,
            )}.</p>`
          : ''
      }
      <dl class="match__stats">
        <div>
          <dt>Typical salary</dt>
          <dd class="match__pay">${money(match.medianWage)}<span>/year</span></dd>
          <dd class="match__sub">${hourly ? `about ${money(hourly)} an hour` : ''}</dd>
        </div>
        <div>
          <dt>Job growth</dt>
          <dd class="match__growth ${growthTone(match.growth)}">
            ${match.growth >= 0 ? '+' : '-'}${Math.abs(match.growth).toFixed(1)}%
          </dd>
          <dd class="match__sub">${growthLabel(match.growth)}</dd>
        </div>
        <div>
          <dt>People doing it</dt>
          <dd class="match__jobs">${match.employment.toLocaleString('en-US')}</dd>
          <dd class="match__sub">${stateName}</dd>
        </div>
      </dl>
      <p class="match__foot">
        ${
          match.education
            ? `Most people in this job have a ${match.education.toLowerCase()}.`
            : 'Most paths start with a certificate, apprenticeship or two-year degree.'
        }
        <a class="match__link" href="${withBase(`/careers/${match.soc}`)}">See the full job page →</a>
      </p>
    </article>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** "a", "a and b", "a, b and c" - with the last one bolded. */
function listOf(items: string[]): string {
  const clean = items.map(escapeHtml);
  if (clean.length === 1) return `<strong>${clean[0]}</strong>`;
  const last = clean.pop() as string;
  return `${clean.join(', ')} and <strong>${last}</strong>`;
}
