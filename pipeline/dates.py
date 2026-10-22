"""Reading the dates on job postings.

The boards print dates in a few formats - "10/01/2026" on the NJ Civil Service
list, "10/15/26" on StateJobsNY, ISO on the USAJOBS API - and some print no
date at all. These helpers read whatever is there so the build can tell a
fresh posting from a stale one.
"""

from __future__ import annotations

from datetime import date

#: A posting that carries no close date and is older than this is dropped.
#: Boards keep rows around long after a vacancy is filled. A year is
#: generous enough to keep the real "continuous recruitment" postings.
MAX_AGE_DAYS = 365


def parse_posted(text: str) -> date | None:
    """Read a date written as MM/DD/YY, MM/DD/YYYY or ISO.

    Returns None when the text is missing or is not a date.
    """
    raw = (text or "").strip()
    if not raw:
        return None

    if "/" in raw:
        parts = raw.split("/")
        if len(parts) != 3:
            return None
        month, day, year = (part.strip() for part in parts)
        try:
            year = int(year)
            if year < 100:
                # Two-digit years: 26 means 2026, but 99 means 1999 - a
                # posting from 1999 must not look like one from 2099.
                year += 1900 if year >= 30 else 2000
            return date(year, int(month), int(day))
        except ValueError:
            return None

    try:
        return date.fromisoformat(raw[:10])
    except ValueError:
        return None


def age_days(posting: dict, today: date) -> int | None:
    """How old a posting is, in days. None when it carries no date."""
    posted = parse_posted(posting.get("posted") or "")
    return None if posted is None else (today - posted).days


def is_stale(posting: dict, today: date, max_age_days: int = MAX_AGE_DAYS) -> bool:
    """True when a posting is no longer an open job.

    A posting that states a close date is judged by that date: a federal
    announcement can stay open for a year and still be worth applying to.
    """
    closes = parse_posted(posting.get("closes") or "")
    if closes is not None:
        return closes < today

    age = age_days(posting, today)
    return age is not None and age > max_age_days
