"""
GPX file upload and analysis API endpoints
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, Response
from app.models.gpx import GPXUploadResponse, GPXData, ExportSegmentRequest, ClimbSegment
from app.services.gpx_parser import GPXParser
from app.core.config import settings
from typing import List
import uuid
import os

router = APIRouter()


@router.post("/upload", response_model=GPXUploadResponse)
async def upload_gpx(file: UploadFile = File(...)):
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

    Type A: >300m D+, <10km, <100m D-
    Type B: >1000m D+, <30km, <300m D-

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
