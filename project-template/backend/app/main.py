"""
FastAPI application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.middleware.rate_limit import limiter
from app.api import example
from app.db.database import init_db

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Production-ready FastAPI template",
    version="1.0.0",
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc",  # ReDoc
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Include routers
app.include_router(
    example.router,
    prefix=f"{settings.API_V1_STR}",
    tags=["example"],
)

# TODO: Include your routers here
# app.include_router(
#     your_router,
#     prefix=f"{settings.API_V1_STR}/your-prefix",
#     tags=["your-tag"],
# )


@app.on_event("startup")
async def startup_event():
    """Initialize resources on startup"""
    # Initialize database tables
    # TODO: Use Alembic for production migrations
    init_db()
    print(f"✅ {settings.APP_NAME} started successfully")
    print(f"📖 API Docs: http://localhost:8000/docs")


@app.get("/health")
async def health_check():
    """
    Health check endpoint
    Used by Docker, Kubernetes, load balancers, etc.
    """
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "docs": "/docs",
        "health": "/health",
    }
