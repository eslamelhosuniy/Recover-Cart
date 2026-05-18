import os
from fastapi import FastAPI
from starlette.exceptions import HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.requests import Request
import logging

logger = logging.getLogger(__name__)

class SPAStaticFiles(StaticFiles):
    """
    Custom StaticFiles class to handle Single Page Application routing.
    If a file is not found, it returns index.html instead of a 404 error,
    allowing the frontend router (e.g. React Router) to handle the path.
    """
    def lookup_path(self, path: str):
        full_path, stat_result = super().lookup_path(path)
        # If file not found and it's not an API route, serve index.html
        if stat_result is None and not path.startswith("api/"):
            index_path = os.path.join(self.directory, "index.html")
            if os.path.exists(index_path):
                return index_path, os.stat(index_path)
        return full_path, stat_result

def setup_spa(app: FastAPI):
    """
    Sets up the Single Page Application (SPA) static file serving.
    It expects the built frontend files to be located in the 'frontend/dist' directory.
    """
    # backend/app/core/spa.py
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # 1. Try looking inside backend (for production deployment)
    frontend_dist = os.path.join(backend_dir, "frontend_dist")
    
    # 2. Fallback to looking in the parent workspace (for local development)
    if not os.path.exists(frontend_dist):
        workspace_dir = os.path.dirname(backend_dir)
        frontend_dist = os.path.join(workspace_dir, "frontend", "dist")

    if os.path.exists(frontend_dist):
        logger.info(f"Mounting SPA frontend from {frontend_dist}")
        # Mount the entire dist folder at root "/" using the custom SPA static files handler.
        # Ensure it's mounted AFTER all API routes so it acts as a catch-all for unknown routes.
        app.mount("/", SPAStaticFiles(directory=frontend_dist, html=True), name="frontend")
    else:
        logger.warning(
            f"Frontend build directory not found at {frontend_dist}. "
            "Please run 'npm run build' in the frontend directory. SPA will not be served."
        )
