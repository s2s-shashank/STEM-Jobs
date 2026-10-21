"""Checks for the posting dates and the curation rule.

Run with:  python3 tools/test-dates.py
"""

import os
import sys
import unittest
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline.dates import is_stale, parse_posted  # noqa: E402

TODAY = date(2026, 10, 21)


class ParsePosted(unittest.TestCase):
    def test_formats(self):
        self.assertEqual(parse_posted("10/01/2026"), date(2026, 10, 1))
        self.assertEqual(parse_posted("10/15/26"), date(2026, 10, 15))
        self.assertEqual(parse_posted("2026-10-15"), date(2026, 10, 15))
        self.assertEqual(parse_posted("2026-10-15T00:00:00.0000"), date(2026, 10, 15))

    def test_nothing_to_read(self):
        for text in ("", None, "   ", "not a date", "13/40/26"):
            self.assertIsNone(parse_posted(text))


class IsStale(unittest.TestCase):
    def test_closed_posting_is_dropped(self):
        posting = {"posted": "10/15/26", "closes": "2026-10-20"}
        self.assertTrue(is_stale(posting, TODAY))

    def test_open_posting_is_kept(self):
        posting = {"posted": "01/02/25", "closes": "2026-12-31"}
        self.assertFalse(is_stale(posting, TODAY))

    def test_old_posting_without_a_close_date_is_dropped(self):
        self.assertTrue(is_stale({"posted": "01/02/24"}, TODAY))

    def test_recent_posting_without_a_close_date_is_kept(self):
        self.assertFalse(is_stale({"posted": "10/15/26"}, TODAY))

    def test_posting_without_any_date_is_kept(self):
        self.assertFalse(is_stale({"title": "Engineer"}, TODAY))


if __name__ == "__main__":
    unittest.main()
