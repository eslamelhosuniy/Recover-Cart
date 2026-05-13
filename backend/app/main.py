from fastapi import FastAPI
from app.config import settings
from app.core.logging_config import setup_logging
from app.core.exceptions import AppException, app_exception_handler, global_exception_handler

def create_app() -> FastAPI:
    setup_logging()
    
    app = FastAPI(
        title="Recover Cart API",
        description="Automated abandoned cart recovery system",
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
    )

    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(Exception, global_exception_handler)

    @app.get("/health")
    async def health_check():
        return {"status": "ok", "env": settings.app_env}

    return app

app = create_app()
