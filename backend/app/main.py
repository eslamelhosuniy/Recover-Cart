from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.config import settings
from app.core.logging_config import setup_logging
from app.core.exceptions import AppException, app_exception_handler, global_exception_handler
from app.controllers.webhook_controller import router as webhook_router
from app.controllers.dashboard_controller import router as dashboard_router
from app.controllers.customer_controller import router as customer_router
from app.controllers.cart_controller import router as cart_router
from app.controllers.message_controller import router as message_router
from app.controllers.settings_controller import router as settings_router
from app.controllers.logs_controller import router as logs_router
from app.jobs.scheduler import start_scheduler, shutdown_scheduler

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

    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(Exception, global_exception_handler)

    app.include_router(webhook_router)
    app.include_router(dashboard_router)
    app.include_router(customer_router)
    app.include_router(cart_router)
    app.include_router(message_router)
    app.include_router(settings_router)
    app.include_router(logs_router)

    @app.get("/health")
    async def health_check():
        return {"status": "ok", "env": settings.app_env}

    return app

app = create_app()
