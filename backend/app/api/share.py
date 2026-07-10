"""
Share API endpoints for anonymous state sharing
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.database import get_db
from app.db.models import SharedState
from app.models.gpx import SaveStateRequest, SaveStateResponse, SharedStateResponse
from app.utils.share_id import generate_share_id
from app.middleware.rate_limit import limiter
import json

router = APIRouter()


@router.post("/save", response_model=SaveStateResponse)
@limiter.limit("10/minute")
async def save_state(request: Request, payload: SaveStateRequest, db: Session = Depends(get_db)):
    """
    Save application state and generate shareable URL

    Creates an anonymous share link without requiring authentication.
    State expires after 30 days.

    Args:
        request: Starlette request object (required by SlowAPI limiter; also
            used for client IP/user-agent). MUST be named ``request`` and typed
            as ``starlette.requests.Request`` — SlowAPI looks up the argument by
            that exact name, so binding it to the Pydantic body returns HTTP 500.
        payload: Contains complete application state as JSON
        db: Database session

    Returns:
        Share ID and full shareable URL
    """
    try:
        # Generate unique share ID
        share_id = generate_share_id(8)

        # Ensure uniqueness (retry if collision)
        max_retries = 5
        for _ in range(max_retries):
            existing = db.query(SharedState).filter(SharedState.share_id == share_id).first()
            if not existing:
                break
            share_id = generate_share_id(8)
        else:
            raise HTTPException(status_code=500, detail="Failed to generate unique share ID")

        # Calculate state size
        state_json_str = json.dumps(payload.state_json)
        file_size = len(state_json_str.encode('utf-8'))

        # Limit: 50MB per share
        MAX_SIZE_BYTES = 50 * 1024 * 1024
        if file_size > MAX_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"State too large ({file_size / 1024 / 1024:.1f}MB). Maximum is {MAX_SIZE_BYTES / 1024 / 1024}MB"
            )

        # Get client info for rate limiting
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        # TODO: Implement rate limiting by IP (10 shares per hour)
        # For now, basic IP tracking for future implementation

        # Create database record
        shared_state = SharedState(
            share_id=share_id,
            state_json=payload.state_json,
            ip_address=client_ip,
            user_agent=user_agent,
            file_size_bytes=file_size
        )

        db.add(shared_state)
        db.commit()
        db.refresh(shared_state)

        # Build shareable URL
        share_url = f"/share/{share_id}"

        return SaveStateResponse(
            success=True,
            share_id=share_id,
            url=share_url,
            expires_at=shared_state.expires_at.isoformat()
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving state: {str(e)}")


@router.get("/{share_id}", response_model=SharedStateResponse)
async def get_shared_state(share_id: str, db: Session = Depends(get_db)):
    """
    Retrieve shared application state by ID

    Args:
        share_id: 8-character share identifier
        db: Database session

    Returns:
        Complete application state JSON

    Raises:
        404: Share ID not found or expired
    """
    # Query database
    shared_state = db.query(SharedState).filter(SharedState.share_id == share_id).first()

    if not shared_state:
        raise HTTPException(
            status_code=404,
            detail="Share not found. It may have expired or never existed."
        )

    # Check if expired
    if shared_state.is_expired():
        # Delete expired record
        db.delete(shared_state)
        db.commit()
        raise HTTPException(
            status_code=410,
            detail="This share has expired. Shares are kept for 30 days."
        )

    # Increment view counter
    shared_state.increment_view_count()
    db.commit()

    return SharedStateResponse(
        success=True,
        share_id=shared_state.share_id,
        state_json=shared_state.state_json,
        created_at=shared_state.created_at.isoformat(),
        view_count=shared_state.view_count
    )


@router.delete("/{share_id}")
async def delete_shared_state(share_id: str, db: Session = Depends(get_db)):
    """
    Delete a shared state (for cleanup or user request)

    Args:
        share_id: Share identifier
        db: Database session

    Returns:
        Success message
    """
    shared_state = db.query(SharedState).filter(SharedState.share_id == share_id).first()

    if not shared_state:
        raise HTTPException(status_code=404, detail="Share not found")

    db.delete(shared_state)
    db.commit()

    return {"success": True, "message": "Share deleted successfully"}
