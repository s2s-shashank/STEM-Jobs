"""BLS Employment Projections - how much each job is growing.

Table 1.2 ("Occupational projections and worker characteristics") gives, for
every occupation: projected job growth, how many openings there will be each
year, the median pay, and the education people usually need to get in.

These are national projections - the only ones BLS publishes as one
downloadable table - so the site labels them as national.
"""

from __future__ import annotations

import html
import re
from typing import Any

from ..fetcher import fetch_text
from ..htmltable import clean

URL = "https://www.bls.gov/emp/tables/occupational-projections-and-characteristics.htm"

ROW_RE = re.compile(r"<tr.*?</tr>", re.S)
CELL_RE = re.compile(r"<t[dh][^>]*>(.*?)</t[dh]>", re.S)


def _to_float(value: str) -> float | None:
    value = clean(value).replace(",", "").replace("%", "").replace("—", "").strip()
    if not value:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def collect() -> dict[str, dict[str, Any]]:
    """Return {soc_code: {growth, openings, medianWage, education}}."""
    print("BLS Employment Projections")
    # BLS rejects generic browser user-agents but accepts a descriptive one
    # that includes a contact address, which is what fetcher sends.
    page = fetch_text(URL)

    tables = re.findall(r"<table.*?</table>", page, re.S)
    table = None
    for candidate in tables:
        if "National Employment Matrix code" in candidate:
            table = candidate
            break
    if table is None:
        raise RuntimeError("Could not find the BLS projections table")

    rows = ROW_RE.findall(table)
    header = [clean(html.unescape(re.sub(r"<[^>]+>", "", c))) for c in CELL_RE.findall(rows[0])]

    def index(needle: str) -> int:
        for i, name in enumerate(header):
            if needle.lower() in name.lower():
                return i
        raise KeyError(needle)

    i_code = index("National Employment Matrix code")
    i_change_pct = index("Employment change, percent")
    i_openings = index("Occupational openings")
    i_wage = index("Median annual wage")
    i_education = index("Typical education needed")
    i_type = index("Occupation type")

    out: dict[str, dict[str, Any]] = {}
    for row in rows[1:]:
        cells = [clean(html.unescape(re.sub(r"<[^>]+>", "", c))) for c in CELL_RE.findall(row)]
        if len(cells) <= i_code:
            continue
        code = cells[i_code]
        if not re.match(r"^\d{2}-\d{4}$", code):
            continue
        if cells[i_type] not in ("Line item", "Detailed"):
            continue
        education = cells[i_education]
        if education in ("—", "-", ""):
            education = None
        out[code] = {
            "growth": _to_float(cells[i_change_pct]),
            "openings": _to_float(cells[i_openings]),
            "medianWage": _to_float(cells[i_wage]),
            "education": education,
        }
    return out


if __name__ == "__main__":
    data = collect()
    print(f"{len(data)} detailed occupations")
    for code in ("15-1252", "17-2051", "29-1141", "15-2051"):
        print(code, data.get(code))
