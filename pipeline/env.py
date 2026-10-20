"""Read .env into os.environ (no external dependencies)."""

from __future__ import annotations

import os


def load_env(path: str | None = None) -> dict[str, str]:
    """Load KEY=VALUE pairs from a .env file without overriding real env vars."""
    if path is None:
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        path = os.path.join(root, ".env")

    loaded: dict[str, str] = {}
    if not os.path.exists(path):
        return loaded

    with open(path, encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            loaded[key] = value
            os.environ.setdefault(key, value)
    return loaded
