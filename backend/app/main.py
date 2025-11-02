"""
FastAPI main application entry point
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.api import gpx, share, race_recovery
from app.db.database import init_db
from app.middleware.rate_limit import limiter, rate_limit_exceeded_handler

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="GPX file analysis and visualization API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add rate limiter to app state
app.state.limiter = limiter

# Add rate limit exceeded handler
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database tables on application startup"""
    init_db()

# Include routers
app.include_router(
    gpx.router,
    prefix=f"{settings.API_V1_STR}/gpx",
    tags=["gpx"],
)

app.include_router(
    share.router,
    prefix=f"{settings.API_V1_STR}/share",
    tags=["share"],
)

app.include_router(
    race_recovery.router,
    prefix=f"{settings.API_V1_STR}/race",
    tags=["race"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "app": settings.APP_NAME}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
