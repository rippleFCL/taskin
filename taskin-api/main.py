import os
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from db_init import initialize_database
from routes import router
import structlog

# Configure logging
log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
environment = os.environ.get("ENV", "prod").lower()
# Map textual levels to numeric for structlog filtering without importing logging
_LEVELS = {
    "CRITICAL": 50,
    "ERROR": 40,
    "WARNING": 30,
    "INFO": 20,
    "DEBUG": 10,
}
if environment == "dev":
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=False),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.ExceptionRenderer(),
        structlog.dev.ConsoleRenderer(),
    ]
else:
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=False),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.ExceptionRenderer(structlog.tracebacks.ExceptionDictTransformer()),
        structlog.processors.JSONRenderer(sort_keys=True),
    ]

structlog.configure_once(
    processors=processors,
    logger_factory=structlog.PrintLoggerFactory(),
    wrapper_class=structlog.make_filtering_bound_logger(_LEVELS.get(log_level, 20)),
    cache_logger_on_first_use=True,
)
logger = structlog.stdlib.get_logger().bind(module="server")


# Initialize database on startup
initialize_database()

# Create FastAPI app
api = FastAPI(title="Taskin API", description="A simple todo API with categories and SQLite storage", version="0.1.0")

# Configure CORS
api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Modify this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
api.include_router(router, prefix="/api", tags=["todos"])


@api.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if os.path.exists("static"):
    api.mount("/assets", StaticFiles(directory="static/assets", html=True), name="static")

    @api.get("/{full_path:path}")
    async def catch_all(full_path: str, accept: str = Header(default="")):
        if accept and "text/html" not in accept:
            return HTTPException(status_code=404, detail="Not Found")
        return FileResponse("static/index.html")
else:
    logger.warning("Static directory 'static/assets' does not exist.")
