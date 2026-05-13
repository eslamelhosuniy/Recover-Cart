from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.core.logging_config import setup_logging
from app.core.exceptions import AppException, app_exception_handler, global_exception_handler
from app.jobs.scheduler import start_scheduler, shutdown_scheduler
from app.controllers import routers

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    shutdown_scheduler()

def create_app() -> FastAPI:
    setup_logging()
    
    app = FastAPI(
        title="Recover Cart API",
        description="Automated abandoned cart recovery system",
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        lifespan=lifespan
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(Exception, global_exception_handler)

    for router in routers:
        app.include_router(router)

    @app.get("/health")
    async def health_check():
        return {"status": "ok", "env": settings.app_env}

    return app

app = create_app()
