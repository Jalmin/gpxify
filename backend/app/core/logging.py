"""
Centralized logging configuration for the application
"""
import logging
import sys
from pathlib import Path
from typing import Optional
from logging.handlers import RotatingFileHandler

from app.core.config import settings


# Log format
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
JSON_FORMAT = '{"time": "%(asctime)s", "name": "%(name)s", "level": "%(levelname)s", "message": "%(message)s"}'


def get_log_level() -> int:
    """Get log level based on environment"""
    if settings.ENVIRONMENT == "production":
        return logging.INFO
    elif settings.DEBUG:
        return logging.DEBUG
    else:
        return logging.INFO


def setup_logging(
    log_dir: Optional[str] = None,
    log_file: str = "gpxify.log",
    max_bytes: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 5,
    use_json: bool = False
) -> logging.Logger:
    """
    Setup centralized logging configuration

    Args:
        log_dir: Directory for log files (None = logs/ in project root)
        log_file: Log file name
        max_bytes: Maximum size of each log file before rotation
        backup_count: Number of backup files to keep
        use_json: Use JSON format for structured logging

    Returns:
        Root logger instance
    """
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(get_log_level())

    # Clear existing handlers to avoid duplicates
    root_logger.handlers.clear()

    # Choose format
    log_format = JSON_FORMAT if use_json else LOG_FORMAT
    formatter = logging.Formatter(log_format)

    # Console handler (always enabled)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(get_log_level())
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # File handler (only in production or if explicitly requested)
    if settings.ENVIRONMENT == "production" or log_dir is not None:
        if log_dir is None:
            log_dir = "logs"

        # Create log directory if it doesn't exist
        log_path = Path(log_dir)
        log_path.mkdir(parents=True, exist_ok=True)

        # Rotating file handler
        file_handler = RotatingFileHandler(
            log_path / log_file,
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding='utf-8'
        )
        file_handler.setLevel(logging.INFO)  # Always INFO for files
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)

    return root_logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for a module

    Args:
        name: Logger name (usually __name__)

    Returns:
        Logger instance

    Example:
        logger = get_logger(__name__)
        logger.info("Processing GPX file")
    """
    return logging.getLogger(name)


# Setup logging on module import
logger = setup_logging(
    use_json=(settings.ENVIRONMENT == "production")
)

# Log startup message
logger.info(f"🚀 GPX Ninja starting (environment: {settings.ENVIRONMENT}, log level: {logging.getLevelName(get_log_level())})")
