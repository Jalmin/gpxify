# Command: /doc - Documentation Generation

**Trigger** : Générer ou mettre à jour la documentation du projet.

---

## Questions Préalables

Avant de générer la documentation, clarifier :

1. **Type de documentation ?**
   - API (endpoints, schemas)
   - Architecture (diagrammes, décisions)
   - User guide (utilisation)
   - Developer guide (contribution)

2. **Audience ?**
   - Développeurs internes
   - Contributeurs externes
   - Utilisateurs finaux

3. **Créer ou améliorer ?**
   - Partir de zéro
   - Mettre à jour l'existant

---

## Workflow

### 1. Analyse du Contexte
```
Lire les fichiers existants :
- README.md
- ARCHITECTURE.md
- .claude/CLAUDE.md
- Code source pertinent
```

### 2. Génération

#### Documentation API
```markdown
Générer à partir de :
- FastAPI auto-docs (/docs, /redoc)
- Pydantic schemas
- Routes dans backend/app/api/

Output : docs/API.md
```

#### Documentation Architecture
```markdown
Analyser :
- Structure des dossiers
- Patterns utilisés
- Dépendances

Output : ARCHITECTURE.md (mise à jour)
```

#### Documentation Utilisateur
```markdown
Documenter :
- Fonctionnalités principales
- Étapes d'utilisation
- FAQ

Output : docs/USER_GUIDE.md
```

### 3. Validation
- Vérifier la cohérence avec le code actuel
- S'assurer que les exemples fonctionnent
- Relire pour clarté

---

## Outputs Attendus

| Type | Fichier | Format |
|------|---------|--------|
| API | `docs/API.md` | Markdown + exemples curl |
| Architecture | `ARCHITECTURE.md` | Markdown + diagrammes ASCII |
| User Guide | `docs/USER_GUIDE.md` | Markdown |
| Dev Guide | `docs/CONTRIBUTING.md` | Markdown |

---

## Templates

### API Endpoint Documentation
```markdown
### POST /api/analyze

**Description** : Analyse un fichier GPX et retourne les statistiques.

**Request** :
- Content-Type: `multipart/form-data`
- Body: `file` (GPX file, max 10MB)

**Response** (200 OK) :
```json
{
  "data": {
    "distance": 42.5,
    "elevation_gain": 1200,
    "points": [...]
  }
}
```

**Errors** :
- `413` : File too large
- `422` : Invalid GPX format

**Example** :
```bash
curl -X POST https://api.gpxify.com/api/analyze \
  -F "file=@track.gpx"
```
```

---

## Checklist

- [ ] Documentation reflète l'état actuel du code
- [ ] Exemples testés et fonctionnels
- [ ] Liens internes valides
- [ ] Pas d'informations sensibles exposées
