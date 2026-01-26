# Command: /debug - Debugging & Troubleshooting

**Trigger** : Diagnostiquer et résoudre un problème dans l'application.

---

## Workflow de Debug

### 1. Reproduire le Problème
```markdown
Questions clés :
- [ ] Le bug est-il reproductible ?
- [ ] Dans quel environnement ? (dev/staging/prod)
- [ ] Quelles sont les étapes pour reproduire ?
- [ ] Depuis quand le problème existe ?
```

### 2. Collecter les Informations
```markdown
Données à récupérer :
- [ ] Message d'erreur exact
- [ ] Stack trace
- [ ] Logs pertinents
- [ ] Input qui cause le problème
- [ ] Comportement attendu vs actuel
```

### 3. Isoler la Cause
```markdown
Techniques :
- Binary search dans l'historique git
- Désactiver des parties du code
- Ajouter des logs temporaires
- Utiliser le debugger
```

### 4. Corriger et Tester
```markdown
- [ ] Fix minimal et ciblé
- [ ] Test de régression ajouté
- [ ] Vérifier que ça ne casse rien d'autre
```

---

## Outils par Environnement

### Frontend (React/TypeScript)

#### Browser DevTools
```javascript
// Console
console.log('Debug:', variable);
console.table(arrayOfObjects);
console.trace('Stack trace here');

// Breakpoints
debugger; // Pause l'exécution

// Network tab : vérifier les requêtes API
// React DevTools : inspecter state/props
```

#### Vitest Debug
```bash
# Mode watch
npm run test -- --watch

# UI interactive
npm run test:ui

# Verbose
npm run test -- --reporter=verbose
```

### Backend (FastAPI/Python)

#### Logging
```python
import logging

logger = logging.getLogger(__name__)

# Niveaux de log
logger.debug("Detailed info for debugging")
logger.info("General info")
logger.warning("Something unexpected")
logger.error("Error occurred", exc_info=True)  # Avec stack trace
```

#### pdb (Python Debugger)
```python
# Ajouter un breakpoint
import pdb; pdb.set_trace()

# Ou en Python 3.7+
breakpoint()

# Commandes pdb
# n (next), s (step into), c (continue)
# p variable (print), l (list code)
# q (quit)
```

#### pytest Debug
```bash
# Arrêter au premier échec
pytest -x

# Entrer dans pdb sur échec
pytest --pdb

# Afficher les prints
pytest -s

# Verbose
pytest -v
```

---

## Problèmes Courants

### Frontend

#### "Cannot read property X of undefined"
```typescript
// Vérifier :
// 1. L'objet existe avant d'accéder à la propriété
const value = obj?.property?.subProperty;

// 2. Les données API sont bien formatées
console.log('API response:', response.data);

// 3. Le state est initialisé
const [data, setData] = useState<DataType | null>(null);
if (!data) return <Loading />;
```

#### Composant ne re-render pas
```typescript
// Vérifier :
// 1. Le state est bien mis à jour de manière immutable
setItems([...items, newItem]); // ✅
items.push(newItem); // ❌

// 2. La dépendance est dans useEffect
useEffect(() => {
  // ...
}, [dependency]); // dependency dans le tableau

// 3. Le Zustand store est utilisé correctement
const data = useStore((state) => state.data); // selector
```

#### Requête API échoue
```typescript
// Vérifier :
// 1. URL correcte
console.log('Request URL:', url);

// 2. Headers/body corrects
console.log('Request body:', body);

// 3. CORS (voir console Network)
// 4. Token/auth valide

// Ajouter error handling
try {
  const response = await apiClient.post('/api/analyze', data);
} catch (error) {
  if (axios.isAxiosError(error)) {
    console.error('API Error:', error.response?.data);
    console.error('Status:', error.response?.status);
  }
}
```

### Backend

#### 500 Internal Server Error
```python
# Vérifier :
# 1. Les logs serveur
docker logs gpxify-backend --tail 100

# 2. Ajouter try/except pour identifier
@router.post("/analyze")
async def analyze(file: UploadFile):
    try:
        result = await service.analyze(file)
        return result
    except Exception as e:
        logger.error(f"Analysis failed: {e}", exc_info=True)
        raise HTTPException(500, detail="Analysis failed")
```

#### Database Query échoue
```python
# Vérifier :
# 1. La connexion
async with engine.connect() as conn:
    result = await conn.execute(text("SELECT 1"))
    print(result.fetchone())

# 2. La requête (mode debug SQLAlchemy)
# Dans config: SQLALCHEMY_ECHO=true

# 3. Les données
stmt = select(Track).where(Track.id == track_id)
print(stmt)  # Voir la requête générée
```

#### Migration Alembic échoue
```bash
# Vérifier l'état
alembic current
alembic history

# Voir le SQL généré
alembic upgrade head --sql

# Reset si nécessaire (dev only!)
alembic downgrade base
alembic upgrade head
```

---

## Git Bisect (Trouver le Commit Fautif)

```bash
# Démarrer
git bisect start

# Marquer le commit actuel (broken)
git bisect bad

# Marquer un commit qui fonctionne
git bisect good <commit-hash>

# Git checkout un commit intermédiaire
# Tester et marquer :
git bisect good  # si ça marche
git bisect bad   # si ça ne marche pas

# Répéter jusqu'à trouver le commit
# Terminer
git bisect reset
```

---

## Logs Docker

```bash
# Voir les logs
docker logs gpxify-backend --tail 100

# Suivre les logs en temps réel
docker logs -f gpxify-backend

# Logs avec timestamp
docker logs -t gpxify-backend

# Entrer dans le container
docker exec -it gpxify-backend /bin/bash
```

---

## Checklist Debug

### Avant de commencer
- [ ] Bug reproductible
- [ ] Environnement identifié
- [ ] Logs collectés
- [ ] Pas de changements non commités

### Pendant le debug
- [ ] Hypothèse formulée
- [ ] Test minimal pour vérifier
- [ ] Logs temporaires ajoutés
- [ ] Une chose à la fois

### Après la résolution
- [ ] Fix testé manuellement
- [ ] Test de régression ajouté
- [ ] Logs temporaires retirés
- [ ] Commit avec message descriptif
- [ ] Documenter si bug notable

---

## Ressources Utiles

### Documentation
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [FastAPI Debugging](https://fastapi.tiangolo.com/tutorial/debugging/)
- [SQLAlchemy Logging](https://docs.sqlalchemy.org/en/20/core/engines.html#configuring-logging)

### Commands Quick Reference
```bash
# Frontend
npm run test -- --watch
npm run test:ui

# Backend
pytest -x --pdb
uvicorn app.main:app --reload --log-level debug

# Docker
docker logs -f gpxify-backend
docker exec -it gpxify-backend /bin/bash
```