"""CLI equivalent to POST /api/verifications/bootstrap (fills missing Verification rows)."""

import asyncio
import os
import sys

from dotenv import load_dotenv

from api.service import VerificationService


async def _run() -> None:
    load_dotenv()
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("DATABASE_URL is missing. Add it in your .env file.", file=sys.stderr)
        raise SystemExit(1)
    pool = await VerificationService.create_pool(dsn)
    svc = VerificationService(pool)
    await svc.load_verification_columns()
    try:
        result = await svc.bootstrap_verifications()
    finally:
        await pool.close()
    print(
        f"Bootstrap done. Total ships: {result['totalShips']}, "
        f"inserted: {result['inserted']}, skipped: {result['skipped']}"
    )


def main() -> None:
    asyncio.run(_run())


if __name__ == "__main__":
    main()
