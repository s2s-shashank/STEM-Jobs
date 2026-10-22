"""Small HTTP helper built on the standard library.

Why not `requests`? Because the pipeline runs in CI where every extra
dependency is another thing that can break. urllib covers what we need, and a
contact User-Agent is mandatory for BLS anyway.
"""

from __future__ import annotations

import gzip
import os
import time
import urllib.error
import urllib.request

# A real contact address is required by BLS and appreciated by everyone else.
# CI passes it in as BLS_CONTACT_EMAIL; locally it comes from .env - which is
# read at call time, because .env is loaded after this module is imported.
CONTACT_EMAIL = os.environ.get("BLS_CONTACT_EMAIL", "").strip()


def user_agent() -> str:
    """The User-Agent we send. BLS wants a real contact address in it."""
    email = os.environ.get("BLS_CONTACT_EMAIL", "").strip() or CONTACT_EMAIL
    return f"STEM-Jobs-Project/1.0 (educational project; contact: {email})"

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip",
}


class FetchError(RuntimeError):
    """Raised when a URL could not be retrieved after all retries."""


def fetch(
    url: str,
    *,
    headers: dict[str, str] | None = None,
    timeout: int = 60,
    retries: int = 3,
    use_browser_headers: bool = False,
) -> bytes:
    """GET a URL and return the raw body, retrying on transient failures."""
    merged = dict(BROWSER_HEADERS if use_browser_headers else {})
    merged.setdefault("User-Agent", user_agent())
    merged.setdefault("Accept-Encoding", "gzip")
    if headers:
        merged.update(headers)

    last_error: Exception | None = None
    for attempt in range(retries):
        request = urllib.request.Request(url, headers=merged)
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                body = response.read()
                if response.headers.get("Content-Encoding") == "gzip":
                    body = gzip.decompress(body)
                return body
        except urllib.error.HTTPError as exc:  # noqa: PERF203 - retry loop
            last_error = exc
            if exc.code in (400, 401, 403, 404, 410):
                raise FetchError(f"{url} -> HTTP {exc.code}") from exc
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last_error = exc
        if attempt < retries - 1:
            time.sleep(1.5 * (attempt + 1))

    raise FetchError(f"{url} -> {last_error}")


def fetch_text(url: str, **kwargs) -> str:
    return fetch(url, **kwargs).decode("utf-8", errors="replace")
