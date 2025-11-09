"""
Rate limiting middleware
Protects API endpoints from abuse
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Create limiter instance - limits based on IP address
limiter = Limiter(key_func=get_remote_address)

# Usage in routes:
# from app.middleware.rate_limit import limiter
#
# @router.post("/upload")
# @limiter.limit("30/minute")  # 30 requests per minute per IP
# async def upload(request: Request):
#     ...
