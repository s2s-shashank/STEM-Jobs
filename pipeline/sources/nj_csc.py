"""New Jersey Civil Service Commission - open recruitment announcements.

The Commission publishes every open competitive announcement in one HTML
table. An announcement is an exam opening (how you get on a hiring list),
which is a slightly different thing from a job posting - the site says so.
"""

from __future__ import annotations

from typing import Any

from .. import taxonomy
from ..fetcher import fetch_text
from ..htmltable import parse_tables

URL = "https://info.csc.nj.gov/jobannouncements/DefaultJobAnnouncement/JobList"
NAME = "NJ Civil Service"


def collect(state: str = "") -> dict[str, Any]:
    print("NJ Civil Service")
    page = fetch_text(URL, use_browser_headers=True)
    tables = parse_tables(page)
    if not tables:
        return {"postings": [], "total": 0}

    table = tables[0]
    header = [h.strip() for h in table[0]]
    try:
        i_title = header.index("Title")
        i_symbol = header.index("Symbol")
        i_jurisdiction = header.index("Jurisdiction")
        i_department = header.index("Department")
        i_issue = header.index("Issue Date")
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
                "employer": row[i_department].strip() if len(row) > i_department else "",
                "location": row[i_jurisdiction].strip() if len(row) > i_jurisdiction else "",
                "salaryMin": None,
                "salaryMax": None,
                "url": URL,
                "category": category,
                "symbol": row[i_symbol].strip() if len(row) > i_symbol else "",
                "posted": row[i_issue].strip() if len(row) > i_issue else "",
            }
        )

    print(f"  {len(postings)} STEM announcements")
    return {"postings": postings, "total": len(postings)}
