"""New York State - StateJobsNY vacancy list.

The Department of Civil Service publishes every current vacancy in one HTML
table, including the agency, the county and the grade (pay level).
"""

from __future__ import annotations

from typing import Any

from .. import taxonomy
from ..fetcher import fetch_text
from ..htmltable import parse_tables

URL = "https://statejobs.ny.gov/employees/vacancytable.cfm"
NAME = "StateJobsNY"


def collect(state: str = "") -> dict[str, Any]:
    print("StateJobsNY")
    page = fetch_text(URL, use_browser_headers=True)
    tables = parse_tables(page)
    if not tables:
        return {"postings": [], "total": 0}

    table = tables[0]
    header = [h.strip() for h in table[0]]
    try:
        i_title = header.index("Title")
        i_grade = header.index("Grade")
        i_posted = header.index("Posted")
        i_agency = header.index("Agency")
        i_county = header.index("County")
    except ValueError:
        return {"postings": [], "total": 0}

    postings: list[dict[str, Any]] = []
    for row in table[1:]:
        if len(row) <= i_title:
            continue
        title = row[i_title].strip()
        category = taxonomy.category_for_title(title)
        if not category:
            continue
        postings.append(
            {
                "title": title,
                "employer": row[i_agency].strip() if len(row) > i_agency else "",
                "location": row[i_county].strip() if len(row) > i_county else "",
                "salaryMin": None,
                "salaryMax": None,
                "url": URL,
                "category": category,
                "grade": row[i_grade].strip() if len(row) > i_grade else "",
                "posted": row[i_posted].strip() if len(row) > i_posted else "",
            }
        )

    print(f"  {len(postings)} STEM vacancies")
    return {"postings": postings, "total": len(postings)}
