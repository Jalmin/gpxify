# Architecture GPXIFY

Ce document décrit l'architecture technique de l'application GPXIFY.

## Vue d'ensemble

GPXIFY est une application web moderne construite avec une architecture client-serveur :

- **Backend** : API REST avec FastAPI (Python)
- **Frontend** : Single Page Application avec React + TypeScript
- **Communication** : JSON over HTTP/HTTPS
- **Authentification** : OAuth 2.0 (Google puis Auth0)
- **Stockage** : Google Drive (Phase 2) + PostgreSQL (Phase 5)

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                            │
│  React + TypeScript + Vite + Tailwind + Leaflet         │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Components  │  │   Services   │  │    Types     │  │
│  │              │  │              │  │              │  │
│  │ - Map        │  │ - API Client │  │ - GPX Data   │  │
│  │ - Upload     │  │ - Auth       │  │ - Track      │  │
│  │ - Stats      │  │ - Drive      │  │ - Segment    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP/JSON
                      │
┌─────────────────────▼───────────────────────────────────┐
│                      BACKEND                             │
│              FastAPI + Python 3.9+                       │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │     API      │  │   Services   │  │    Models    │  │
│  │              │  │              │  │              │  │
│  │ - GPX routes │  │ - GPX Parser │  │ - Pydantic   │  │
│  │ - Auth       │  │ - Google API │  │ - Schemas    │  │
│  │ - Drive      │  │ - Segments   │  │ - Database   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │  Google  │  │  Google  │  │PostgreSQL│
  │  OAuth   │  │  Drive   │  │ (Phase 5)│
  └──────────┘  └──────────┘  └──────────┘
```

## Stack Technologique

### Backend

| Composant | Technologie | Version | Utilisation |
|-----------|-------------|---------|-------------|
| Framework | FastAPI | 0.115.0 | API REST |
| Serveur ASGI | Uvicorn | 0.32.0 | Serveur web async |
| Parsing GPX | gpxpy | 1.6.2 | Analyse fichiers GPX |
| OAuth | Authlib | 1.3.2 | Authentification |
| HTTP Client | httpx | 0.27.2 | Requêtes externes |
| Data Processing | pandas | 2.2.3 | Analyse données |
| Validation | Pydantic | 2.x | Schémas de données |
| ORM | SQLAlchemy | 2.0.35* | Base de données |

*Phase 5 uniquement

### Frontend

| Composant | Technologie | Version | Utilisation |
|-----------|-------------|---------|-------------|
| Framework | React | 18.3.1 | UI Framework |
| Language | TypeScript | 5.6.3 | Type safety |
| Build Tool | Vite | 5.4.10 | Dev server & build |
| Styling | Tailwind CSS | 3.4.14 | Utility-first CSS |
| Mapping | Leaflet | 1.9.4 | Cartes interactives |
| Elevation | leaflet-elevation | 2.3.8 | Profils altitude |
| UI Components | shadcn/ui | Latest | Composants UI |
| HTTP Client | Axios | 1.7.7 | API calls |
| Icons | Lucide React | 0.454.0 | Icônes |

## Structure du Projet

```
GPXIFY/
│
├── backend/                    # API FastAPI
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # Point d'entrée FastAPI
│   │   │
│   │   ├── api/               # Routes API
│   │   │   ├── __init__.py
│   │   │   ├── gpx.py         # Endpoints GPX
│   │   │   └── auth.py*       # Endpoints OAuth (Phase 2)
│   │   │
│   │   ├── core/              # Configuration
│   │   │   ├── __init__.py
│   │   │   └── config.py      # Settings (Pydantic)
│   │   │
│   │   ├── models/            # Modèles Pydantic
│   │   │   ├── __init__.py
│   │   │   └── gpx.py         # Schémas GPX
│   │   │
│   │   └── services/          # Logique métier
│   │       ├── __init__.py
│   │       ├── gpx_parser.py  # Parsing GPX
│   │       ├── google_auth.py* # Auth Google (Phase 2)
│   │       └── google_drive.py* # Drive API (Phase 2)
│   │
│   ├── uploads/               # Fichiers temporaires
│   ├── requirements.txt       # Dépendances Python
│   ├── .env                   # Variables d'env (git ignored)
│   ├── .env.example           # Template .env
│   └── start.sh               # Script de démarrage
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── components/        # Composants React
│   │   │   ├── Map/
│   │   │   │   ├── GPXMap.tsx
│   │   │   │   └── ElevationProfile.tsx
│   │   │   ├── ui/            # Composants UI réutilisables
│   │   │   │   ├── Button.tsx
│   │   │   │   └── Card.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   └── TrackStats.tsx
│   │   │
│   │   ├── services/          # API clients
│   │   │   ├── api.ts         # Client HTTP
│   │   │   └── googleDrive.ts* # Drive API (Phase 2)
│   │   │
│   │   ├── types/             # Types TypeScript
│   │   │   └── gpx.ts         # Interfaces GPX
│   │   │
│   │   ├── lib/               # Utilitaires
│   │   │   └── utils.ts       # Helpers
│   │   │
│   │   ├── App.tsx            # Composant principal
│   │   ├── main.tsx           # Point d'entrée
│   │   └── index.css          # Styles globaux
│   │
│   ├── public/                # Assets statiques
│   ├── index.html             # HTML principal
│   ├── package.json           # Dépendances Node
│   ├── tsconfig.json          # Config TypeScript
│   ├── vite.config.ts         # Config Vite
│   ├── tailwind.config.js     # Config Tailwind
│   ├── .env                   # Variables d'env (git ignored)
│   ├── .env.example           # Template .env
│   └── start.sh               # Script de démarrage
│
├── .gitignore                 # Fichiers ignorés par Git
├── README.md                  # Documentation principale
├── QUICKSTART.md              # Guide démarrage rapide
├── ARCHITECTURE.md            # Ce fichier
├── NEXT_STEPS.md              # Roadmap
├── PHASE2_GOOGLE_AUTH.md      # Guide Phase 2
├── LICENSE                    # Licence MIT
└── example.gpx                # Fichier de test

