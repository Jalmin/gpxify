# Command: /test - Test Strategy & Execution

**Trigger** : Exécuter les tests, vérifier la coverage, ou écrire de nouveaux tests.

> **Extrait de la configuration réelle du projet**

---

## Quick Commands (depuis package.json et pytest.ini)

### Run All Tests
```bash
# Frontend (depuis package.json scripts)
cd frontend && npm run test
# Équivalent: vitest

# Backend (depuis pytest.ini)
cd backend && pytest
# Options auto: --verbose --cov=app --cov-report=term-missing --cov-report=html --cov-report=xml
```

### With Coverage
```bash
# Frontend
cd frontend && npm run test:coverage
# Rapport généré dans coverage/

# Backend (coverage auto via pytest.ini addopts)
cd backend && pytest
# Rapports: term-missing, htmlcov/, coverage.xml
```

### Specific Tests
```bash
# Frontend - fichier spécifique
cd frontend && npm run test -- src/test/components/Button.test.tsx

# Backend - classe de test
pytest tests/test_api.py::TestGPXUploadEndpoint

# Backend - test spécifique
pytest tests/test_api.py::TestGPXUploadEndpoint::test_upload_valid_gpx -v
```

---

## Test Types

### Unit Tests
**Scope** : Fonctions isolées, composants individuels
**Location** : Co-localisés avec le code source

```typescript
// Frontend: src/utils/statistics.test.ts
describe('calculateElevationGain', () => {
  it('should return 0 for flat terrain', () => {
    const points = [
      { ele: 100 }, { ele: 100 }, { ele: 100 }
    ];
    expect(calculateElevationGain(points)).toBe(0);
  });
});
```

```python
# Backend: tests/test_statistics.py
def test_calculate_elevation_gain_flat():
    points = [{"ele": 100}, {"ele": 100}]
    assert calculate_elevation_gain(points) == 0
```

### Integration Tests
**Scope** : API endpoints, interactions DB
**Location** : `tests/` directory

```python
# Backend: tests/test_api.py
async def test_analyze_gpx_endpoint(client, sample_gpx):
    response = await client.post(
        "/api/analyze",
        files={"file": ("track.gpx", sample_gpx)}
    )
    assert response.status_code == 200
    assert "distance" in response.json()["data"]
```

### Component Tests (Frontend)
**Scope** : Composants React avec interactions

```typescript
// Frontend: src/components/AltitudeProfile.test.tsx
import { render, screen } from '@testing-library/react';

describe('AltitudeProfile', () => {
  it('should render chart with data', () => {
    render(<AltitudeProfile points={mockPoints} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});
```

---

## Coverage Requirements

| Scope | Minimum | Target |
|-------|---------|--------|
| **Overall** | 70% | 80% |
| **Services** | 90% | 95% |
| **API Routes** | 80% | 90% |
| **Utils** | 70% | 85% |
| **Components** | 60% | 75% |

### Check Coverage
```bash
# Frontend - génère rapport HTML
npm run test:coverage
open coverage/index.html

# Backend - génère rapport HTML
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

---

## Writing New Tests

### Workflow

1. **Identifier** ce qui doit être testé
   - Nouvelle fonctionnalité
   - Bug fix (test de régression)
   - Code non couvert

2. **Créer le fichier de test** (si nouveau)
   ```
   Frontend: src/{path}/{file}.test.ts(x)
   Backend: tests/test_{module}.py
   ```

3. **Écrire les tests** suivant AAA
   - Arrange (setup)
   - Act (exécution)
   - Assert (vérification)

4. **Vérifier la coverage**
   ```bash
   npm run test:coverage
   pytest --cov=app
   ```

### Test Template (Frontend)
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentToTest } from './ComponentToTest';

describe('ComponentToTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when rendered with default props', () => {
    it('should display the expected content', () => {
      // Arrange
      const props = { title: 'Test' };

      // Act
      render(<ComponentToTest {...props} />);

      // Assert
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });

  describe('when user interacts', () => {
    it('should handle click correctly', async () => {
      // Arrange
      const onClickMock = vi.fn();
      render(<ComponentToTest onClick={onClickMock} />);

      // Act
      fireEvent.click(screen.getByRole('button'));

      // Assert
      expect(onClickMock).toHaveBeenCalledTimes(1);
    });
  });
});
```

### Test Template (Backend)
```python
import pytest
from unittest.mock import AsyncMock, patch

class TestGpxParser:
    """Tests for GPX parser service."""

    @pytest.fixture
    def sample_gpx_content(self):
        """Valid GPX file content."""
        return b"""<?xml version="1.0"?>
        <gpx><trk><trkseg>
          <trkpt lat="45.0" lon="7.0"><ele>100</ele></trkpt>
        </trkseg></trk></gpx>"""

    def test_parse_valid_gpx(self, sample_gpx_content):
        """Should parse valid GPX and return track points."""
        # Arrange
        parser = GpxParser()

        # Act
        result = parser.parse(sample_gpx_content)

        # Assert
        assert len(result.points) > 0
        assert result.points[0].lat == 45.0

    def test_parse_invalid_gpx_raises_error(self):
        """Should raise ValueError for invalid GPX."""
        # Arrange
        parser = GpxParser()
        invalid_content = b"not a gpx file"

        # Act & Assert
        with pytest.raises(ValueError, match="Invalid GPX"):
            parser.parse(invalid_content)
```

---

## Debugging Failed Tests

### Frontend
```bash
# Mode watch avec UI
npm run test:ui

# Verbose output
npm run test -- --reporter=verbose

# Debug specific test
npm run test -- --inspect-brk src/utils/statistics.test.ts
```

### Backend
```bash
# Verbose
pytest -v

# Print output
pytest -s

# Stop on first failure
pytest -x

# Debug with pdb
pytest --pdb
```

---

## CI Integration

### GitHub Actions Example
```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Frontend Tests
      run: |
        cd frontend
        npm ci
        npm run test:coverage

    - name: Backend Tests
      run: |
        cd backend
        pip install -r requirements.txt -r requirements-dev.txt
        pytest --cov=app --cov-report=xml

    - name: Upload Coverage
      uses: codecov/codecov-action@v3
```

---

## Checklist Avant Commit

- [ ] Tous les tests passent
- [ ] Nouveaux tests pour nouveau code
- [ ] Coverage maintenue ou améliorée
- [ ] Pas de tests flaky
- [ ] Tests lisibles et documentés