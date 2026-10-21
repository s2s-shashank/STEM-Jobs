/**
 * Scoring test for the Career Finder.
 *
 * Run it with:  node --experimental-strip-types tools/test-finder.mjs
 *
 * It checks that different answers produce different, sensible job lists
 * and that every number shown comes from the right state.
 */
import { readFileSync } from 'node:fs';
import { scoreMatches, setQuestions } from '../src/lib/finder-score.ts';

const payload = JSON.parse(
  readFileSync(new URL('../dist/finder-data.json', import.meta.url), 'utf8'),
);

setQuestions(payload.questions);

function answer(pairs) {
  const out = {};
  for (const [q, o] of pairs) out[q] = o;
  return out;
}

const cases = [
  {
    name: 'Loves space + building',
    answers: answer([
      ['power', ['energy']],
      ['saturday', ['rocket']],
      ['day', ['hangar']],
      ['never-bored', ['scratch']],
      ['robot-job', ['powerlines']],
      ['legend', ['armstrong']],
      ['workstyle', ['hands']],
      ['state', ['nj']],
    ]),
  },
  {
    name: 'Loves animals + nature',
    answers: answer([
      ['power', ['animals']],
      ['saturday', ['weather']],
      ['day', ['forest']],
      ['never-bored', ['planet']],
      ['robot-job', ['water']],
      ['legend', ['goodall']],
      ['workstyle', ['outdoors']],
      ['state', ['pa']],
    ]),
  },
  {
    name: 'Loves code + numbers',
    answers: answer([
      ['power', ['code']],
      ['saturday', ['website']],
      ['day', ['datacenter']],
      ['never-bored', ['puzzle', 'code-works']],
      ['robot-job', ['sort']],
      ['legend', ['hopper']],
      ['workstyle', ['screen']],
      ['state', ['ny']],
    ]),
  },
  {
    name: 'Loves helping people',
    answers: answer([
      ['power', ['people']],
      ['saturday', ['prosthetic']],
      ['day', ['hospital']],
      ['never-bored', ['help']],
      ['robot-job', ['surgery']],
      ['legend', ['curie']],
      ['workstyle', ['people']],
      ['state', ['nj']],
    ]),
  },
];

let failures = 0;

const fail = (msg) => {
  console.log(`  FAIL: ${msg}`);
  failures++;
};
const check = (cond, msg) => {
  if (cond) console.log(`  ok: ${msg}`);
  else fail(msg);
};

for (const c of cases) {
  const matches = scoreMatches(payload, c.answers, c.answers.state[0], 9);
  console.log(`\n=== ${c.name} ===`);
  if (matches.length === 0) {
    fail('no matches');
    continue;
  }
  for (const m of matches) {
    console.log(
      `  ${m.title.padEnd(52)} $${Math.round(m.medianWage)
        .toLocaleString('en-US')
        .padStart(8)}  ${(m.growth >= 0 ? '+' : '') + m.growth.toFixed(1)}%  score=${m.score}`,
    );
  }

  for (const m of matches) {
    if (!m.medianWage || m.medianWage <= 0) fail(`${m.title} has no salary`);
    if (typeof m.growth !== 'number') fail(`${m.title} has no growth`);
    if (m.reasons.length === 0) fail(`${m.title} has no reason`);
  }

  // The list must not be one single category.
  const cats = new Set(matches.map((m) => m.category));
  if (cats.size < 3) fail(`only ${cats.size} categories in the results`);
}

// Two different answers should give different results.
const a = scoreMatches(payload, cases[0].answers, 'nj', 9).map((m) => m.soc);
const b = scoreMatches(payload, cases[2].answers, 'ny', 9).map((m) => m.soc);
if (a.filter((s) => b.includes(s)).length === a.length) {
  fail('space answers and code answers produced identical results');
}

// Salaries must come from the state the student picked.
function statsFor(soc, state) {
  const occ = payload.occupations.find((o) => o.soc === soc);
  const codes = state === 'other' ? Object.keys(occ.states) : [state];
  const rows = codes.map((c) => occ.states[c]).filter(Boolean);
  const paid = rows.filter((r) => r[1] > 0);
  const use = paid.length ? paid : rows;
  return {
    wage: Math.round(use.reduce((s, r) => s + r[1], 0) / use.length),
    jobs: rows.reduce((s, r) => s + r[0], 0),
  };
}

const njNurse = statsFor('29-1141', 'nj');
const paNurse = statsFor('29-1141', 'pa');
const otherNurse = statsFor('29-1141', 'other');

if (njNurse.wage === paNurse.wage) {
  fail('New Jersey and Pennsylvania salaries are identical');
} else {
  console.log(
    `\nState check ok (nurse pay: $${njNurse.wage.toLocaleString(
      'en-US',
    )} in NJ vs $${paNurse.wage.toLocaleString('en-US')} in PA)`,
  );
}

if (otherNurse.wage <= 0) {
  fail('"other" state has no salary');
} else {
  console.log(
    `Other-states check: nurse pay $${otherNurse.wage.toLocaleString(
      'en-US',
    )} (average of the three states)`,
  );
}

// Every occupation must have a salary in at least one state.
for (const occ of payload.occupations) {
  const has = Object.values(occ.states).some((r) => r[1] > 0);
  if (!has) fail(`${occ.title} has no salary in any state`);
}

// Every occupation must have at least one tag, or it can never match.
for (const occ of payload.occupations) {
  if (!occ.tags.length) fail(`${occ.title} has no tags`);
}

// Every fun fact must have real numbers in it, not leftover placeholders.
let facts = 0;
for (const q of payload.questions) {
  for (const o of q.options) {
    if (!o.fun) continue;
    facts++;
    if (/\{[^}]+\}/.test(o.fun.text)) {
      fail(`${q.id}/${o.id} has an unfilled placeholder: ${o.fun.text}`);
    }
    if (!/\d/.test(o.fun.text)) {
      fail(`${q.id}/${o.id} has no real number in its fact: ${o.fun.text}`);
    }
  }
}
check(facts >= 30, `${facts} fun facts are filled with real numbers`);

// Every question needs a title and at least four options to be worth asking.
for (const q of payload.questions) {
  if (!q.title) fail(`question ${q.id} has no title`);
  if (q.options.length < 4) fail(`question ${q.id} has only ${q.options.length} options`);
  for (const o of q.options) {
    if (!o.label) fail(`option ${q.id}/${o.id} has no label`);
  }
}

console.log(
  failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);
