"""
GPX file upload and analysis API endpoints
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from app.models.gpx import (
    GPXUploadResponse,
    GPXData,
    ExportSegmentRequest,
    ClimbSegment,
    MergeGPXRequest,
    MergeGPXResponse,
    GPXFileInput,
    AidStationTableRequest,
    AidStationTableResponse,
)
from app.services.gpx_parser import GPXParser
from app.core.config import settings
from app.middleware.rate_limit import limiter
from typing import List
import uuid
import os

router = APIRouter()


@router.post("/upload", response_model=GPXUploadResponse)
@limiter.limit("30/minute")  # 30 uploads per minute per IP
async def upload_gpx(request: Request, file: UploadFile = File(...)):
    """
    Upload and parse a GPX file

    Args:
        file: GPX file upload

    Returns:
        Parsed GPX data with tracks and statistics
    """
    # Validate file type
    if not file.filename.lower().endswith(".gpx"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only .gpx files are allowed",
        )

    # Check file size
    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB",
        )

    try:
        # Parse GPX content
        content_str = contents.decode("utf-8")
        gpx_data = GPXParser.parse_gpx_file(content_str, file.filename)

        # Save file (optional, for Phase 1 we keep it in memory)
        # In Phase 2, we'll upload to Google Drive
        file_id = str(uuid.uuid4())

        # Optionally save to local uploads directory
        if settings.DEBUG:
            file_path = os.path.join(settings.UPLOAD_DIR, f"{file_id}.gpx")
            with open(file_path, "wb") as f:
                f.write(contents)

        return GPXUploadResponse(
            success=True,
            message="GPX file uploaded and parsed successfully",
            data=gpx_data,
            file_id=file_id,
        )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error parsing GPX file: {str(e)}",
        )


@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify API is running"""
    return {"message": "GPX API is running", "version": "1.0.0"}


@router.post("/export-segment")
async def export_segment(request: ExportSegmentRequest):
    """
    Export a segment of a GPX track as a downloadable .gpx file

    Args:
        request: Export segment request with track points and segment range

    Returns:
        GPX file as downloadable attachment
    """
    try:
        # Generate GPX XML from segment
        gpx_xml = GPXParser.generate_gpx_from_segment(
            points=request.track_points,
            start_km=request.start_km,
            end_km=request.end_km,
            track_name=request.track_name
        )

        # Create filename
        filename = f"{request.track_name.replace(' ', '_')}_segment_{request.start_km:.1f}km-{request.end_km:.1f}km.gpx"

        # Return as downloadable file
        return Response(
            content=gpx_xml,
            media_type="application/gpx+xml",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error generating GPX file: {str(e)}"
        )


@router.post("/detect-climbs", response_model=List[ClimbSegment])
async def detect_climbs(request: ExportSegmentRequest):
    """
    Detect climb segments in a GPX track based on elevation criteria

    Criteria:
    - D+ ≥ 300m (minimum elevation gain)
    - D+ > 4 × D- (ratio criterion for clean climbs)
    - Average gradient ≥ 4% (real climbs, not gentle slopes)

    Args:
        request: Contains track points for analysis

    Returns:
        List of detected climb segments
    """
    try:
        # Detect climbs
        climbs = GPXParser.detect_climbs(
            points=request.track_points
        )

        return climbs

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error detecting climbs: {str(e)}"
        )


@router.post("/merge", response_model=MergeGPXResponse)
@limiter.limit("10/minute")  # 10 merge operations per minute per IP
async def merge_gpx_files(request: Request, merge_request: MergeGPXRequest):
    """
    Merge multiple GPX files into a single GPX track

    Features:
    - Auto-sort by timestamp or keep manual order
    - Detect and report gaps between tracks
    - Detect and report overlapping segments
    - Handle segments with or without timestamps
    - Create visual gaps on map when gaps detected

    Args:
        request: Contains list of GPX files and merge options

    Returns:
        Merged GPX file (XML) and parsed data for preview
    """
    try:
        # Validate input
        if len(merge_request.files) < 2:
            raise HTTPException(
                status_code=400,
                detail="At least 2 GPX files are required for merging"
            )

        # Prepare files for merge
        files_content = [(f.filename, f.content) for f in merge_request.files]

        # Merge GPX files
        merged_gpx, warnings = GPXParser.merge_gpx_files(
            files_content=files_content,
            gap_threshold_seconds=merge_request.options.gap_threshold_seconds,
            interpolate_gaps=merge_request.options.interpolate_gaps,
            sort_by_time=merge_request.options.sort_by_time,
            merged_track_name=merge_request.merged_track_name or "Merged Track"
        )

        # Convert merged GPX to XML string
        merged_gpx_xml = merged_gpx.to_xml()

        # Parse the merged GPX for preview data
        merged_data = GPXParser.parse_gpx_file(
            merged_gpx_xml,
            filename=f"{merge_request.merged_track_name or 'Merged_Track'}.gpx"
        )

        return MergeGPXResponse(
            success=True,
            message=f"Successfully merged {len(merge_request.files)} files",
            merged_gpx=merged_gpx_xml,
            data=merged_data,
            warnings=warnings
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error merging GPX files: {str(e)}"
        )


@router.post("/aid-station-table", response_model=AidStationTableResponse)
@limiter.limit("20/minute")  # 20 table generations per minute per IP
async def generate_aid_station_table(request: Request, table_request: AidStationTableRequest):
    """
    Generate aid station table with segment statistics

    Creates a table showing statistics between consecutive aid stations:
    - Distance between stations (delta km)
    - Elevation gain (D+) and loss (D-) for each segment
    - Average gradient %
    - Estimated time using Naismith's rule or custom pace

    Naismith's Rule (modified):
    - Base: 12 km/h on flat terrain
    - Add 5 min per 100m D+ (climbing)
    - Subtract 5 min per 100m D- for steep descents (gradient > 12%)

    Args:
        request: Contains track points, aid stations, and calculation options

    Returns:
        Table with segments and cumulative statistics
    """
    try:
        # Validate input
        if len(table_request.aid_stations) < 2:
            raise HTTPException(
                status_code=400,
                detail="At least 2 aid stations are required"
            )

        if not table_request.track_points:
            raise HTTPException(
                status_code=400,
                detail="No track points provided"
            )

        # Generate table
        result = GPXParser.generate_aid_station_table(
            points=table_request.track_points,
            aid_stations=table_request.aid_stations,
            use_naismith=table_request.use_naismith,
            custom_pace_kmh=table_request.custom_pace_kmh
        )

        return result

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating aid station table: {str(e)}"
        )
