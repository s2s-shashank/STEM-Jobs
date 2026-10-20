"""Pennsylvania - Commonwealth Careers.

The site renders its results table on the server, so a plain search request
returns readable HTML. We search a list of STEM keywords and merge the
results, because there is no single "all STEM jobs" filter.
"""

from __future__ import annotations

import re
from typing import Any

from .. import taxonomy
from ..fetcher import fetch_text
from ..htmltable import parse_tables

BASE = "https://careers.employment.pa.gov/Home/BasicJobSearch"
NAME = "Commonwealth Careers"

# Words that pull in the science, technology, engineering and health jobs.
KEYWORDS = (
    "engineer",
    "scientist",
    "chemist",
    "biologist",
    "physicist",
    "geoscientist",
    "geologist",
    "environment",
    "architect",
    "surveyor",
    "analyst",
    "data",
    "computer",
    "developer",
    "programmer",
    "mathematic",
    "technologist",
    "technician",
    "nurse",
    "pharmacist",
    "physician",
    "veterinar",
    "radiolog",
    "medical",
    "quality",
    "research",
    "safety",
)

SALARY_RE = re.compile(r"\$([\d,]+(?:\.\d+)?)\s*-\s*\$([\d,]+(?:\.\d+)?)")


def _search(keyword: str) -> list[list[str]]:
    url = (
        f"{BASE}?entirePlanSearch=jobtitle&entirePlanSort=ASC"
        f"&jobName={keyword}&jobCode=&keyWord=&occupationGroup=&education=&salary=&page=1"
    )
    page = fetch_text(url, use_browser_headers=True)
    tables = parse_tables(page)
    if not tables:
        return []
    return tables[0]


def collect(state: str = "") -> dict[str, Any]:
    print("Commonwealth Careers (PA)")
    postings: list[dict[str, Any]] = []
    seen: set[str] = set()

    for keyword in KEYWORDS:
        try:
            rows = _search(keyword)
        except Exception as exc:  # noqa: BLE001 - one bad keyword should not stop the run
            print(f"  search '{keyword}' failed: {exc}")
            continue

        if not rows:
            continue
        header = [h.strip() for h in rows[0]]
        try:
            i_group = header.index("Occupational Group")
            i_family = header.index("Job Family")
            i_code = header.index("Job Code")
            i_title = header.index("Job Title & Specification")
            i_salary = header.index("Salary Range")
        except ValueError:
            continue

        for row in rows[1:]:
            if len(row) <= i_title:
                continue
            title = row[i_title].strip()
            code = row[i_code].strip() if len(row) > i_code else ""
            key = f"{code}|{title}"
            if key in seen:
                continue
            category = taxonomy.category_for_title(f"{title} {row[i_family] if len(row) > i_family else ''}")
            if not category:
                continue
            seen.add(key)

            salary_min = salary_max = None
            if len(row) > i_salary:
                match = SALARY_RE.search(row[i_salary])
                if match:
                    salary_min = int(float(match.group(1).replace(",", "")))
                    salary_max = int(float(match.group(2).replace(",", "")))

            postings.append(
                {
                    "title": title,
                    "employer": row[i_group].strip() if len(row) > i_group else "",
                    "location": "Pennsylvania",
                    "salaryMin": salary_min,
                    "salaryMax": salary_max,
                    "url": f"{BASE}?jobName={keyword}",
                    "category": category,
                    "group": row[i_group].strip() if len(row) > i_group else "",
                    "family": row[i_family].strip() if len(row) > i_family else "",
                }
            )

    print(f"  {len(postings)} STEM jobs")
    return {"postings": postings, "total": len(postings)}