* = Phase 2+
```

## Flux de Données

### 1. Upload et Analyse GPX

```
User Action
    │
    ├─► [Frontend] FileUpload component
    │       │
    │       └─► POST /api/v1/gpx/upload (FormData)
    │               │
    │               ▼
    │       [Backend] gpx.py endpoint
    │               │
    │               ├─► Validation (taille, type)
    │               │
    │               └─► GPXParser.parse_gpx_file()
    │                       │
    │                       ├─► gpxpy.parse()
    │                       ├─► Calculate statistics
    │                       │   - Distance (3D)
    │                       │   - Elevation gain/loss
    │                       │   - Duration
    │                       │   - Min/Max/Avg elevation
    │                       │
    │                       └─► Return GPXData (Pydantic)
    │
    │       [Backend] Response: GPXUploadResponse
    │               │
    │               ▼
    │       [Frontend] Update state (gpxData)
    │               │
    │               ├─► GPXMap renders track
    │               ├─► ElevationProfile renders chart
    │               └─► TrackStats displays metrics
    │
    └─► User sees visualization
```

### 2. Affichage Carte (Leaflet)

```
GPXData received
    │
    ▼
GPXMap component
    │
    ├─► Initialize Leaflet map
    │   └─► Add CyclOSM tiles
    │
    ├─► For each track:
    │   │
    │   ├─► Create polyline from points
    │   ├─► Add to map
    │   └─► Bind popup with stats
    │
    └─► Fit bounds to show all tracks
```

### 3. Profil d'Altitude

```
Track data + Map instance
    │
    ▼
ElevationProfile component
    │
    ├─► Initialize leaflet-elevation control
    │
    ├─► Convert track to GeoJSON:
    │   └─► LineString with [lon, lat, ele]
    │
    ├─► Load data into control
    │   └─► Renders D3.js chart
    │
    └─► Sync with map:
        ├─► Click on chart → marker on map
        └─► Hover on chart → highlight on map
```

## Patterns et Principes

### Backend (FastAPI)

**Architecture en Couches** :
1. **API Layer** (`app/api/`) : Routes HTTP, validation requêtes
2. **Service Layer** (`app/services/`) : Logique métier
3. **Model Layer** (`app/models/`) : Schémas de données (Pydantic)

**Principes** :
- **Separation of Concerns** : Chaque module a une responsabilité unique
- **Dependency Injection** : Configuration via settings
- **Type Safety** : Pydantic pour validation
- **Async/Await** : Pour I/O non-bloquant
- **RESTful** : API respecte les conventions REST

**Exemple d'un Endpoint** :
```python
@router.post("/upload", response_model=GPXUploadResponse)
async def upload_gpx(file: UploadFile = File(...)):
    # 1. Validation
    if not file.filename.endswith(".gpx"):
        raise HTTPException(400, "Invalid file type")

    # 2. Service call
    gpx_data = GPXParser.parse_gpx_file(content, filename)

    # 3. Response
    return GPXUploadResponse(success=True, data=gpx_data)
