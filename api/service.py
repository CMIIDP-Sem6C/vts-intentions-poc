import ssl
from typing import Any

import asyncpg

from api.mock_ships import MOCK_SHIPS

_MISSING = object()


def quote_identifier(identifier: str) -> str:
    return f'"{identifier.replace(chr(34), chr(34) + chr(34))}"'


def _ssl_context() -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


class VerificationService:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool
        self.columns: list[str] = []
        self.ship_id_data_type = "text"

    @staticmethod
    async def create_pool(dsn: str) -> asyncpg.Pool:
        return await asyncpg.create_pool(
            dsn,
            ssl=_ssl_context(),
            min_size=1,
            max_size=10,
        )

    async def load_verification_columns(self) -> None:
        rows = await self.pool.fetch(
            """
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'Verification'
            ORDER BY ordinal_position
            """
        )
        self.columns = [r["column_name"] for r in rows]
        ship_meta = next(
            (r for r in rows if r["column_name"].lower() == "ship_id"),
            None,
        )
        self.ship_id_data_type = ship_meta["data_type"] if ship_meta else "text"

    def _get_column_by_name(self, name: str) -> str | None:
        lower = name.lower()
        for col in self.columns:
            if col.lower() == lower:
                return col
        return None

    def _is_numeric_ship_id_column(self) -> bool:
        return self.ship_id_data_type in ("integer", "bigint", "smallint")

    def _app_ship_ids(self) -> list[str]:
        return [s["id"] for s in MOCK_SHIPS]

    def _get_db_ship_id_for_app_ship_id(self, app_ship_id: str) -> Any:
        if not self._is_numeric_ship_id_column():
            return app_ship_id
        s = str(app_ship_id).strip()
        if s.isdigit():
            return int(s)
        index = self._app_ship_ids().index(app_ship_id) if app_ship_id in self._app_ship_ids() else -1
        if index == -1:
            return None
        return index + 1

    def _get_app_ship_id_from_db_ship_id(self, db_ship_id: Any) -> str | None:
        if not self._is_numeric_ship_id_column():
            return str(db_ship_id)
        return str(int(db_ship_id))

    def _row_as_dict(self, row: asyncpg.Record) -> dict[str, Any]:
        return {k: row[k] for k in row.keys()}

    def normalize_row(self, row: asyncpg.Record) -> dict[str, Any]:
        d = self._row_as_dict(row)
        id_col = self._get_column_by_name("id")
        ship_id_col = self._get_column_by_name("ship_id")
        verified_col = self._get_column_by_name("verified")
        destination_col = self._get_column_by_name("destination")

        raw_ship = d.get(ship_id_col) if ship_id_col else None
        app_ship = self._get_app_ship_id_from_db_ship_id(raw_ship) if ship_id_col and raw_ship is not None else None

        return {
            "id": d.get(id_col) if id_col else None,
            "ship_id": app_ship,
            "verified": bool(d.get(verified_col)) if verified_col else False,
            "destination": d.get(destination_col) if destination_col else None,
        }

    async def list_verifications(self) -> list[dict[str, Any]]:
        rows = await self.pool.fetch('SELECT * FROM "Verification"')
        out = [self.normalize_row(r) for r in rows]
        return [r for r in out if r.get("ship_id")]

    async def patch_verification(
        self,
        app_ship_id: str,
        *,
        verified: Any = _MISSING,
        destination: Any = _MISSING,
    ) -> dict[str, Any]:
        ship_id = self._get_db_ship_id_for_app_ship_id(app_ship_id)
        if ship_id is None:
            raise ValueError(f"Unknown ship id: {app_ship_id}")

        ship_id_column = self._get_column_by_name("ship_id")
        verified_column = self._get_column_by_name("verified")
        destination_column = self._get_column_by_name("destination")

        if not ship_id_column or not verified_column:
            raise RuntimeError("Verification table is missing required columns.")

        update_parts: list[str] = []
        update_values: list[Any] = []
        param = 1

        if verified is not _MISSING:
            update_parts.append(f"{quote_identifier(verified_column)} = ${param}")
            update_values.append(bool(verified))
            param += 1
        if destination is not _MISSING and destination_column:
            update_parts.append(f"{quote_identifier(destination_column)} = ${param}")
            update_values.append(destination)
            param += 1

        if not update_parts:
            raise ValueError("No writable columns were provided.")

        update_values.append(ship_id)
        ship_id_param = f"${param}"

        update_sql = f"""
            UPDATE "Verification"
            SET {", ".join(update_parts)}
            WHERE {quote_identifier(ship_id_column)} = {ship_id_param}
            RETURNING *
        """
        row = await self.pool.fetchrow(update_sql, *update_values)
        if row:
            return self.normalize_row(row)

        insert_verified = bool(verified) if verified is not _MISSING else False
        insert_columns = [quote_identifier(ship_id_column), quote_identifier(verified_column)]
        insert_values: list[Any] = [ship_id, insert_verified]
        insert_params = ["$1", "$2"]

        if destination_column:
            insert_columns.append(quote_identifier(destination_column))
            insert_dest = destination if destination is not _MISSING else None
            insert_values.append(insert_dest)
            insert_params.append(f"${len(insert_values)}")

        insert_sql = f"""
            INSERT INTO "Verification" ({", ".join(insert_columns)})
            VALUES ({", ".join(insert_params)})
            RETURNING *
        """
        row = await self.pool.fetchrow(insert_sql, *insert_values)
        if not row:
            raise RuntimeError("Insert returned no row")
        return self.normalize_row(row)

    async def bootstrap_verifications(self) -> dict[str, int]:
        ship_id_column = self._get_column_by_name("ship_id")
        verified_column = self._get_column_by_name("verified")
        destination_column = self._get_column_by_name("destination")

        if not ship_id_column or not verified_column:
            raise RuntimeError(
                "Verification table is missing required columns: ship_id and verified."
            )

        inserted = 0
        skipped = 0

        for ship in MOCK_SHIPS:
            db_ship_id = self._get_db_ship_id_for_app_ship_id(ship["id"])
            if db_ship_id is None:
                skipped += 1
                continue

            exists = await self.pool.fetchval(
                f"""
                SELECT 1
                FROM "Verification"
                WHERE {quote_identifier(ship_id_column)} = $1
                LIMIT 1
                """,
                db_ship_id,
            )
            if exists:
                skipped += 1
                continue

            insert_columns = [quote_identifier(ship_id_column), quote_identifier(verified_column)]
            insert_values: list[Any] = [db_ship_id, False]
            insert_params = ["$1", "$2"]

            if destination_column:
                insert_columns.append(quote_identifier(destination_column))
                dest = None if ship["destination"] == "Unknown" else ship["destination"]
                insert_values.append(dest)
                insert_params.append(f"${len(insert_values)}")

            await self.pool.execute(
                f"""
                INSERT INTO "Verification" ({", ".join(insert_columns)})
                VALUES ({", ".join(insert_params)})
                """,
                *insert_values,
            )
            inserted += 1

        return {
            "totalShips": len(MOCK_SHIPS),
            "inserted": inserted,
            "skipped": skipped,
        }
