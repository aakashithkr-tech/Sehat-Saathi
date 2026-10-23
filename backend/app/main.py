import logging
from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi import HTTPException
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .database import SessionLocal, init_db
from .routers import contact, facilities, guidance, health, resources
from .seed import seed_facilities_if_empty, seed_samples_if_empty, seed_verified_resources

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("sehat")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    init_db()
    with SessionLocal() as db:
        if settings.seed_verified_data:
            nv = seed_verified_resources(db)
            if nv:
                log.info("Loaded %d VERIFIED healthcare resources and helplines.", nv)
        if settings.seed_sample_data:
            ns = seed_samples_if_empty(db)
            if ns:
                log.warning("Loaded %d SAMPLE resources. Replace them with verified data before real use.", ns)
            nf = seed_facilities_if_empty(db)
            if nf:
                log.info("Loaded %d sample healthcare facilities.", nf)
    if not settings.email_configured:
        log.info("SMTP not configured: contact messages are stored but no email is sent.")
    if settings.ai_configured:
        log.info("AI guidance synthesis enabled (model: %s).", settings.gemini_model)
    else:
        log.info("AI guidance synthesis not configured: deterministic clinical safety and knowledge retrieval active.")
    yield



def _friendly(e: dict) -> str:
    t, ctx = e.get("type", ""), e.get("ctx", {}) or {}
    if t == "missing":
        return "This field is required."
    if t == "string_too_short":
        n = ctx.get("min_length", 1)
        return "This field is required." if n <= 1 else f"Please write at least {n} characters."
    if t == "string_too_long":
        return f"Please use {ctx.get('max_length')} characters or fewer."
    if "email" in str(e.get("msg", "")).lower():
        return "Enter a valid email address, like name@example.com."
    if t == "extra_forbidden":
        return "This field is not accepted."
    return str(e.get("msg", "Invalid value")).removeprefix("Value error, ")


def create_app() -> FastAPI:
    settings = get_settings()
    docs = None if settings.is_production else "/docs"
    app = FastAPI(
        title="Sehat Saathi API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url=docs,
        redoc_url=None,
        openapi_url=None if settings.is_production else "/openapi.json",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Accept"],
        allow_credentials=False,
    )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_: Request, exc: RequestValidationError):
        fields: dict[str, str] = {}
        for e in exc.errors():
            raw_loc = list(e.get("loc", ()))
            if raw_loc and raw_loc[0] in ("body", "query", "path", "header"):
                raw_loc = raw_loc[1:]
            loc = [str(p) for p in raw_loc]
            key = loc[-1] if loc else "request"
            fields.setdefault(key, _friendly(e))
        return JSONResponse({"detail": "Some fields need attention.", "fields": fields}, status_code=422)


    @app.exception_handler(Exception)
    async def unhandled(_: Request, exc: Exception):
        log.error("unhandled error: %s", type(exc).__name__, exc_info=exc)
        return JSONResponse({"detail": "Something went wrong on our side. Please try again later."}, status_code=500)

    app.include_router(health.router)
    app.include_router(contact.router)
    app.include_router(resources.router)
    app.include_router(guidance.router)
    app.include_router(facilities.router)
    # Mount frontend static files if production build exists
    root_dist = Path(__file__).resolve().parent.parent.parent / "dist"
    backend_dist = Path(__file__).resolve().parent.parent / "dist"
    frontend_dist = root_dist if root_dist.exists() else backend_dist
    index_file = frontend_dist / "index.html"

    if frontend_dist.exists() and index_file.exists():
        assets_dir = frontend_dist / "assets"
        if assets_dir.exists():
            app.mount(
                "/assets",
                StaticFiles(directory=assets_dir),
                name="frontend-assets",
            )

        @app.get("/", include_in_schema=False)
        async def frontend_home():
            return FileResponse(index_file)

        @app.get("/{full_path:path}", include_in_schema=False)
        async def frontend_routes(full_path: str):
            if full_path.startswith(("api/", "api")) or full_path in {"docs", "openapi.json", "redoc"}:
                raise HTTPException(status_code=404, detail="Not Found")

            requested_file = (frontend_dist / full_path).resolve()
            if (
                full_path
                and requested_file.is_file()
                and requested_file.is_relative_to(frontend_dist.resolve())
            ):
                return FileResponse(requested_file)

            return FileResponse(index_file)

    return app



app = create_app()
