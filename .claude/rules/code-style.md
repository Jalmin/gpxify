# Code Style Guide - GPXIFY

> **Extrait du code source le 2026-01-26**

---

## Frontend (TypeScript/React)

### Configuration Détectée
| Fichier | Contenu |
|---------|---------|
| `tsconfig.json` | `strict: true`, `noUnusedLocals`, `noUnusedParameters` |
| `vite.config.ts` | Path alias `@/` → `./src/` |
| ESLint | Via package.json scripts |

### Formatting (Observé)
| Règle | Valeur |
|-------|--------|
| Indentation | 2 espaces |
| Semicolons | Non (auto-inserted) |
| Quotes | Single quotes pour JS |
| Path aliases | `@/` pour imports |

### Nommage (Extrait du Code)

| Élément | Convention | Exemples Réels |
|---------|------------|----------------|
| Fichiers composants | `PascalCase.tsx` | `StatCard.tsx`, `GPXMap.tsx`, `ShareButton.tsx` |
| Dossiers | `PascalCase` | `Dashboard/`, `Map/`, `ui/` |
| Composants | `PascalCase` | `StatCard`, `FileUpload`, `ElevationProfile` |
| Interfaces props | `{Name}Props` | `StatCardProps` (ligne 3-8 de StatCard.tsx) |
| Constantes locales | `camelCase` | `colorClasses` |

### Pattern Composant Réel (StatCard.tsx)
```typescript
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'white';
}

const colorClasses = {
  blue: 'text-blue-500',
  // ...
};

export function StatCard({ title, value, icon: Icon, trend, color = 'blue' }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
      {/* ... */}
    </div>
  );
}
```

### TailwindCSS (depuis tailwind.config.js)
```javascript
// Dark mode activé via classe
darkMode: ['class'],

// Couleurs custom via CSS variables HSL
colors: {
  border: 'hsl(var(--border))',
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  primary: {
    DEFAULT: 'hsl(var(--primary))',
    foreground: 'hsl(var(--primary-foreground))',
  },
  card: {
    DEFAULT: 'hsl(var(--card))',
    foreground: 'hsl(var(--card-foreground))',
  },
}
```

### Classes Tailwind Pattern
```tsx
// Ordre observé : bg → border → rounded → padding → hover → transition
<div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
```

---

## Backend (Python)

### Configuration Détectée
| Outil | Version | Source |
|-------|---------|--------|
| Black | 24.10.0 | requirements-dev.txt |
| Flake8 | 7.1.1 | requirements-dev.txt |
| mypy | 1.11.2 | requirements-dev.txt |

### Formatting
| Règle | Valeur |
|-------|--------|
| Indentation | 4 espaces |
| Line length | 88 (Black default) |
| Quotes | Double quotes |

### Nommage (Extrait du Code)

| Élément | Convention | Exemples Réels |
|---------|------------|----------------|
| Fichiers | `snake_case.py` | `gpx_parser.py`, `share.py`, `rate_limit.py` |
| Fonctions | `snake_case` | `upload_gpx()`, `get_shared_state()` |
| Classes | `PascalCase` | `GPXParser`, `SharedState`, `Settings` |
| Variables | `snake_case` | `track_points`, `share_id`, `file_size` |
| Constantes | `UPPER_SNAKE` | `MAX_SIZE_BYTES` (share.py:53) |

### Docstrings Réels (gpx.py)
```python
@router.post("/upload", response_model=GPXUploadResponse)
@limiter.limit("30/minute")
async def upload_gpx(request: Request, file: UploadFile = File(...)):
    """
    Upload and parse a GPX file

    Args:
        file: GPX file upload

    Returns:
        Parsed GPX data with tracks and statistics
    """
```

### Pydantic Models (models/gpx.py)
```python
from typing import List, Optional
from pydantic import BaseModel

class TrackPoint(BaseModel):
    """Extended track point with calculated metrics"""
    lat: float
    lon: float
    elevation: Optional[float] = None
    distance: float  # Cumulative distance in meters
    time: Optional[str] = None

class GPXUploadResponse(BaseModel):
    """Response after GPX upload"""
    success: bool
    message: str
    data: Optional[GPXData] = None
    file_id: Optional[str] = None
```

### Settings Pattern (config.py)
```python
from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    APP_NAME: str = "GPXIFY"
    DATABASE_URL: str = "postgresql://..."
    SECRET_KEY: str = "..."

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v, info):
        if info.data.get("ENVIRONMENT") == "production":
            if len(v) < 32:
                raise ValueError("SECRET_KEY must be min 32 chars in production")
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True
```

### Error Handling Pattern
```python
# Validation explicite avant processing
if not file.filename.lower().endswith(".gpx"):
    raise HTTPException(
        status_code=400,
        detail="Invalid file type. Only .gpx files are allowed",
    )

# Try/except avec message descriptif
try:
    gpx_data = GPXParser.parse_gpx_file(content_str, file.filename)
except Exception as e:
    raise HTTPException(
        status_code=400,
        detail=f"Error parsing GPX file: {str(e)}",
    )
```

---

## Commandes de Vérification

### Frontend (depuis package.json)
```bash
# Lint
npm run lint
# Équivalent: eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0

# Build (inclut type check)
npm run build
# Équivalent: tsc && vite build
```

### Backend
```bash
# Format
black app/

# Lint
flake8 app/

# Type check
mypy app/
```

---

## Points d'Attention Identifiés

| Pattern | Localisation | Note |
|---------|--------------|------|
| `except Exception as e` générique | `gpx.py:76`, `share.py:93` | Acceptable pour catch-all API |
| Rate limit commenté | `share.py:18` | À réactiver |
| TODO dans le code | `share.py:64` | Rate limiting par IP à implémenter |
