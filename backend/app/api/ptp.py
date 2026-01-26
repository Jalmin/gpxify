"""
PTP (Profile to Print) public API endpoints
"""
from fastapi import APIRouter, Request
from app.models.ptp import GetSunTimesRequest, GetSunTimesResponse
from app.services.ptp_service import PTPService
from app.middleware.rate_limit import limiter
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/sun-times", response_model=GetSunTimesResponse)
@limiter.limit("30/minute")
async def get_sun_times(request: Request, body: GetSunTimesRequest):
    """
    Get sunrise/sunset times for a location and dates

    Uses the sunrise-sunset.org API to fetch accurate sun times
    based on the race location and departure date(s).

    Args:
        lat: Latitude of the location
        lon: Longitude of the location
        dates: List of ISO date strings (YYYY-MM-DD)

    Returns:
        List of SunTimes with sunrise, sunset, and twilight times
    """
    try:
        sun_times = await PTPService.get_sun_times(
            lat=body.lat,
            lon=body.lon,
            dates=body.dates
        )

        return GetSunTimesResponse(success=True, sun_times=sun_times)

    except Exception as e:
        logger.error(f"Error fetching sun times: {e}")
        return GetSunTimesResponse(
            success=False,
            error="Failed to fetch sun times"
        )
