"""USAJOBS - open federal STEM jobs in each state.

The search endpoint returns postings that mention the location, including
multi-state announcements, so every posting is filtered by its own state code
before it is counted.
"""

from __future__ import annotations

import json
import os
from typing import Any

from .. import taxonomy
from ..fetcher import fetch

API = "https://data.usajobs.gov/api/search"

#: How long to wait for one page. The API normally answers in a second or
#: two, so a slow page means the service is unwell.
TIMEOUT = 45

# State name -> the codes that appear in CountrySubDivisionCode.
STATE_CODES: dict[str, list[str]] = {
    "NJ": ["NJ", "New Jersey"],
    "NY": ["NY", "New York"],
    "PA": ["PA", "Pennsylvania"],
}

# Occupational series that are unambiguously STEM. Used as a second pass so a
# posting is not counted just because it mentions a city in a STEM place.
STEM_SERIES = {
    "0801",  # General Engineering
    "0802",  # Engineering
    "0810",  # Civil Engineering
    "0830",  # Mechanical Engineering
    "0850",  # Electrical Engineering
    "0860",  # Computer Engineering
    "1301",  # General Physical Science
    "1310",  # Chemistry
    "1320",  # Physics
    "1340",  # Meteorology
    "1410",  # Miscellaneous Physical Sciences
    "1510",  # Computer Science
    "1520",  # Computer Security
    "1550",  # General Information Technology
    "2210",  # Information Technology Management
}


def _headers() -> dict[str, str]:
    key = os.environ.get("USAJOBS_API_KEY", "").strip()
    if not key:
        raise RuntimeError("USAJOBS_API_KEY is not set")
    email = os.environ.get("BLS_CONTACT_EMAIL", "").strip() or "stemjobs@example.com"
    return {
        "Authorization-Key": key,
        "User-Agent": email,
        "Host": "data.usajobs.gov",
        "Accept": "application/json",
    }


def _matches_state(item: dict[str, Any], state: str) -> bool:
    codes = {c.lower() for c in STATE_CODES.get(state, [state])}
    for location in item.get("PositionLocation", []) or []:
        code = (location.get("CountrySubDivisionCode") or "").strip().lower()
        if code in codes:
            return True
    return False


def _series(item: dict[str, Any]) -> set[str]:
    return {c.get("Code", "") for c in item.get("JobCategory", []) or []}


def collect(state: str, max_pages: int = 8, page_size: int = 500) -> dict[str, Any]:
    """Return {postings: [...], total: int} for one state."""
    print(f"USAJOBS {state}")
    key = os.environ.get("USAJOBS_API_KEY", "").strip()
    if not key:
        print("  no USAJOBS_API_KEY - skipping")
        return {"postings": [], "total": 0}

    headers = _headers()
    location_name = {
        "NJ": "New Jersey",
        "NY": "New York",
        "PA": "Pennsylvania",
    }[state]

    postings: list[dict[str, Any]] = []
    seen: set[str] = set()

    for page in range(1, max_pages + 1):
        url = (
            f"{API}?LocationName={location_name.replace(' ', '+')}"
            f"&ResultsPerPage={page_size}&Page={page}"
        )
        try:
            payload = json.loads(
                fetch(url, headers=headers, timeout=TIMEOUT, retries=2).decode("utf-8")
            )
        except Exception as exc:  # noqa: BLE001 - a broken API should not kill the run
            print(f"  page {page} failed: {exc}")
            break

        items = payload.get("SearchResult", {}).get("SearchResultItems", []) or []
        if not items:
            break

        for item in items:
            descriptor = item.get("MatchedObjectDescriptor", {}) or {}
            identifier = descriptor.get("PositionID") or descriptor.get("PositionURI")
            if not identifier or identifier in seen:
                continue
            if not _matches_state(descriptor, state):
                continue

            title = (descriptor.get("PositionTitle") or "").strip()
            series = _series(descriptor)
            category = taxonomy.category_for_title(title)
            if category is None and not (series & STEM_SERIES):
                continue

            remuneration = descriptor.get("PositionRemuneration") or []
            salary_min = salary_max = None
            if remuneration:
                salary_min = remuneration[0].get("MinimumRange")
                salary_max = remuneration[0].get("MaximumRange")

            location = ""
            for loc in descriptor.get("PositionLocation", []) or []:
                if (loc.get("CountrySubDivisionCode") or "").strip().lower() in {
                    c.lower() for c in STATE_CODES.get(state, [])
                }:
                    location = loc.get("CityName") or loc.get("LocationName") or ""
                    break

            seen.add(identifier)
            postings.append(
                {
                    "title": title,
                    "employer": (descriptor.get("DepartmentName") or descriptor.get("OrganizationName") or "").strip(),
                    "location": location,
                    "salaryMin": int(salary_min) if salary_min and str(salary_min).isdigit() else None,
                    "salaryMax": int(salary_max) if salary_max and str(salary_max).isdigit() else None,
                    "url": (descriptor.get("PositionURI") or "").replace(":443", ""),
                    "category": category or "engineering",
                    "posted": (descriptor.get("PublicationStartDate") or "")[:10],
                    "closes": (descriptor.get("ApplicationCloseDate") or "")[:10],
                }
            )

        if len(items) < page_size:
            break

    print(f"  {len(postings)} STEM postings")
    return {"postings": postings, "total": len(postings)}


if __name__ == "__main__":
    from ..env import load_env

    load_env()
    result = collect("NJ")
    for posting in result["postings"][:5]:
        print(" ", posting["title"], "|", posting["employer"], "|", posting["location"])
