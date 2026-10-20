"""CareerOneStop - private-sector STEM job postings.

CareerOneStop is the Department of Labor's job aggregator, built on the
National Labor Exchange. We use the v1 endpoint:

    https://api.careeronestop.org/v1/jobsearch/{userId}/{keyword}/{location}/{radius}/{days}

It accepts an O*NET/SOC occupation code (for example ``15-1252.00``) as the
keyword, which means we can ask "how many Software Developer postings are
open in New Jersey?" for every occupation we track. The response also lists
the top cities and the top employers for that search.

Each call returns:

    {
      "Jobcount": "1518",
      "Locations": [{"LocationName": "Trenton, NJ", "LocationCount": "..."}],
      "Companies": [{"CompanyName": "...", "LocationCount": "..."}]
    }

The v2 "List Jobs" endpoint (which returns full postings) needs a separate
data request to the National Labor Exchange, so we do not depend on it.

Credentials: free user id and token from https://api.careeronestop.org/.
"""

from __future__ import annotations

import json
import os
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from ..fetcher import fetch

V1 = "https://api.careeronestop.org/v1/jobsearch/{user_id}/{keyword}/{location}/{radius}/{days}"

#: How far from the state to include postings, in miles.
RADIUS = 50

#: Postings published in the last N days.
DAYS = 30

#: How many API calls to make at once.
WORKERS = 6

LOCATION_NAMES = {
    "NJ": "New Jersey",
    "NY": "New York",
    "PA": "Pennsylvania",
}


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


def _query(user_id: str, token: str, keyword: str, location: str) -> dict[str, Any] | None:
    url = V1.format(
        user_id=user_id,
        keyword=urllib.parse.quote(keyword, safe=""),
        location=urllib.parse.quote(location, safe=""),
        radius=RADIUS,
        days=DAYS,
    )
    try:
        body = fetch(url, headers=_headers(token), timeout=60, retries=2).decode(
            "utf-8", errors="replace"
        )
        return json.loads(body)
    except Exception:  # noqa: BLE001 - one bad occupation should not stop the run
        return None


def _to_int(value: Any) -> int:
    try:
        return int(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return 0


def collect(state: str = "", occupations: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Fetch private-sector posting counts for a state.

    ``occupations`` is the list of occupation records (with ``soc`` and
    ``category``) for that state, normally straight from the BLS data.
    """
    print(f"CareerOneStop {state}")
    credentials = _credentials()
    if not credentials:
        print("  no CareerOneStop credentials - skipping")
        return {"occupationCounts": {}, "byCategory": {}, "total": 0, "topLocations": [], "topEmployers": []}

    user_id, token = credentials
    location = LOCATION_NAMES.get(state, state)
    occupations = occupations or []

    results: dict[str, dict[str, Any]] = {}

    def fetch_one(occupation: dict[str, Any]) -> tuple[str, dict[str, Any] | None]:
        soc = occupation.get("soc", "")
        return soc, _query(user_id, token, f"{soc}.00", location)

    if occupations:
        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            for soc, payload in pool.map(fetch_one, occupations):
                if payload is not None:
                    results[soc] = payload

    counts: dict[str, int] = {}
    by_category: dict[str, int] = {}
    locations: dict[str, int] = {}
    employers: dict[str, int] = {}

    for occupation in occupations:
        soc = occupation.get("soc", "")
        payload = results.get(soc)
        if not payload:
            continue
        count = _to_int(payload.get("Jobcount"))
        if count:
            counts[soc] = count
            category = occupation.get("category")
            if category:
                by_category[category] = by_category.get(category, 0) + count

        for entry in payload.get("Locations") or []:
            name = (entry.get("LocationName") or "").strip()
            if name:
                locations[name] = locations.get(name, 0) + _to_int(entry.get("LocationCount"))
        for entry in payload.get("Companies") or []:
            name = (entry.get("CompanyName") or "").strip()
            if name:
                # Companies report their count as "JobCount", cities as
                # "LocationCount".
                count = _to_int(entry.get("JobCount") or entry.get("LocationCount"))
                employers[name] = employers.get(name, 0) + count

    def top(counter: dict[str, int], limit: int = 8) -> list[dict[str, Any]]:
        return [
            {"name": name, "count": count}
            for name, count in sorted(counter.items(), key=lambda item: -item[1])[:limit]
        ]

    total = sum(by_category.values())
    print(
        f"  {len(counts)} occupations with postings, {total:,} private-sector postings"
    )

    return {
        "occupationCounts": counts,
        "byCategory": by_category,
        "total": total,
        "topLocations": top(locations),
        "topEmployers": top(employers),
    }


if __name__ == "__main__":
    from ..env import load_env

    load_env()
    result = collect("NJ", [{"soc": "15-1252", "category": "computing"}])
    print(json.dumps(result, indent=2)[:800])