```

### Frontend (React)

**Architecture Composants** :
- **Smart Components** : Gèrent état et logique (App.tsx)
- **Presentational Components** : Affichage pur (TrackStats)
- **Service Layer** : API calls séparés (services/)

**Principes** :
- **Single Responsibility** : Un composant = une fonction
- **Composition over Inheritance** : Combiner composants simples
- **Type Safety** : TypeScript strict
- **Immutability** : State immutable
- **Hooks** : useState, useEffect, useRef

**Exemple Composant** :
```typescript
export function TrackStats({ track }: TrackStatsProps) {
    // Props typées
    const { statistics } = track;

    // Presentational uniquement
    return (
        <Card>
            <CardHeader>
                <CardTitle>{track.name}</CardTitle>
            </CardHeader>
            <CardContent>
                {/* Affichage stats */}
            </CardContent>
        </Card>
    );
}
```

## Sécurité

### Phase 1 (Actuelle)

- ✅ CORS configuré (origines autorisées)
- ✅ Validation des fichiers (type, taille)
- ✅ Sanitization des inputs (Pydantic)
- ✅ Pas de secrets en code (variables d'env)

### Phase 2+ (À venir)

- OAuth 2.0 (Google)
- JWT tokens (httpOnly cookies)
- HTTPS obligatoire
- Rate limiting
- CSRF protection
- Content Security Policy

## Performance

### Optimisations Actuelles

**Backend** :
- Async I/O (FastAPI + uvicorn)
- Parsing GPX optimisé (gpxpy)
- Pas de calculs bloquants

**Frontend** :
- Vite pour build ultra-rapide
- Code splitting automatique
- Lazy loading composants (React.lazy)
- Tailwind CSS (purge unused)
- Leaflet canvas renderer pour grandes traces

### Optimisations Futures

- [ ] Web Workers pour calculs lourds
- [ ] Service Worker / PWA
- [ ] Caching API responses
- [ ] Compression gzip/brotli
- [ ] CDN pour assets statiques
- [ ] Pagination de gros fichiers GPX

## Monitoring et Logging

### Phase 1 (Développement)

- Logs console (FastAPI auto-logging)
- React DevTools
- Network tab (Browser DevTools)

### Production (Phase 5)

- **Backend** : Structured logging (JSON)
- **Frontend** : Sentry pour error tracking
- **Monitoring** : Prometheus + Grafana
- **Uptime** : UptimeRobot / Pingdom
- **Analytics** : Plausible / Umami (privacy-friendly)

## Déploiement

### Développement Local

```bash
# Backend
cd backend && uvicorn app.main:app --reload

# Frontend
cd frontend && npm run dev
```

### Production (Phase 5)

**Option 1 - Docker Compose** :
```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]

  frontend:
    build: ./frontend
    ports: ["80:80"]

  db:
    image: postgres:16
    volumes: ["pgdata:/var/lib/postgresql/data"]
```

**Option 2 - Platforms** :
- Backend : Railway / Fly.io / Render
- Frontend : Vercel / Netlify
- Database : Supabase / Neon

## Tests

### Backend (À implémenter)

```python
# tests/test_gpx_parser.py
def test_parse_valid_gpx():
    content = """<?xml version="1.0"?>..."""
    data = GPXParser.parse_gpx_file(content, "test.gpx")
    assert len(data.tracks) > 0
    assert data.tracks[0].statistics.total_distance > 0
```

### Frontend (À implémenter)

```typescript
// tests/GPXMap.test.tsx
describe('GPXMap', () => {
    it('renders map with track', () => {
        const track = mockTrack();
        render(<GPXMap tracks={[track]} />);
        expect(screen.getByRole('map')).toBeInTheDocument();
    });
});
```

### E2E (À implémenter)

```javascript
// e2e/upload.spec.ts (Playwright)
test('upload GPX and display on map', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.setInputFiles('input[type="file"]', 'example.gpx');
    await expect(page.locator('.leaflet-container')).toBeVisible();
});
```

## Évolutivité

### Scalabilité Horizontale

- Backend FastAPI : Stateless, facilement scalable
- Frontend : SPA statique, CDN-friendly
- Database : PostgreSQL avec read replicas

### Scalabilité Verticale

- Optimisation queries SQL
- Caching (Redis)
- Background tasks (Celery)

---

**Document vivant** : Cette architecture évoluera avec les phases du projet.

Dernière mise à jour : Phase 1 (2024-11-01)
