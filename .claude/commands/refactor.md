# Command: /refactor - Refactoring & Code Improvement

**Trigger** : Améliorer la structure du code sans changer le comportement.

---

## Principes de Refactoring

### Règles d'Or
1. **Tests d'abord** : Ne jamais refactorer sans tests couvrant le code
2. **Petits pas** : Un changement à la fois, commit après chaque étape
3. **Comportement inchangé** : Les tests doivent toujours passer
4. **Pas de feature creep** : Refactoring ≠ nouvelles fonctionnalités

### Quand Refactorer
- Code dupliqué (Rule of Three)
- Fonction/fichier trop long
- Nommage confus
- Couplage excessif
- Complexité cyclomatique élevée

### Quand NE PAS Refactorer
- Sans tests suffisants
- Sous pression deadline
- Code qu'on ne comprend pas
- "Juste parce que"

---

## Process

### 1. Analyse
```markdown
Questions à se poser :
- [ ] Qu'est-ce qui ne va pas avec ce code ?
- [ ] Quel est l'objectif du refactoring ?
- [ ] Y a-t-il des tests pour ce code ?
- [ ] Quel est le risque de régression ?
```

### 2. Préparation
```bash
# Vérifier la coverage actuelle
npm run test:coverage  # ou pytest --cov

# S'assurer que les tests passent
npm run test           # ou pytest
```

### 3. Refactoring Incrémental
```bash
# 1. Petit changement
# 2. Exécuter les tests
# 3. Commit si OK
# 4. Répéter
```

### 4. Validation
```bash
# Tests passent toujours
npm run test && pytest

# Coverage pas diminuée
# Comportement identique
```

---

## Patterns de Refactoring Courants

### Extract Function
```typescript
// ❌ Avant
function processTrack(track: Track) {
  // 50 lignes de calculs de statistiques
  // 30 lignes de formatage
  // 20 lignes de validation
}

// ✅ Après
function processTrack(track: Track) {
  const stats = calculateStatistics(track);
  const formatted = formatTrackData(track, stats);
  return validateOutput(formatted);
}

function calculateStatistics(track: Track): TrackStats { ... }
function formatTrackData(track: Track, stats: TrackStats): FormattedTrack { ... }
function validateOutput(data: FormattedTrack): ValidatedTrack { ... }
```

### Extract Component (React)
```typescript
// ❌ Avant : composant monolithique
function AnalyzePage() {
  return (
    <div>
      {/* 100 lignes de header */}
      {/* 200 lignes de chart */}
      {/* 150 lignes de stats */}
    </div>
  );
}

// ✅ Après : composants séparés
function AnalyzePage() {
  return (
    <div>
      <AnalyzeHeader track={track} />
      <ElevationChart points={points} />
      <TrackStatistics stats={stats} />
    </div>
  );
}
```

### Replace Magic Numbers
```python
# ❌ Avant
if file_size > 10485760:
    raise ValueError("File too large")

# ✅ Après
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB

if file_size > MAX_FILE_SIZE_BYTES:
    raise ValueError("File too large")
```

### Simplify Conditionals
```typescript
// ❌ Avant
function getStatus(track: Track): string {
  if (track.points.length === 0) {
    return 'empty';
  } else {
    if (track.isComplete) {
      return 'complete';
    } else {
      return 'incomplete';
    }
  }
}

// ✅ Après
function getStatus(track: Track): string {
  if (track.points.length === 0) return 'empty';
  if (track.isComplete) return 'complete';
  return 'incomplete';
}
```

### Extract Service (Backend)
```python
# ❌ Avant : logique dans la route
@router.post("/analyze")
async def analyze(file: UploadFile):
    content = await file.read()
    gpx = gpxpy.parse(content)
    points = []
    for track in gpx.tracks:
        for segment in track.segments:
            for point in segment.points:
                points.append({...})
    # ... 50 lignes de calculs
    return {"data": result}

# ✅ Après : service dédié
@router.post("/analyze")
async def analyze(file: UploadFile, service: GpxService = Depends()):
    return await service.analyze(file)

# services/gpx_service.py
class GpxService:
    async def analyze(self, file: UploadFile) -> AnalysisResult:
        content = await file.read()
        track = self.parser.parse(content)
        stats = self.calculator.calculate(track)
        return AnalysisResult(track=track, stats=stats)
```

---

## Refactoring par Domaine

### Frontend (React/TypeScript)

| Problème | Solution |
|----------|----------|
| Composant > 200 lignes | Extract components |
| Props drilling > 3 niveaux | Zustand store |
| Logic in JSX | Extract à custom hook |
| Duplicated fetch logic | Custom hook + service |
| Inline styles partout | TailwindCSS classes |

### Backend (FastAPI/Python)

| Problème | Solution |
|----------|----------|
| Route > 50 lignes | Extract to service |
| Duplicated DB logic | Repository pattern |
| Raw SQL queries | SQLAlchemy ORM |
| Hardcoded config | Environment variables |
| Nested try/except | Specific exceptions |

---

## Checklist Refactoring

### Avant
- [ ] Tests existants et passants
- [ ] Coverage connue
- [ ] Scope défini et limité
- [ ] Branche dédiée créée

### Pendant
- [ ] Un changement à la fois
- [ ] Tests après chaque changement
- [ ] Commits atomiques
- [ ] Pas de nouvelles features

### Après
- [ ] Tous les tests passent
- [ ] Coverage maintenue ou améliorée
- [ ] Code review demandée
- [ ] Documentation mise à jour si nécessaire

---

## Red Flags (Arrêter le Refactoring)

- 🚩 Tests qui cassent sans raison évidente
- 🚩 Scope qui s'élargit ("tant qu'on y est...")
- 🚩 Temps estimé dépassé de 2x
- 🚩 Nouveau bug introduit
- 🚩 Plus personne ne comprend les changements