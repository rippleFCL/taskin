import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from db_init import initialize_database
from api import categories, todos, oneoffs, dependencies, reports, reset, events
from notifier_service import notifier
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


# Lifespan context manager for startup and shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan - startup and shutdown."""
    # Startup
    initialize_database()

    # Start the notifier service in the background
    notifier_task = asyncio.create_task(notifier.run())
    logger.info("Background notifier service started")

    yield

    # Shutdown
    notifier.stop()
    notifier_task.cancel()
    try:
        await notifier_task
    except asyncio.CancelledError:
        pass
    logger.info("Background notifier service stopped")


# Create FastAPI app with lifespan
api = FastAPI(
    title="Taskin API",
    description="A simple todo API with categories and SQLite storage",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS
api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Modify this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers from api submodules
api.include_router(categories.router, prefix="/api", tags=["categories"])
api.include_router(todos.router, prefix="/api", tags=["todos"])
api.include_router(oneoffs.router, prefix="/api", tags=["oneoffs"])
api.include_router(dependencies.router, prefix="/api", tags=["dependencies"])
api.include_router(reports.router, prefix="/api", tags=["reports"])
api.include_router(reset.router, prefix="/api", tags=["reset"])
api.include_router(events.router, prefix="/api", tags=["events"])

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
