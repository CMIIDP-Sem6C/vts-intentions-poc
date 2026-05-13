"""Parse JSON / DB values for scenario API (tested without DB)."""

from __future__ import annotations

import json
import re
from typing import Any


def parse_json_value(raw: Any) -> Any:
    if raw is None:
        return None
    if isinstance(raw, (list, dict)):
        return raw
    if isinstance(raw, str):
        s = raw.strip()
        if not s:
            return None
        try:
            return json.loads(s)
        except json.JSONDecodeError:
            return _lenient_js_array(s)
    return raw


def _lenient_js_array(s: str) -> list[Any] | None:
    """Best-effort parse for operator notes stored as JS-like literals."""
    t = s.strip()
    if not t.startswith("["):
        return None
    try:
        fixed = re.sub(r"(\w+):", r'"\1":', t)
        fixed = re.sub(r"'([^']*)'", r'"\1"', fixed)
        return json.loads(fixed)
    except (json.JSONDecodeError, TypeError, ValueError):
        return None


def parse_latlng_route(raw: Any) -> list[list[float]]:
    data = parse_json_value(raw)
    if not isinstance(data, list):
        return []
    out: list[list[float]] = []
    for item in data:
        if isinstance(item, (list, tuple)) and len(item) >= 2:
            try:
                lat, lng = float(item[0]), float(item[1])
                out.append([lat, lng])
            except (TypeError, ValueError):
                continue
    return out


def parse_start_coordinate(raw: Any) -> list[float] | None:
    data = parse_json_value(raw)
    if isinstance(data, (list, tuple)) and len(data) >= 2:
        try:
            return [float(data[0]), float(data[1])]
        except (TypeError, ValueError):
            return None
    return None
