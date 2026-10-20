"""Minimal XLSX reader.

The BLS publishes its occupation tables as .xlsx inside a .zip. Rather than
pull in pandas and openpyxl (slow installs, more to break), we read the
spreadsheet directly: an .xlsx is just a zip of XML files, and we only ever
need the first worksheet in row order.

Only the standard library is used.
"""

from __future__ import annotations

import re
import zipfile
from xml.etree import ElementTree as ET

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
RNS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
PKG_REL_NS = "{http://schemas.openxmlformats.org/package/2006/relationships}"

_CELL_RE = re.compile(r"^([A-Z]+)(\d+)$")


def _col_index(ref: str) -> int:
    """'A' -> 0, 'B' -> 1, ... 'AA' -> 26."""
    idx = 0
    for ch in ref:
        idx = idx * 26 + (ord(ch) - 64)
    return idx - 1


def _read_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    try:
        data = zf.read("xl/sharedStrings.xml")
    except KeyError:
        return []
    root = ET.fromstring(data)
    out: list[str] = []
    for si in root.findall(f"{NS}si"):
        out.append(_si_text(si))
    return out


def _si_text(si: ET.Element) -> str:
    """Join every <t> run inside a shared string, preserving rich text."""
    parts: list[str] = []
    for t in si.iter(f"{NS}t"):
        parts.append(t.text or "")
    return "".join(parts)


def _sheet_paths(zf: zipfile.ZipFile) -> list[str]:
    """Return worksheet paths in workbook order (workbook.xml + rels)."""
    try:
        wb = ET.fromstring(zf.read("xl/workbook.xml"))
        rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    except KeyError:
        return sorted(n for n in zf.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml$", n))

    rel_map = {}
    for rel in rels.findall(f"{PKG_REL_NS}Relationship"):
        target = rel.get("Target", "")
        if target.startswith("/"):
            path = target.lstrip("/")
        elif target.startswith("xl/"):
            path = target
        else:
            path = "xl/" + target.lstrip("./")
        rel_map[rel.get("Id", "")] = path

    paths = []
    for sheet in wb.iter(f"{NS}sheet"):
        rid = sheet.get(f"{RNS}id")
        path = rel_map.get(rid or "")
        if path:
            paths.append(path)
    return paths


def read_sheet(path: str, sheet_index: int = 0) -> list[list[str]]:
    """Read a worksheet into a list of rows of strings.

    Empty cells become ''. Numbers are returned as plain strings without
    formatting (no thousands separators, no currency symbols).
    """
    with zipfile.ZipFile(path) as zf:
        shared = _read_shared_strings(zf)
        paths = _sheet_paths(zf)
        if not paths:
            return []
        target = paths[min(sheet_index, len(paths) - 1)]
        data = zf.read(target)

    root = ET.fromstring(data)
    rows: list[list[str]] = []

    for row in root.iter(f"{NS}row"):
        cells: list[str] = []
        for c in row.findall(f"{NS}c"):
            ref = c.get("r", "")
            col = _col_index(_CELL_RE.match(ref).group(1)) if _CELL_RE.match(ref) else len(cells)
            while len(cells) < col:
                cells.append("")
            cells.append(_cell_value(c, shared))
        rows.append(cells)

    return rows


def _cell_value(cell: ET.Element, shared: list[str]) -> str:
    ctype = cell.get("t", "")

    if ctype == "inlineStr":
        node = cell.find(f"{NS}is")
        if node is None:
            return ""
        return "".join(t.text or "" for t in node.iter(f"{NS}t"))

    v = cell.find(f"{NS}v")
    if v is None:
        return ""
    raw = v.text or ""

    if ctype == "s":
        try:
            return shared[int(raw)]
        except (ValueError, IndexError):
            return ""
    return raw


def read_table(path: str, sheet_index: int = 0) -> list[dict[str, str]]:
    """Read a worksheet whose first row is a header row into dicts."""
    rows = read_sheet(path, sheet_index)
    if not rows:
        return []
    header = [h.strip() for h in rows[0]]
    out: list[dict[str, str]] = []
    for row in rows[1:]:
        if not any(cell.strip() for cell in row):
            continue
        record = {}
        for i, name in enumerate(header):
            if not name:
                continue
            record[name] = row[i].strip() if i < len(row) else ""
        out.append(record)
    return out
