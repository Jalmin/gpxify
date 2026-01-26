"""
Application configuration settings
"""
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import field_validator, ValidationError
import os
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Application
    APP_NAME: str = "GPXIFY"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # CORS
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            if not v or v.strip() == "":
                return []
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # Google OAuth (optional for now)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    # Security - REQUIRED in production
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Database - REQUIRED
    DATABASE_URL: str = "postgresql://gpxify:gpxify_dev_password_123@db:5432/gpxify"

    # Upload
    MAX_UPLOAD_SIZE: int = 26214400  # 25MB
    UPLOAD_DIR: str = "./uploads"

    # SMTP Settings (optional - for contact form)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    CONTACT_EMAIL: str = "contact@gpx.ninja"

    # PTP (Profile to Print) - Admin settings
    ANTHROPIC_API_KEY: str = ""  # For Claude API (ravito table parsing)
    ADMIN_SECRET_URL: str = "ptp-admin-secret"  # Secret URL segment for admin access
    ADMIN_PASSWORD_HASH: str = ""  # bcrypt hash of admin password

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v, info):
        """Validate SECRET_KEY is set in production"""
        if info.data.get("ENVIRONMENT") == "production":
            if v == "your-secret-key-here-change-in-production" or len(v) < 32:
                raise ValueError(
                    "SECRET_KEY must be set to a secure value (min 32 chars) in production. "
                    "Generate one with: openssl rand -hex 32"
                )
        return v

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v, info):
        """Validate DATABASE_URL is set"""
        if not v:
            raise ValueError("DATABASE_URL is required")
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True


def load_settings() -> Settings:
    """
    Load and validate settings with error handling

    Raises detailed errors for missing required environment variables
    """
    try:
        settings = Settings()
        logger.info(f"✓ Configuration loaded successfully (environment: {settings.ENVIRONMENT})")

        # Log warnings for missing optional settings
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            logger.warning("⚠ SMTP credentials not configured - contact form will work in dev mode only")

        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            logger.info("ℹ Google OAuth not configured - OAuth features disabled")

        if not settings.ANTHROPIC_API_KEY:
            logger.warning("⚠ ANTHROPIC_API_KEY not configured - ravito table parsing disabled")

        return settings
    except ValidationError as e:
        logger.error("❌ Configuration validation failed:")
        for error in e.errors():
            field = " -> ".join(str(x) for x in error["loc"])
            message = error["msg"]
            logger.error(f"  • {field}: {message}")
        raise


settings = load_settings()

# Create upload directory if it doesn't exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
