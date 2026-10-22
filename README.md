# STEM Jobs

A fast, free website that shows students what STEM careers actually look like
in **New Jersey**, **New York** and **Pennsylvania** — how many jobs are open
right now, what they pay, where the jobs are, and what to study to get one.

Built with [Astro](https://astro.build) and deployed to GitHub Pages. There is
no server, no database and no tracking: every page is a static HTML file.

## How it works

```
pipeline/          Python data pipeline (standard library only)
  build_data.py    Runs every source, writes src/data/generated/*.json
  taxonomy.py      Which occupations count as STEM, and how they are grouped
  xlsx.py          Minimal .xlsx reader (BLS publishes spreadsheets)
  htmltable.py     Minimal HTML table reader (state job boards publish tables)
  fetcher.py       HTTP with retries and a contact user-agent
  dates.py         Reads the dates on postings, so old ones can be dropped
  sources/         One module per data source
src/               The Astro site
  data/generated/  JSON written by the pipeline (committed to the repo)
  data/finder-questions.ts  The Career Finder questions
  pages/           /, /nj, /ny, /pa, /compare, /careers, /quiz, /sources
  components/      Charts and page sections (all inline SVG or CSS)
tools/             Tests for the Career Finder and the data pipeline
```

The pipeline runs on a schedule in GitHub Actions, commits any new numbers,
and the site is rebuilt and published. If a source breaks, the site keeps the
last good numbers instead of going blank.

## Cleaning out old jobs

Each build starts from scratch, so yesterday's postings never pile up. What
does need cleaning is what the boards themselves keep: the New York vacancy
list still showed rows posted three years ago, and the federal API returns
announcements that can stay open for months. So each posting is checked
before it is counted:

- a posting that states a close date is dropped once that date has passed
  (the federal API publishes `ApplicationCloseDate`);
- a posting with a date but no close date is dropped after a year
  (`MAX_AGE_DAYS` in `pipeline/dates.py`);
- a posting with no date at all is kept - the board lists it as open.

The dates are also what the "some real examples" list is sorted by, so the
newest postings are the ones students see.

## Running it locally

```bash
npm install
cp .env.example .env    # add your API keys
python3 -m pipeline.build_data   # refresh the data
npm run dev             # http://localhost:4321
npm run build           # static site in dist/
```

## Data sources

| Source | What we use | Key needed |
| --- | --- | --- |
| BLS OEWS | Employment and wages by occupation, per state and metro | No |
| BLS Employment Projections | Job growth, openings, typical education | No |
| O*NET | Job descriptions and study pathways | No |
| USAJOBS | Open federal STEM jobs | Yes (free) |
| CareerOneStop | Open private-sector STEM jobs, counted per occupation | Yes (free) |
| NJ Civil Service | Open NJ state and local announcements | No |
| StateJobsNY | Open NY State vacancies | No |
| Commonwealth Careers | Open PA state jobs | No |

## Private-sector job counts

CareerOneStop accepts an O*NET occupation code in its search, so the pipeline
asks it about every occupation it tracks - "how many Software Developer
postings are open in New Jersey?". The answers become the "open now" column on
each career page and the "who is hiring" charts on the state pages.

Because the search is done once per occupation, one job can be counted more
than once - a software job can match both "Software Developer" and "Web
Developer". The site therefore calls these numbers "job matches", not
postings, and says so where they are shown.

We use the **v1** endpoint on purpose. The v2 endpoint (which returns full
postings) needs a separate data request to the National Labor Exchange, so
depending on it would make the site fragile.

## What counts as STEM here

We start from the Bureau of Labor Statistics definition (computer and
mathematical, architecture and engineering, and life and physical science
occupations, plus related managers) and add the technical, health and
skilled-trade occupations that students usually think of as STEM careers.
Every occupation code is listed in `pipeline/taxonomy.py`, so the rule set is
easy to read and easy to change.

## The Career Finder

Every visitor to the site gets a popup that asks eight quick questions in a
carousel - "if you could have one superpower for your workday, which would
you grab?", "your robot friend needs a job, where does it go?" - and then
shows the STEM jobs that match their answers, with the salary, the job
growth and how many people do each job.

It works with no server and no tracking:

- `src/data/finder-questions.ts` holds the questions and the interest tags
  each answer points at.
- `src/lib/finder.ts` tags all 174 occupations with the same vocabulary and
  fills each fun fact with a real salary at build time.
- `src/pages/finder-data.json.ts` writes one small JSON file (questions +
  occupations + three numbers per state). The browser fetches it the first
  time the popup opens, so no page carries the data.
- `src/lib/finder-score.ts` scores the answers against that file in the
  browser and spreads the results across categories so one field cannot
  take over the whole list.

Your answers are never stored or sent anywhere: they live in memory until the
page is refreshed, so every visit is a fresh run through the quiz. The only
thing the site writes to your device is one flag that says "this browser has
already seen the popup", so it does not open by itself twice. The popup opens
by itself once, on the home page; the "Find my career" button opens it on any
page. The home page shows the results from the run that just happened - until
the next refresh.

Every number a student sees comes from the same government data as the rest
of the site, and every fun fact in the quiz is filled in with a real
occupation and a real salary at build time.

```bash
npm test               # scoring rules
npm run test:browser   # the whole flow in a real browser
npm run test:data      # posting dates and the "keep the last numbers" rule
```

The browser test needs Playwright once:

```bash
npm install --no-save playwright
npx playwright install chromium
```

## Live site

<https://s2s-shashank.github.io/stem-jobs/>

## Deploying

`.github/workflows/pages.yml` runs on every push and once a day. It refreshes
the data, builds the site and publishes it to GitHub Pages.

Repository secrets:

- `USAJOBS_API_KEY` - from <https://developer.usajobs.gov/api-token/>
- `BLS_CONTACT_EMAIL` - your email, so BLS can reach you
- `CAREERONESTOP_USER_ID` and `CAREERONESTOP_TOKEN` - from
  <https://api.careeronestop.org/>

Set **Settings → Pages → Source** to **GitHub Actions**.

## Licence and data use

All data comes from US government sources and is in the public domain. The
site code is yours to reuse.
