"""Checks for the data pipeline's "keep the last good numbers" rule.

Run with:  python3 tools/test-pipeline.py

A source that breaks (or answers with nothing) must not empty the site: the
numbers from the last run are kept, and the totals still add up.
"""

import os
import sys
import unittest
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline import build_data  # noqa: E402

TODAY = date(2026, 10, 21)


class BrokenSource:
    """A source that always fails, like a board that is down."""

    def collect(self, state, *args):
        raise RuntimeError("the board is down")


class EmptySource:
    """A source that answers, but with nothing."""

    def collect(self, state, *args):
        return {"postings": [], "total": 0}


class WorkingSource:
    """A source that answers with two postings."""

    def collect(self, state, *args):
        return {
            "postings": [
                {
                    "title": "Software Developer",
                    "employer": "Acme",
                    "location": "Newark, NJ",
                    "url": "https://example.test/1",
                    "category": "computing",
                    "posted": "2026-10-20",
                },
                {
                    "title": "Civil Engineer",
                    "employer": "Town",
                    "location": "Trenton, NJ",
                    "url": "https://example.test/2",
                    "category": "engineering",
                    "posted": "2026-10-19",
                },
            ],
            "total": 2,
        }


PREVIOUS = {
    "live": {
        "total": 5,
        "byCategory": {"computing": 3, "engineering": 2},
        "postings": [
            {
                "title": "Old Engineer",
                "employer": "Town",
                "location": "Trenton, NJ",
                "url": "https://example.test/old",
                "category": "engineering",
                "posted": "2026-01-02",
                "source": "Test Board",
            }
        ],
        "sources": [
            {
                "name": "Test Board",
                "count": 5,
                "url": "https://example.test",
                "kind": "postings",
                "byCategory": {"computing": 3, "engineering": 2},
            }
        ],
        "private": {"occupationCounts": {"15-1252": 10}, "total": 10},
    }
}


class CollectLive(unittest.TestCase):
    def setUp(self):
        self.sources = build_data.LIVE_SOURCES
        build_data.LIVE_SOURCES = {"nj": [(BrokenSource(), "Test Board")]}
        self.addCleanup(self.restore)

    def restore(self):
        build_data.LIVE_SOURCES = self.sources

    def collect(self):
        return build_data.collect_live("nj", "NJ", [], PREVIOUS, TODAY)

    def test_a_broken_source_keeps_the_last_numbers(self):
        postings, rows, by_category, private, total = self.collect()
        self.assertEqual(rows[0]["count"], 5)
        self.assertEqual(total, 5)
        self.assertEqual(by_category, {"computing": 3, "engineering": 2})
        self.assertEqual(len(postings), 1)
        self.assertEqual(postings[0]["title"], "Old Engineer")

    def test_a_source_with_nothing_is_believed(self):
        # The board answered: it really has no postings today. We do not
        # keep yesterday's numbers, because they are no longer true.
        build_data.LIVE_SOURCES = {"nj": [(EmptySource(), "Test Board")]}
        postings, rows, by_category, _, total = self.collect()
        self.assertEqual(total, 0)
        self.assertEqual(rows[0]["count"], 0)
        self.assertEqual(by_category, {})
        self.assertEqual(postings, [])

    def test_a_working_source_replaces_the_numbers(self):
        build_data.LIVE_SOURCES = {"nj": [(WorkingSource(), "Test Board")]}
        postings, rows, by_category, _, total = self.collect()
        self.assertEqual(total, 2)
        self.assertEqual(rows[0]["count"], 2)
        self.assertEqual(by_category, {"computing": 1, "engineering": 1})
        self.assertEqual(postings[0]["source"], "Test Board")

    def test_the_private_numbers_survive_a_broken_source(self):
        _, _, _, private, _ = self.collect()
        self.assertEqual(private["total"], 10)


if __name__ == "__main__":
    unittest.main()
