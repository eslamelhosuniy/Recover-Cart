from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.core.logging_config import setup_logging
from app.core.exceptions import AppException, app_exception_handler, global_exception_handler
from app.jobs.scheduler import start_scheduler, shutdown_scheduler
from app.controllers import routers
from app.config import settings
import asyncio
from app.jobs.sync_sendgrid_job import run_sync_sendgrid_job

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    # If running in production, trigger a one-time SendGrid heavy sync on startup
    try:
        if settings.app_env == "production":
            asyncio.create_task(run_sync_sendgrid_job())
    except Exception:
        # Don't fail startup for non-critical background job errors
        pass

    yield
    shutdown_scheduler()

def create_app() -> FastAPI:
    setup_logging()

    # Restrict docs to non-production environments
    docs_url = "/api/docs" if settings.app_env != "production" else None
    redoc_url = "/api/redoc" if settings.app_env != "production" else None

    app = FastAPI(
        title="Recover Cart API",
        description="Automated abandoned cart recovery system",
        version="1.0.0",
        docs_url=docs_url,
        redoc_url=redoc_url,
        lifespan=lifespan
    )

    # CORS: restrict to frontend origin in production
    allowed_origins = (
        settings.allowed_origins
        if settings.app_env == "production"
        else ["*"]
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Salla-Signature", "X-Store-ID"],
    )

    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(Exception, global_exception_handler)

    for router in routers:
        app.include_router(router)

    @app.get("/health")
    async def health_check():
        # Don't expose environment info publicly
        return {"status": "ok"}

    from app.core.spa import setup_spa
    setup_spa(app)

    return app


app = create_app()
