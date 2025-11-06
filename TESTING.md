# GPX Ninja - Guide de Tests

Ce guide explique comment exécuter et écrire des tests pour GPX Ninja.

## Backend (Python/FastAPI)

### Installation des dépendances de test

```bash
cd backend
pip install -r requirements-dev.txt
```

### Exécuter les tests

```bash
# Tous les tests
pytest

# Avec couverture de code
pytest --cov

# Tests spécifiques
pytest tests/test_gpx_parser.py
pytest tests/test_api.py

# Mode verbose
pytest -v

# Avec rapport HTML de couverture
pytest --cov --cov-report=html
# Ouvrir htmlcov/index.html dans le navigateur
```

### Structure des tests backend

```
backend/
├── tests/
│   ├── conftest.py          # Fixtures pytest
│   ├── test_gpx_parser.py   # Tests du parseur GPX
│   └── test_api.py          # Tests des endpoints API
├── pytest.ini               # Configuration pytest
└── requirements-dev.txt     # Dépendances de test
```

### Écrire un nouveau test backend

```python
def test_mon_feature(client, sample_gpx_simple):
    """Test description"""
    # Arrange
    data = {"key": "value"}

    # Act
    response = client.post('/api/v1/endpoint', json=data)

    # Assert
    assert response.status_code == 200
    assert response.json()['success'] is True
```

## Frontend (React/TypeScript)

### Installation des dépendances de test

```bash
cd frontend
npm install
```

### Exécuter les tests

```bash
# Tous les tests
npm test

# Mode watch (re-run automatique)
npm test -- --watch

# Interface UI
npm run test:ui

# Avec couverture de code
npm run test:coverage

# Tests spécifiques
npm test aidStationUtils
npm test ShareButton
```

### Structure des tests frontend

```
frontend/
├── src/
│   ├── test/
│   │   ├── setup.ts                    # Configuration globale
│   │   ├── aidStationUtils.test.ts    # Tests utilitaires
│   │   └── components/
│   │       ├── Button.test.tsx        # Tests de composant
│   │       └── ShareButton.test.tsx   # Tests de composant
│   └── ...
├── vitest.config.ts         # Configuration Vitest
└── package.json
```

### Écrire un nouveau test frontend

**Test de fonction utilitaire :**
```typescript
import { describe, it, expect } from 'vitest';

describe('Ma fonction', () => {
  it('devrait faire quelque chose', () => {
    const result = maFonction('input');
    expect(result).toBe('output');
  });
});
```

**Test de composant :**
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MonComposant from './MonComposant';

describe('MonComposant', () => {
  it('devrait afficher le texte', () => {
    render(<MonComposant />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Couverture de code

### Backend
Objectif: > 80% de couverture

Zones prioritaires :
- `app/services/gpx_parser.py` - Calculs critiques
- `app/api/gpx.py` - Endpoints principaux
- `app/services/race_recovery.py` - Algorithme de récupération

### Frontend
Objectif: > 70% de couverture

Zones prioritaires :
- Fonctions utilitaires (formatTime, escapeCSV, etc.)
- Logique de state management
- Composants critiques (ShareButton, AidStationTable)

## CI/CD

Les tests seront exécutés automatiquement sur chaque push et pull request.

### GitHub Actions (À configurer)

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: pytest --cov

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
```

## Bonnes pratiques

### Backend
✅ **À faire :**
- Utiliser des fixtures pour les données de test
- Tester les cas limites et les erreurs
- Mocker les appels API externes
- Tester les validations Pydantic

❌ **À éviter :**
- Tests qui dépendent de l'ordre d'exécution
- Tests qui modifient la base de données de production
- Tests sans assertions

### Frontend
✅ **À faire :**
- Tester le comportement utilisateur, pas l'implémentation
- Utiliser `screen.getByRole()` plutôt que `getByTestId()`
- Tester les états de chargement et d'erreur
- Mocker les appels API

❌ **À éviter :**
- Tests trop couplés à la structure du DOM
- Tester les détails d'implémentation
- Tests qui dépendent du timing

## Ressources

- [Pytest Documentation](https://docs.pytest.org/)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
