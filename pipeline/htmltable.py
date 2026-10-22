"""Extract tables from an HTML page using only the standard library.

The job boards we read (NJ Civil Service, StateJobsNY) publish plain HTML
tables, which are much more stable than the JSON APIs behind their front ends.
"""

from __future__ import annotations

import html
import re
from html.parser import HTMLParser


class _TableParser(HTMLParser):
    """Collects every <table> on a page as a list of rows of cell text."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tables: list[list[list[str]]] = []
        self._table: list[list[str]] | None = None
        self._row: list[str] | None = None
        self._cell: list[str] | None = None
        self._skip = 0

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in ("script", "style"):
            self._skip += 1
            return
        if self._skip:
            return
        if tag == "table":
            self._table = []
        elif tag == "tr" and self._table is not None:
            self._row = []
        elif tag in ("td", "th") and self._row is not None:
            self._cell = []

    def handle_endtag(self, tag: str) -> None:
        if tag in ("script", "style"):
            self._skip = max(0, self._skip - 1)
            return
        if self._skip:
            return
        if tag in ("td", "th") and self._cell is not None and self._row is not None:
            self._row.append(clean(" ".join(self._cell)))
            self._cell = None
        elif tag == "tr" and self._row is not None and self._table is not None:
            self._table.append(self._row)
            self._row = None
        elif tag == "table" and self._table is not None:
            self.tables.append(self._table)
            self._table = None

    def handle_data(self, data: str) -> None:
        if self._cell is not None and not self._skip:
            self._cell.append(data)


def clean(text: str) -> str:
    """Collapse whitespace and decode entities."""
    return re.sub(r"\s+", " ", html.unescape(text or "")).strip()


def parse_tables(page: str) -> list[list[list[str]]]:
    parser = _TableParser()
    parser.feed(page)
    parser.close()
    return parser.tables
