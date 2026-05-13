import os
import sys
from contextlib import asynccontextmanager
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from api.service import VerificationService

load_dotenv()

svc: VerificationService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global svc
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("DATABASE_URL is missing. Add it in your .env file.", file=sys.stderr)
        raise SystemExit(1)
    pool = await VerificationService.create_pool(dsn)
    svc = VerificationService(pool)
    await svc.load_verification_columns()
    try:
        yield
    finally:
        await pool.close()
        svc = None


app = FastAPI(title="VTS Verification API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _service() -> VerificationService:
    if svc is None:
        raise HTTPException(503, "Service not ready")
    return svc


@app.get("/api/verifications")
async def get_verifications() -> list[dict[str, Any]]:
    try:
        return await _service().list_verifications()
    except Exception as e:
        print("Failed to fetch verifications:", e, file=sys.stderr)
        raise HTTPException(500, "Failed to fetch verifications") from e


@app.patch("/api/verifications/{ship_id}")
async def patch_verification(ship_id: str, body: dict[str, Any]) -> dict[str, Any]:
    if "verified" not in body and "destination" not in body:
        raise HTTPException(400, "No updates provided.")

    kwargs: dict[str, Any] = {}
    if "verified" in body:
        kwargs["verified"] = body["verified"]
    if "destination" in body:
        kwargs["destination"] = body["destination"]

    try:
        return await _service().patch_verification(ship_id, **kwargs)
    except ValueError as e:
        msg = str(e)
        if msg.startswith("Unknown ship id"):
            raise HTTPException(400, msg) from e
        if "No writable columns" in msg:
            raise HTTPException(400, msg) from e
        raise HTTPException(400, msg) from e
    except RuntimeError as e:
        raise HTTPException(500, str(e)) from e
    except Exception as e:
        print("Failed to update verification:", e, file=sys.stderr)
        raise HTTPException(500, "Failed to update verification") from e


@app.post("/api/verifications/bootstrap")
async def bootstrap_verifications() -> dict[str, int]:
    try:
        return await _service().bootstrap_verifications()
    except RuntimeError as e:
        raise HTTPException(500, str(e)) from e
    except Exception as e:
        print("Failed to bootstrap verifications:", e, file=sys.stderr)
        raise HTTPException(500, "Failed to bootstrap verifications") from e


def main() -> None:
    import uvicorn

    port = int(os.environ.get("PORT", "3001"))
    uvicorn.run(app, host="127.0.0.1", port=port)


if __name__ == "__main__":
    main()
