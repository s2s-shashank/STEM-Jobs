"""Build the JSON the website reads.

Run with:  python3 -m pipeline.build_data

Everything the site shows comes from here. Each source is independent: if one
breaks, the site keeps the last good numbers for it instead of going blank.
"""

from __future__ import annotations

import json
import os
import sys
import traceback
from datetime import date, datetime, timezone
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline import taxonomy  # noqa: E402
from pipeline.dates import is_stale, parse_posted  # noqa: E402
from pipeline.env import load_env  # noqa: E402
from pipeline.sources import (  # noqa: E402
    bls_ep,
    bls_oews,
    careeronestop,
    nj_csc,
    ny_statejobs,
    pa_commonwealth,
    usajobs,
)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "src", "data", "generated")

STATES = {
    "nj": {"code": "NJ", "name": "New Jersey"},
    "ny": {"code": "NY", "name": "New York"},
    "pa": {"code": "PA", "name": "Pennsylvania"},
}

LIVE_SOURCES = {
    "nj": [(usajobs, "USAJOBS"), (nj_csc, "NJ Civil Service"), (careeronestop, "CareerOneStop")],
    "ny": [(usajobs, "USAJOBS"), (ny_statejobs, "StateJobsNY"), (careeronestop, "CareerOneStop")],
    "pa": [(usajobs, "USAJOBS"), (pa_commonwealth, "Commonwealth Careers"), (careeronestop, "CareerOneStop")],
}

# CareerOneStop answers "how many jobs match this word?", so its numbers can
# overlap with each other. We keep them separate instead of adding them up.
# (CareerOneStop counts are tracked separately, under live.private)

SOURCE_URLS = {
    "USAJOBS": "https://www.usajobs.gov/",
    "NJ Civil Service": "https://info.csc.nj.gov/jobannouncements/",
    "StateJobsNY": "https://statejobs.ny.gov/",
    "Commonwealth Careers": "https://careers.employment.pa.gov/",
    "CareerOneStop": "https://www.careeronestop.org/",
}

#: How many postings to keep in the JSON file. The page shows 8, so 10 is
#: enough and keeps the committed files small.
POSTING_SAMPLE = 10


def write_json(path: str, payload: Any) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=1, sort_keys=False)
        handle.write("\n")


def read_json(path: str) -> Any | None:
    if not os.path.exists(path):
        return None
    try:
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, json.JSONDecodeError):
        return None


def safe(label: str, function, *args, **kwargs):
    """Run a source, keeping the previous result if it fails."""
    try:
        return function(*args, **kwargs)
    except Exception as exc:  # noqa: BLE001 - one bad source must not stop the build
        print(f"  !! {label} failed: {exc}")
        traceback.print_exc(limit=2)
        return None


