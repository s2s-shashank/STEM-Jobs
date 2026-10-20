"""CareerOneStop - open private-sector STEM jobs.

CareerOneStop is the Department of Labor's job aggregator, built on the
National Labor Exchange. Two endpoints are used:

* ``/v1/jobsearch/...`` returns a plain count of matching postings
* ``/v2/jobsearch/...`` returns the postings themselves

Both need a free user id and token from https://api.careeronestop.org/.
When they are not set, this source quietly returns nothing so the rest of
the build still works.
"""

from __future__ import annotations

import json
import os
import urllib.parse
from typing import Any

from .. import taxonomy
from ..fetcher import fetch

V1 = "https://api.careeronestop.org/v1/jobsearch/{user_id}/{keyword}/{location}/{radius}/{days}"
V2 = (
    "https://api.careeronestop.org/v2/jobsearch/{user_id}/{keyword}/{location}"
    "/{radius}/{sort}/{order}/{start}/{page_size}/{days}"
)

# Search terms chosen to cover the STEM fields without pulling in everything.
KEYWORDS = (
    "engineer",
    "scientist",
    "software developer",
    "data analyst",
    "nurse",
    "technician",
    "computer",
    "research scientist",
)

DAYS = 30
RADIUS = 50


def _credentials() -> tuple[str, str] | None:
    user_id = os.environ.get("CAREERONESTOP_USER_ID", "").strip()
    token = os.environ.get("CAREERONESTOP_TOKEN", "").strip()
    if not user_id or not token:
        return None
    return user_id, token


def _headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }


def _get(url: str, token: str) -> Any:
    payload = fetch(url, headers=_headers(token), timeout=60).decode("utf-8", errors="replace")
    return json.loads(payload)


def _count(user_id: str, token: str, keyword: str, location: str) -> int:
    url = V1.format(
        user_id=user_id,
        keyword=urllib.parse.quote(keyword),
        location=urllib.parse.quote(location),
        radius=RADIUS,
        days=DAYS,
    )
    data = _get(url, token)
    if isinstance(data, dict):
        for key in ("TotalJobs", "Total", "JobSearchTotal", "total"):
            if key in data:
                try:
                    return int(data[key])
                except (TypeError, ValueError):
                    pass
    if isinstance(data, (int, float)):
        return int(data)
    return 0


def _postings(user_id: str, token: str, keyword: str, location: str) -> list[dict[str, Any]]:
    url = V2.format(
        user_id=user_id,
        keyword=urllib.parse.quote(keyword),
        location=urllib.parse.quote(location),
        radius=RADIUS,
        sort="DESC",
        order="RELEVANCE",
        start=1,
        page_size=50,
        days=DAYS,
    )
    data = _get(url, token)
    if isinstance(data, dict):
        for key in ("Jobs", "JobPosting", "SearchResult", "JobSearchResult"):
            value = data.get(key)
            if isinstance(value, list):
                return value
            if isinstance(value, dict):
                for inner in ("Jobs", "JobPosting"):
                    if isinstance(value.get(inner), list):
                        return value[inner]
    return []


def _salary(posting: dict[str, Any]) -> tuple[int | None, int | None]:
    """Salary can arrive as a string, a list, or a nested object."""
    raw = posting.get("Salary") or posting.get("salary") or {}
    if isinstance(raw, str):
        digits = [part for part in raw.replace(",", " ").split() if part.replace(".", "").isdigit()]
        if len(digits) >= 2:
            return int(float(digits[0])), int(float(digits[1]))
        return None
    if isinstance(raw, list) and raw:
        raw = raw[0]
    if isinstance(raw, dict):
        low = raw.get("SalaryMin") or raw.get("Min") or raw.get("min")
        high = raw.get("SalaryMax") or raw.get("Max") or raw.get("max")
        try:
            return (int(float(low)) if low else None, int(float(high)) if high else None)
        except (TypeError, ValueError):
            return None
    return None


def collect(state: str = "") -> dict[str, Any]:
    print("CareerOneStop")
    credentials = _credentials()
    if not credentials:
        print("  no CareerOneStop credentials - skipping")
        return {"postings": [], "total": 0}

    user_id, token = credentials
    location = {"NJ": "New Jersey", "NY": "New York", "PA": "Pennsylvania"}.get(state, state)

    postings: list[dict[str, Any]] = []
    seen: set[str] = set()
    counted = 0

    for keyword in KEYWORDS:
        try:
            counted += _count(user_id, token, keyword, location)
        except Exception as exc:  # noqa: BLE001
            print(f"  count '{keyword}' failed: {exc}")
        try:
            results = _postings(user_id, token, keyword, location)
        except Exception as exc:  # noqa: BLE001
            print(f"  search '{keyword}' failed: {exc}")
            continue

        for posting in results:
            title = (posting.get("JobTitle") or posting.get("Title") or "").strip()
            if not title:
                continue
            identifier = posting.get("JobID") or posting.get("Id") or f"{title}|{posting.get('Company', '')}"
            if identifier in seen:
                continue
            category = taxonomy.category_for_title(title)
            if not category:
                continue
            seen.add(identifier)
            salary_min, salary_max = _salary(posting)
            location_field = posting.get("Location") or {}
            city = ""
            if isinstance(location_field, dict):
                city = location_field.get("CityName") or location_field.get("LocationName") or ""
            elif isinstance(location_field, str):
                city = location_field
            postings.append(
                {
                    "title": title,
                    "employer": (posting.get("Company") or posting.get("CompanyName") or "").strip(),
                    "location": city,
                    "salaryMin": salary_min,
                    "salaryMax": salary_max,
                    "url": posting.get("Url") or posting.get("JobURL") or "",
                    "category": category,
                }
            )

    total = counted or len(postings)
    print(f"  {len(postings)} sample postings, {total} counted")
    return {"postings": postings, "total": total}
