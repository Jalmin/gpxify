"""
Application configuration using Pydantic Settings
Loads configuration from environment variables
"""
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Application
    APP_NAME: str = "FastAPI Template"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # CORS - Supports comma-separated string OR list
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        """Parse comma-separated string to list"""
        if isinstance(v, str):
            if not v or v.strip() == "":
                return []
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # Database
    # TODO: Update with your database URL
    DATABASE_URL: str = "postgresql://user:password@db:5432/dbname"

    # Security
    # TODO: Generate with: openssl rand -hex 32
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"

    # TODO: Add your custom settings here
    # Example:
    # MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    # UPLOAD_DIR: str = "./uploads"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# TODO: Add initialization code if needed
# Example:
# import os
# os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
