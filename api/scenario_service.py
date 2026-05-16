"""Load scenarios, ships, intentions, and timed events from Postgres."""

from __future__ import annotations

import os
import re
from typing import Any

import asyncpg

from api.scenario_parse import parse_json_value, parse_latlng_route, parse_start_coordinate

_VALID_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _qi(name: str) -> str:
    if not _VALID_IDENT.match(name):
        raise ValueError(f"Invalid SQL identifier: {name!r}")
    return f'"{name.replace(chr(34), chr(34) + chr(34))}"'


def _table(env_key: str) -> str:
    return _qi(os.environ.get(env_key, _DEFAULTS[env_key]))


_DEFAULTS = {
    "VTS_TBL_SCENARIO": "Scenario",
    "VTS_TBL_SHIP": "Ship",
    "VTS_TBL_INTENTION": "Intention",
    "VTS_TBL_EVENT": "Event",
    "VTS_SHIP_SCENARIO_COL": "scenario_id",
}


class ScenarioService:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def list_scenarios(self) -> list[dict[str, Any]]:
        t = _table("VTS_TBL_SCENARIO")
        rows = await self.pool.fetch(
            f"""
            SELECT id, name, description, {_qi("time")} AS duration_seconds, sector_id, start_coordinate
            FROM {t}
            ORDER BY id
            """
        )
        return [self._serialize_scenario_row(r) for r in rows]

    async def get_scenario(self, scenario_id: int) -> dict[str, Any] | None:
        t = _table("VTS_TBL_SCENARIO")
        row = await self.pool.fetchrow(
            f"""
            SELECT id, name, description, {_qi("time")} AS duration_seconds, sector_id, start_coordinate
            FROM {t} WHERE id = $1
            """,
            scenario_id,
        )
        if not row:
            return None
        return self._serialize_scenario_row(row)

    def _serialize_scenario_row(self, row: asyncpg.Record) -> dict[str, Any]:
        start = parse_start_coordinate(row["start_coordinate"])
        return {
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "duration_seconds": row["duration_seconds"],
            "sector_id": row["sector_id"],
            "start_coordinate": start,
        }

    async def get_ships_for_scenario(self, scenario_id: int) -> list[dict[str, Any]]:
        st = _table("VTS_TBL_SHIP")
        fk = os.environ.get("VTS_SHIP_SCENARIO_COL", _DEFAULTS["VTS_SHIP_SCENARIO_COL"])
        if not _VALID_IDENT.match(fk):
            raise ValueError("Invalid VTS_SHIP_SCENARIO_COL")
        rows = await self.pool.fetch(
            f"""
            SELECT id, name, nationality, markertype, shiptype, destination, cargo,
                   aisactive, aisstatus, speed, route, operatornotes, scenario_id, intentions_share_time, intentions_show_complete, intentions_show_active
            FROM {st}
            WHERE {_qi(fk)} = $1
            ORDER BY id
            """,
            scenario_id,
        )
        out: list[dict[str, Any]] = []
        for r in rows:
            waypoints = parse_latlng_route(r["route"])
            notes = parse_json_value(r["operatornotes"])
            if not isinstance(notes, list):
                notes = []
            out.append(
                {
                    "id": r["id"],
                    "name": r["name"],
                    "nationality": r["nationality"],
                    "markerType": (r["markertype"] or "triangle").lower(),
                    "shipType": r["shiptype"],
                    "destination": r["destination"],
                    "cargo": r["cargo"],
                    "aisActive": bool(r["aisactive"]),
                    "aisStatus": r["aisstatus"],
                    "speed": float(r["speed"]) if r["speed"] is not None else 0.0,
                    "waypoints": waypoints,
                    "operatorNotes": notes,
                    "scenarioId": r["scenario_id"],
                    "intentionsShareTime": int(r["intentions_share_time"]) if r["intentions_share_time"] is not None else 10,
                    "intentionsShowComplete": bool(r["intentions_show_complete"]),
                    "intentionsShowActive" : bool(r["intentions_show_active"])
                }
            )
        return out

    async def get_intentions_for_scenario(self, scenario_id: int) -> dict[str, list[dict[str, Any]]]:
        st = _table("VTS_TBL_SHIP")
        it = _table("VTS_TBL_INTENTION")
        fk = os.environ.get("VTS_SHIP_SCENARIO_COL", _DEFAULTS["VTS_SHIP_SCENARIO_COL"])
        if not _VALID_IDENT.match(fk):
            raise ValueError("Invalid VTS_SHIP_SCENARIO_COL")
        rows = await self.pool.fetch(
            f"""
            SELECT i.id, i.ship_id, i.intention_route, i.name, i.description
            FROM {it} i
            JOIN {st} s ON s.id = i.ship_id
            WHERE s.{_qi(fk)} = $1
            ORDER BY i.id
            """,
            scenario_id,
        )
        by_ship: dict[str, list[dict[str, Any]]] = {}
        for r in rows:
            sid = str(r["ship_id"])
            route = parse_latlng_route(r["intention_route"])
            by_ship.setdefault(sid, []).append(
                {
                    "id": r["id"],
                    "name": r["name"],
                    "description": r["description"],
                    "route": route,
                }
            )
        return by_ship

    async def get_events_for_scenario(self, scenario_id: int) -> list[dict[str, Any]]:
        et = _table("VTS_TBL_EVENT")
        rows = await self.pool.fetch(
            f"""
            SELECT id, scenario_id, type, subject_type, subject_id, trigger_time
            FROM {et}
            WHERE scenario_id = $1
            ORDER BY trigger_time ASC, id ASC
            """,
            scenario_id,
        )
        return [
            {
                "id": r["id"],
                "type": r["type"],
                "subject_type": r["subject_type"],
                "subject_id": r["subject_id"],
                "trigger_time": float(r["trigger_time"])
                if r["trigger_time"] is not None
                else 0.0,
            }
            for r in rows
        ]

    async def get_scenario_bundle(self, scenario_id: int) -> dict[str, Any] | None:
        scenario = await self.get_scenario(scenario_id)
        if not scenario:
            return None
        ships = await self.get_ships_for_scenario(scenario_id)
        intentions = await self.get_intentions_for_scenario(scenario_id)
        events = await self.get_events_for_scenario(scenario_id)

         # Merge intentions into their respective ships
        for ship in ships:
            ship_id = str(ship["id"])
            ship["intentions"] = [intention["route"] for intention in intentions.get(ship_id, [])]

        return {
            "scenario": scenario,
            "ships": ships,
            "intentions_by_ship_id": intentions,
            "events": events,
        }