def collect_live(
    slug: str,
    state_code: str,
    occupations: list[dict[str, Any]],
    previous: dict[str, Any],
    today: date,
) -> tuple[
    list[dict[str, Any]],
    list[dict[str, Any]],
    dict[str, int],
    dict[str, Any],
    int,
]:
    """Collect the live postings for one state.

    If a source breaks we keep the numbers from the last run instead of
    showing a blank page, so the site always has something to show.

    Returns (postings, source_rows, by_category, private, total).
    """
    postings: list[dict[str, Any]] = []
    source_rows: list[dict[str, Any]] = []
    by_category: dict[str, int] = {}
    previous_live = previous.get("live", {}) or {}
    private: dict[str, Any] = previous_live.get("private") or {}
    previous_sources = {
        row.get("name", ""): row for row in previous_live.get("sources", [])
    }
    previous_postings = previous_live.get("postings", [])

    for module, label in LIVE_SOURCES[slug]:
        if module is careeronestop:
            # CareerOneStop is asked about occupations, not job titles,
            # so it gets the list of occupations to ask about.
            result = safe(label, module.collect, state_code, occupations)
            if result is None or not result.get("occupationCounts"):
                # nothing came back - keep the last good private numbers
                row = previous_sources.get(label) or {}
                print(f"  {label} gave no data - keeping the last numbers")
                source_rows.append(
                    {
                        "name": label,
                        "count": row.get("count", 0),
                        "url": row.get("url") or SOURCE_URLS.get(label, ""),
                        "kind": "search",
                    }
                )
                continue
            private = result
            source_rows.append(
                {
                    "name": label,
                    "count": result.get("total", 0),
                    "url": SOURCE_URLS.get(label, ""),
                    "kind": "search",
                }
            )
            continue

        result = safe(label, module.collect, state_code)
        row = previous_sources.get(label) or {}
        previous_count = row.get("count", 0)

        if result is None:
            # The source broke. Keep the numbers from the last run rather
            # than showing a blank page.
            print(f"  {label} failed - keeping the numbers from the last run")
            source_rows.append(
                {
                    "name": label,
                    "count": previous_count,
                    "url": row.get("url") or SOURCE_URLS.get(label, ""),
                    "kind": "postings",
                    "byCategory": row.get("byCategory", {}),
                }
            )
            for category, count in (row.get("byCategory") or {}).items():
                by_category[category] = by_category.get(category, 0) + count
            postings.extend(
                p for p in previous_postings if p.get("source") == label
            )
            continue

        # curation: drop postings that are no longer open
        fresh = [p for p in result["postings"] if not is_stale(p, today)]
        if len(fresh) != len(result["postings"]):
            print(f"  dropped {len(result['postings']) - len(fresh)} old postings")
        result["postings"] = fresh
        result["total"] = len(fresh)

        if not fresh and previous_count:
            # The board answered, but with nothing. That is usually true
            # (the exams closed), but it can also mean the page changed -
            # so say so loudly.
            print(
                f"  !! {label} gave no postings (it had {previous_count} last run)"
                " - check that the board still looks the same"
            )

        source_by_category: dict[str, int] = {}
        for posting in fresh:
            posting["source"] = label
            category = posting["category"]
            source_by_category[category] = source_by_category.get(category, 0) + 1
            by_category[category] = by_category.get(category, 0) + 1

        source_rows.append(
            {
                "name": label,
                "count": result["total"],
                "url": SOURCE_URLS.get(label, ""),
                "kind": "postings",
                "byCategory": source_by_category,
            }
        )
        postings.extend(fresh)

    # The headline number is the sum of the sources, so a source that failed
    # still counts for what it counted for yesterday.
    total = sum(row["count"] for row in source_rows if row.get("kind") == "postings")

    return postings, source_rows, by_category, private, total


def main() -> int:
    load_env()
    now = datetime.now(timezone.utc)
    today = now.date()
    as_of = now.strftime("%B %-d, %Y") if os.name != "nt" else now.strftime("%B %d, %Y")

    print("=" * 60)
    print("STEM Jobs data build")
    print("=" * 60)

    oews = safe("BLS OEWS", bls_oews.collect) or {}
    projections = safe("BLS projections", bls_ep.collect) or {}

    for slug, meta in STATES.items():
        state_code = meta["code"]
        path = os.path.join(OUT_DIR, f"{slug}.json")
        previous = read_json(path) or {}

        print(f"\n--- {meta['name']} ---")

        state_oe = oews.get(state_code)
        if state_oe:
            occupations = state_oe["occupations"]
            metros = state_oe.get("metros", {})
        else:
            print("  using previous occupation data")
            occupations = previous.get("occupations", [])
            metros = previous.get("metros", {})

        merged: list[dict[str, Any]] = []
        for occupation in occupations:
            record = dict(occupation)
            projection = projections.get(record["soc"]) or {}
            if projection.get("growth") is not None:
                record["growth"] = projection["growth"]
            if projection.get("openings") is not None:
                record["openings"] = projection["openings"]
            if projection.get("education"):
                record["education"] = projection["education"]
            record["blurb"] = taxonomy.CATEGORIES.get(record["category"], {}).get("blurb")
            # Per-occupation metro detail is not used by the site, and it
            # triples the size of the JSON files.
            record.pop("metros", None)
            record.pop("hourlyMean", None)
            merged.append(record)

        # live postings
        postings, source_rows, by_category, private, total_postings = collect_live(
            slug, state_code, merged, previous, today
        )

        # a sample of the freshest postings for the page
        sample = sorted(postings, key=lambda p: p["title"])
        sample.sort(key=lambda p: parse_posted(p.get("posted") or "") or date.min, reverse=True)
        sample = sample[:POSTING_SAMPLE]

        payload = {
            "state": slug,
            "name": meta["name"],
            "generated": now.isoformat(),
            "asOf": as_of,
            "occupations": merged,
            "metros": dict(
                sorted(metros.items(), key=lambda item: -item[1])[:8]
            ),
            "live": {
                "total": total_postings,
                "byCategory": by_category,
                "postings": sample,
                "sources": source_rows,
                "private": private,
            },
        }

        write_json(path, payload)
        total_employment = sum(o.get("employment", 0) for o in merged)
        print(
            f"  wrote {slug}.json: {len(merged)} occupations, "
            f"{total_employment:,} STEM workers, {total_postings} live postings"
        )

    print("\nDone.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
