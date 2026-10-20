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
  sources/         One module per data source
src/               The Astro site
  data/generated/  JSON written by the pipeline (committed to the repo)
  pages/           /, /nj, /ny, /pa, /compare, /careers, /quiz, /sources
  components/      Charts and page sections (all inline SVG or CSS)
```

The pipeline runs on a schedule in GitHub Actions, commits any new numbers,
and the site is rebuilt and published. If a source breaks, the site keeps the
last good numbers instead of going blank.

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
| CareerOneStop | Open private-sector STEM jobs | Yes (free) |
| NJ Civil Service | Open NJ state and local announcements | No |
| StateJobsNY | Open NY State vacancies | No |
| Commonwealth Careers | Open PA state jobs | No |

## What counts as STEM here

We start from the Bureau of Labor Statistics definition (computer and
mathematical, architecture and engineering, and life and physical science
occupations, plus related managers) and add the technical, health and
skilled-trade occupations that students usually think of as STEM careers.
Every occupation code is listed in `pipeline/taxonomy.py`, so the rule set is
easy to read and easy to change.

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
