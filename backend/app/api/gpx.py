"""
GPX file upload and analysis API endpoints
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from app.models.gpx import GPXUploadResponse, GPXData
from app.services.gpx_parser import GPXParser
from app.core.config import settings
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
