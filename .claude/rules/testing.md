# Testing Strategy - GPXIFY

> **Extrait des fichiers de configuration le 2026-01-26**

---

## Frameworks & Outils

### Frontend (depuis `package.json` et `vitest.config.ts`)
| Outil | Version | Usage |
|-------|---------|-------|
| **Vitest** | 2.1.8 | Test runner |
| **@testing-library/react** | 16.0.1 | Tests composants |
| **@testing-library/user-event** | 14.5.2 | Simulation interactions |
| **@testing-library/jest-dom** | 6.6.3 | Matchers DOM |
| **jsdom** | 25.0.1 | Environnement DOM |
| **@vitest/coverage-v8** | 2.1.8 | Coverage provider |

### Backend (depuis `requirements-dev.txt` et `pytest.ini`)
| Outil | Version | Usage |
|-------|---------|-------|
| **pytest** | 8.3.3 | Test runner |
| **pytest-asyncio** | 0.24.0 | Support async (mode: auto) |
| **pytest-cov** | 5.0.0 | Coverage |
| **httpx** | 0.27.2 | Test client async |

---

## Coverage Minimums

| Scope | Minimum | Cible |
|-------|---------|-------|
| **Global** | 70% | 80% |
| **Services critiques** | 90% | 95% |
| **API routes** | 80% | 90% |
| **Utils/Helpers** | 70% | 85% |
| **Composants UI** | 60% | 75% |

### Paths Critiques (90%+ obligatoire)
- `backend/app/services/gpx_parser.py` - Parsing GPX
- `backend/app/services/statistics.py` - Calculs stats
- `backend/app/api/` - Toutes les routes API
- `frontend/src/utils/` - Fonctions utilitaires

---

## Structure des Tests

### Frontend (`/frontend/src/test/`)
```
src/
├── test/
│   ├── setup.ts              # Configuration globale
│   └── utils.tsx             # Helpers de test
├── components/
│   └── AltitudeProfile/
│       ├── AltitudeProfile.tsx
│       └── AltitudeProfile.test.tsx  # Co-localisé
└── utils/
    ├── statistics.ts
    └── statistics.test.ts            # Co-localisé
```

### Backend (`/backend/tests/`)
```
tests/
├── conftest.py               # Fixtures globales
├── test_api.py               # Tests routes API
├── test_gpx_parser.py        # Tests parsing
├── test_share.py             # Tests partage
└── test_race_recovery.py     # Tests récupération
```

---

## Conventions de Nommage

### Frontend (Vitest)
```typescript
describe('AltitudeProfile', () => {
  describe('when data is loaded', () => {
    it('should render the chart with correct points', () => {
      // ...
    });

    it('should highlight point on hover', () => {
      // ...
    });
  });

  describe('when data is empty', () => {
    it('should show empty state message', () => {
      // ...
    });
  });
});
```

### Backend (pytest)
```python
class TestGpxParser:
    """Tests for GPX parser service."""

    def test_parse_valid_gpx_returns_track_points(self, sample_gpx):
        """Should parse valid GPX and return track points."""
        pass

    def test_parse_invalid_gpx_raises_error(self):
        """Should raise ValueError for invalid GPX format."""
        pass

    async def test_parse_large_file_within_timeout(self, large_gpx):
        """Should parse large GPX file within acceptable time."""
        pass
```

---

## Patterns de Test

### Arrange-Act-Assert (AAA)
```typescript
// Frontend
it('should calculate total distance', () => {
  // Arrange
  const points: TrackPoint[] = [
    { lat: 45.0, lon: 7.0, ele: 100 },
    { lat: 45.1, lon: 7.1, ele: 150 },
  ];

  // Act
  const distance = calculateDistance(points);

  // Assert
  expect(distance).toBeCloseTo(15.7, 1); // km
});
```

```python
# Backend
def test_calculate_elevation_gain(sample_points):
    # Arrange
    points = sample_points  # from fixture

    # Act
    gain = calculate_elevation_gain(points)

    # Assert
    assert gain == pytest.approx(250.0, rel=0.01)
```

### Mocking

#### Frontend - API Calls
```typescript
import { vi } from 'vitest';
import { apiClient } from '@/services/api';

vi.mock('@/services/api');

it('should fetch track data', async () => {
  const mockData = { id: '123', points: [] };
  vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

  // ... test
});
```

#### Backend - Database
```python
import pytest
from unittest.mock import AsyncMock

@pytest.fixture
def mock_db_session():
    session = AsyncMock()
    session.get.return_value = Track(id="123")
    return session

async def test_get_track(mock_db_session):
    result = await get_track("123", mock_db_session)
    assert result.id == "123"
```

---

## Ce Qu'il Faut Tester

### ✅ Tester
| Catégorie | Exemples |
|-----------|----------|
| **Happy path** | Upload GPX valide, calcul stats correct |
| **Edge cases** | Fichier vide, 1 seul point, coordonnées limites |
| **Error handling** | Fichier invalide, timeout, erreurs réseau |
| **Intégrations** | API endpoints, DB queries |
| **Business logic** | Calculs de distance, D+, temps estimé |
| **User interactions** | Clicks, drag-and-drop, form submissions |

### ❌ Ne Pas Tester
| Catégorie | Raison |
|-----------|--------|
| Implémentation interne | Fragile, change souvent |
| Libraries tierces | Déjà testées (Leaflet, Chart.js) |
| Getters/setters simples | Trivial |
| CSS/styling | Pas de logique |
| Types TypeScript | Vérifiés à la compilation |

---

## Commandes

### Frontend
```bash
# Tous les tests
npm run test

# Mode watch
npm run test -- --watch

# Avec UI
npm run test:ui

# Coverage
npm run test:coverage

# Fichier spécifique
npm run test -- src/utils/statistics.test.ts
```

### Backend
```bash
# Tous les tests
pytest

# Verbose
pytest -v

# Coverage
pytest --cov=app --cov-report=term-missing

# Coverage HTML
pytest --cov=app --cov-report=html

# Fichier spécifique
pytest tests/test_gpx_parser.py

# Test spécifique
pytest tests/test_api.py::test_upload_gpx
```

---

## Fixtures

### Frontend (`src/test/setup.ts`)
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

### Backend (`tests/conftest.py`)
```python
import pytest
from app.main import app
from httpx import AsyncClient

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
def sample_gpx():
    return open("tests/fixtures/sample.gpx", "rb").read()

@pytest.fixture
def sample_points():
    return [
        {"lat": 45.0, "lon": 7.0, "ele": 100},
        {"lat": 45.1, "lon": 7.1, "ele": 200},
    ]
```

---

## Before Each Commit

```bash
# Frontend
cd frontend && npm run test && npm run lint

# Backend
cd backend && pytest && flake8 app/

# Ou via pre-commit hook (recommandé)
```

---

## CI/CD Integration

Les tests doivent passer avant merge :
- PR checks : `npm run test` + `pytest`
- Coverage minimum enforced
- Lint checks obligatoires
