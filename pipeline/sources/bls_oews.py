"""Bureau of Labor Statistics - Occupational Employment and Wage Statistics.

Two downloads are used:

* ``oesm25st.zip`` - one row per occupation per state
* ``oesm25ma.zip`` - one row per occupation per metropolitan area

Both are zipped .xlsx files, so we read them with our own tiny XLSX reader.
"""

from __future__ import annotations

import os
import zipfile
from typing import Any

from .. import taxonomy
from .. import xlsx
from ..fetcher import fetch

STATE_URL = "https://www.bls.gov/oes/special-requests/oesm25st.zip"
METRO_URL = "https://www.bls.gov/oes/special-requests/oesm25ma.zip"

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".cache")


def _to_int(value: str) -> int | None:
    """BLS writes '**' or '#' for suppressed or tiny values."""
    value = (value or "").strip().replace(",", "")
    if not value or value in ("**", "#", "-", "*"):
        return None
    try:
        return int(round(float(value)))
    except ValueError:
        return None


def _download(url: str, filename: str) -> str:
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = os.path.join(CACHE_DIR, filename)
    if not os.path.exists(path):
        print(f"  downloading {filename} ...")
        with open(path, "wb") as handle:
            handle.write(fetch(url))
    return path


def _extract(zip_path: str, member: str) -> str:
    """Pull one file out of the zip and return its path on disk."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    target = os.path.join(CACHE_DIR, member.replace("/", "_"))
    if not os.path.exists(target):
        with zipfile.ZipFile(zip_path) as zf:
            with zf.open(member) as source, open(target, "wb") as handle:
                handle.write(source.read())
    return target


def _states_in_area(title: str) -> set[str]:
    """'Philadelphia-Camden-Wilmington, PA-NJ-DE-MD' -> {PA, NJ, DE, MD}."""
    if "," not in title:
        return set()
    tail = title.rsplit(",", 1)[1].strip()
    return {code.strip() for code in tail.split("-") if len(code.strip()) == 2}


def _rows(zip_path: str, member: str) -> list[dict[str, str]]:
    path = _extract(zip_path, member)
    return [
        row
        for row in xlsx.read_table(path)
        if row.get("O_GROUP") == "detailed"
        and row.get("NAICS") == "000000"
        and row.get("OWN_CODE") == "1235"
    ]


def collect() -> dict[str, dict[str, Any]]:
    """Return {state_code: {"occupations": [...], "metros": {...}}}."""
    print("BLS OEWS")
    state_zip = _download(STATE_URL, "oesm25st.zip")
    metro_zip = _download(METRO_URL, "oesm25ma.zip")

    state_rows = _rows(state_zip, "oesm25st/state_M2025_dl.xlsx")
    metro_rows = _rows(metro_zip, "oesm25ma/MSA_M2025_dl.xlsx")

    # state code -> occupation code -> record
    by_state: dict[str, dict[str, dict[str, Any]]] = {}
    for row in state_rows:
        state = row.get("PRIM_STATE", "").strip()
        code = row.get("OCC_CODE", "").strip()
        category = taxonomy.category_for_code(code)
        if not state or not category:
            continue
        employment = _to_int(row.get("TOT_EMP", ""))
        if not employment:
            continue
        by_state.setdefault(state, {})[code] = {
            "soc": code,
            "title": row.get("OCC_TITLE", "").strip(),
            "category": category,
            "employment": employment,
            "meanWage": _to_int(row.get("A_MEAN", "")),
            "medianWage": _to_int(row.get("A_MEDIAN", "")),
            "entryWage": _to_int(row.get("A_PCT10", "")),
            "topWage": _to_int(row.get("A_PCT90", "")),
            "hourlyMean": _to_int(row.get("H_MEAN", "")),
            "metros": {},
        }

    # metropolitan areas, assigned to every state they touch
    for row in metro_rows:
        area = row.get("AREA_TITLE", "").strip()
        code = row.get("OCC_CODE", "").strip()
        category = taxonomy.category_for_code(code)
        if not area or not category:
            continue
        employment = _to_int(row.get("TOT_EMP", ""))
        if not employment:
            continue
        for state in _states_in_area(area):
            record = by_state.get(state, {}).get(code)
            if record is not None:
                record["metros"][area] = employment

    # metro totals (STEM only) per state
    metro_totals: dict[str, dict[str, int]] = {}
    for state, occupations in by_state.items():
        totals: dict[str, int] = {}
        for record in occupations.values():
            for area, employment in record["metros"].items():
                totals[area] = totals.get(area, 0) + employment
        metro_totals[state] = totals

    out: dict[str, dict[str, Any]] = {}
    for state, occupations in by_state.items():
        out[state] = {
            "occupations": sorted(
                occupations.values(), key=lambda r: r["employment"], reverse=True
            ),
            "metros": metro_totals.get(state, {}),
        }
    return out


if __name__ == "__main__":
    data = collect()
    for state, payload in data.items():
        if state in ("NJ", "NY", "PA"):
            total = sum(o["employment"] for o in payload["occupations"])
            print(f"{state}: {len(payload['occupations'])} occupations, {total:,} STEM workers")
