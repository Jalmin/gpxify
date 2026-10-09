"""
Race Recovery API - Reconstruct complete GPX from partial recording

This router is intentionally thin: it validates/reads the uploaded files and
maps errors from the service layer to HTTP responses. All calculation logic
lives in ``app.services.race_recovery_service``.
"""
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import Response
import gpxpy.gpx

from app.services.race_recovery_service import RaceRecoveryError, recover_race_track

router = APIRouter()


@router.post("/recover")
async def recover_race(
    incomplete_gpx: UploadFile = File(..., description="GPX partiel avec timestamps (de la montre)"),
    complete_gpx: UploadFile = File(..., description="GPX complet sans timestamps (tracé officiel)"),
    official_time: str = Form(..., description="Temps officiel total (format: HH:MM:SS)"),
    approx_distance_km: str = Form(None, description="Distance approximative parcourue en km (optionnel, aide à trouver le point d'arrêt)")
):
    """
    Reconstruct a complete GPX file from:
    - Partial GPX recording (with timestamps) from watch
    - Complete GPX track (without timestamps) from race course
    - Official finish time
    - Optional: Approximate distance covered (helps find accurate cutoff point)

    Calculates missing timestamps based on slope-adjusted speed.
    """
    try:
        incomplete_content = await incomplete_gpx.read()
        complete_content = await complete_gpx.read()

        gpx_xml = recover_race_track(
            incomplete_content,
            complete_content,
            official_time,
            approx_distance_km,
        )

        return Response(
            content=gpx_xml,
            media_type="application/gpx+xml",
            headers={
                "Content-Disposition": "attachment; filename=recovered_race.gpx"
            }
        )

    except HTTPException:
        # Re-raise HTTP exceptions (400 errors from validation)
        raise
    except RaceRecoveryError as e:
        # Domain validation errors map to 400 with their exact message
        raise HTTPException(status_code=400, detail=str(e))
    except gpxpy.gpx.GPXException as e:
        raise HTTPException(status_code=400, detail=f"Erreur de parsing GPX: {str(e)}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Erreur de format: {str(e)}")
    except (AttributeError, TypeError) as e:
        # Errors accessing point attributes (missing time, lat, lon, etc.)
        raise HTTPException(status_code=400, detail=f"Données GPX invalides: {str(e)}")
    except Exception as e:
        # Only truly unexpected errors should return 500
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")
