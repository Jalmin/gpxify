# API Design Standards - GPXIFY

Ce document définit les standards de design pour l'API REST GPXIFY.

---

## Vue d'Ensemble

| Attribut | Valeur |
|----------|--------|
| **Style** | REST |
| **Format** | JSON |
| **Base URL** | `/api` |
| **Versioning** | URL path (`/api/v1/`) |
| **Auth** | Bearer token (optionnel) |

---

## Endpoints Actuels (depuis `backend/app/api/`)

### GPX (`/api/v1/gpx/` - gpx.py)
```
POST   /api/v1/gpx/upload              # Upload et parse un fichier GPX
       @limiter.limit("30/minute")
       response_model: GPXUploadResponse

POST   /api/v1/gpx/merge               # Fusionner plusieurs traces
       @limiter.limit("10/minute")
       response_model: MergeGPXResponse

POST   /api/v1/gpx/detect-climbs       # Détecter les montées
       response_model: List[ClimbSegment]

POST   /api/v1/gpx/export-segment      # Exporter un segment en GPX
       Content-Type: application/gpx+xml

POST   /api/v1/gpx/aid-station-table   # Générer table ravitaillement
       @limiter.limit("20/minute")
       response_model: AidStationTableResponse

GET    /api/v1/gpx/test                # Test endpoint
```

### Share (`/api/v1/share/` - share.py)
```
POST   /api/v1/share/save              # Créer un lien de partage
       response_model: SaveStateResponse
       # Note: rate limit temporairement désactivé

GET    /api/v1/share/{share_id}        # Récupérer un état partagé
       response_model: SharedStateResponse

DELETE /api/v1/share/{share_id}        # Supprimer un partage
```

### Contact (`/api/v1/contact/` - contact.py)
```
POST   /api/v1/contact                 # Envoyer un message
```

### Health (`/health` - main.py)
```
GET    /health                         # Health check
       response: {"status": "healthy", ...}
```

---

## Conventions HTTP Methods

| Method | Usage | Idempotent |
|--------|-------|------------|
| `GET` | Lecture de ressource | Oui |
| `POST` | Création / Action | Non |
| `PUT` | Remplacement complet | Oui |
| `PATCH` | Mise à jour partielle | Non |
| `DELETE` | Suppression | Oui |

---

## Format des Requêtes

### Upload de Fichier
```http
POST /api/analyze
Content-Type: multipart/form-data

file: <binary GPX file>
```

### JSON Body
```http
POST /api/share
Content-Type: application/json

{
  "track_data": { ... },
  "options": {
    "expires_in_days": 30
  }
}
```

---

## Format des Réponses

### Succès (200, 201)
```json
{
  "data": {
    "id": "abc123",
    "distance": 42.5,
    "elevation_gain": 1200,
    "points": [...]
  },
  "meta": {
    "processing_time_ms": 150
  }
}
```

### Création (201)
```json
{
  "data": {
    "id": "share_xyz",
    "url": "https://gpxify.com/s/share_xyz",
    "expires_at": "2026-02-25T12:00:00Z"
  }
}
```

### Liste avec Pagination
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "per_page": 20,
    "total_pages": 5
  }
}
```

---

## Codes de Statut HTTP

### Succès
| Code | Usage |
|------|-------|
| `200 OK` | Requête réussie |
| `201 Created` | Ressource créée |
| `204 No Content` | Suppression réussie |

### Erreurs Client (4xx)
| Code | Usage |
|------|-------|
| `400 Bad Request` | Payload invalide, validation échouée |
| `401 Unauthorized` | Token manquant/invalide |
| `403 Forbidden` | Token valide mais pas de permission |
| `404 Not Found` | Ressource inexistante |
| `413 Payload Too Large` | Fichier trop gros |
| `422 Unprocessable Entity` | Format GPX invalide |
| `429 Too Many Requests` | Rate limit atteint |

### Erreurs Serveur (5xx)
| Code | Usage |
|------|-------|
| `500 Internal Server Error` | Erreur inattendue |
| `503 Service Unavailable` | Maintenance |

---

## Format des Erreurs

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The uploaded file is not a valid GPX format",
    "details": {
      "field": "file",
      "reason": "Missing required element: <trk>"
    }
  }
}
```

### Codes d'Erreur Standard

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Données invalides |
| `INVALID_GPX` | 422 | Format GPX invalide |
| `FILE_TOO_LARGE` | 413 | Fichier > 10MB |
| `NOT_FOUND` | 404 | Ressource inexistante |
| `RATE_LIMITED` | 429 | Trop de requêtes |
| `INTERNAL_ERROR` | 500 | Erreur serveur |

---

## Rate Limiting (SlowAPI)

### Limites Réelles (depuis le code)
| Endpoint | Limite | Source |
|----------|--------|--------|
| `POST /gpx/upload` | 30/minute | gpx.py:28 |
| `POST /gpx/merge` | 10/minute | gpx.py:160 |
| `POST /gpx/aid-station-table` | 20/minute | gpx.py:228 |
| `POST /share/save` | ~~10/minute~~ | share.py:18 (DÉSACTIVÉ) |

### Headers de Réponse
```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1706270400
```

### Réponse 429
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retry_after": 60
    }
  }
}
```

---

## Validation Pydantic

### Schema Exemple
```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ShareCreateRequest(BaseModel):
    """Request schema for creating a share link."""

    track_data: dict = Field(..., description="GPX track data to share")
    expires_in_days: int = Field(
        default=30,
        ge=1,
        le=90,
        description="Days until share link expires"
    )

class ShareResponse(BaseModel):
    """Response schema for share link."""

    id: str
    url: str
    expires_at: datetime
    created_at: datetime
```

---

## Documentation

### OpenAPI/Swagger
- Accessible à `/docs` (Swagger UI)
- Accessible à `/redoc` (ReDoc)
- Généré automatiquement par FastAPI

### Documenter un Endpoint
```python
from fastapi import APIRouter, File, UploadFile
from app.schemas.track import TrackAnalysisResponse

router = APIRouter()

@router.post(
    "/analyze",
    response_model=TrackAnalysisResponse,
    summary="Analyze a GPX file",
    description="Upload a GPX file and receive detailed analysis including "
                "distance, elevation, and track points.",
    responses={
        200: {"description": "Analysis successful"},
        413: {"description": "File too large (max 10MB)"},
        422: {"description": "Invalid GPX format"},
    }
)
async def analyze_gpx(
    file: UploadFile = File(..., description="GPX file to analyze")
) -> TrackAnalysisResponse:
    """
    Analyze GPX file and return statistics.

    - **file**: GPX file (max 10MB)
    """
    pass
```

---

## Bonnes Pratiques

### ✅ À Faire
- Utiliser des noms de ressources au pluriel (`/tracks`, `/shares`)
- Retourner des réponses cohérentes (même structure)
- Documenter tous les endpoints avec OpenAPI
- Valider tous les inputs avec Pydantic
- Utiliser les codes HTTP appropriés

### ❌ À Éviter
- Verbes dans les URLs (`/getTrack` → `GET /tracks/{id}`)
- Exposer les IDs internes de la DB
- Retourner des erreurs génériques
- Ignorer le versioning
- Oublier le rate limiting sur les endpoints sensibles
