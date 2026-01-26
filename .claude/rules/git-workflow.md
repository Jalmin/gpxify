# Git Workflow - GPXIFY

Ce document définit le workflow Git pour le projet GPXIFY.

---

## Branches

### Structure
```
main                    # Production, protected
├── feature/xxx         # Nouvelles fonctionnalités
├── fix/xxx             # Bug fixes
├── hotfix/xxx          # Corrections urgentes prod
├── refactor/xxx        # Refactoring
└── docs/xxx            # Documentation
```

### Règles par Branche

| Branche | Base | Merge vers | Protection |
|---------|------|------------|------------|
| `main` | - | - | Protected, PR only |
| `feature/*` | `main` | `main` | - |
| `fix/*` | `main` | `main` | - |
| `hotfix/*` | `main` | `main` | Fast-track review |

---

## Naming Convention

### Format
```
{type}/{description-courte}

# Types
feature/    # Nouvelle fonctionnalité
fix/        # Correction de bug
hotfix/     # Fix urgent production
refactor/   # Refactoring sans changement de comportement
docs/       # Documentation
chore/      # Maintenance, CI/CD, configs
test/       # Ajout/modification de tests
```

### Exemples
```
feature/gpx-merge-ui
fix/elevation-calculation-negative
hotfix/share-link-expiry
refactor/statistics-service
docs/api-documentation
chore/update-dependencies
```

---

## Commits

### Format (Conventional Commits)
```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types
| Type | Usage |
|------|-------|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation |
| `style` | Formatting (pas de changement de code) |
| `refactor` | Refactoring (pas de changement de comportement) |
| `test` | Ajout/modification de tests |
| `chore` | Maintenance, build, CI |
| `perf` | Amélioration de performance |

### Scopes (optionnel)
```
feat(frontend): add altitude profile zoom
fix(api): handle empty GPX files
docs(readme): update installation steps
chore(deps): update dependencies
```

### Règles
| Règle | Exemple |
|-------|---------|
| Subject < 50 chars | `feat: add GPX merge feature` |
| Imperatif | `add` pas `added` ou `adds` |
| Pas de point final | `fix: typo in error message` |
| Body = explication | Pourquoi, pas quoi |

### Exemples
```bash
# Simple
git commit -m "feat(api): add share link expiration endpoint"

# Avec body
git commit -m "fix(frontend): handle large GPX files

Files over 5MB were causing the browser to freeze.
Added chunked processing to prevent UI blocking."

# Breaking change
git commit -m "feat(api)!: change response format for /analyze

BREAKING CHANGE: Response now wraps data in 'data' field"
```

---

## Pull Requests

### Titre
```
[TYPE] Description courte

Exemples:
[FEAT] Add GPX merge functionality
[FIX] Handle negative elevation values
[DOCS] Update API documentation
```

### Template Description
```markdown
## Summary
Brief description of changes (1-2 sentences)

## Changes
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Unit tests pass
- [ ] Manual testing done
- [ ] E2E tests pass (if applicable)

## Screenshots
(if UI changes)

## Related Issues
Closes #123
```

### Checklist Avant Merge
- [ ] Tests passent (CI green)
- [ ] Code review approuvé
- [ ] Pas de conflits
- [ ] Documentation mise à jour (si nécessaire)
- [ ] No console.log / debug code

---

## Code Review

### Ce Qu'on Review
| Aspect | Check |
|--------|-------|
| **Fonctionnalité** | Code fait ce qui est attendu |
| **Tests** | Coverage suffisant |
| **Style** | Respect des conventions |
| **Sécurité** | Pas de vulnérabilités |
| **Performance** | Pas de régressions évidentes |

### Feedback Constructif
```markdown
# ✅ Bon commentaire
"Consider using `useMemo` here to avoid recalculating on every render"

# ❌ Mauvais commentaire
"This is wrong"
```

### Approbation
- Minimum **1 approbation** requise
- Auteur ne peut pas approuver sa propre PR
- Request changes si bloquant

---

## Merge Strategy

### Squash Merge (Recommandé)
```bash
# Tous les commits de la branche → 1 commit sur main
# Historique propre
```

### Quand utiliser Rebase
```bash
# Mettre à jour une branche feature avec main
git checkout feature/my-feature
git rebase main
git push --force-with-lease
```

---

## Workflow Quotidien

### Démarrer une Feature
```bash
# 1. Mettre à jour main
git checkout main
git pull

# 2. Créer la branche
git checkout -b feature/my-feature

# 3. Travailler avec commits atomiques
git add .
git commit -m "feat: initial implementation"

# 4. Push régulier
git push -u origin feature/my-feature
```

### Finaliser et Merger
```bash
# 1. Rebase sur main (si besoin)
git fetch origin
git rebase origin/main

# 2. Push
git push --force-with-lease

# 3. Créer PR sur GitHub/GitLab

# 4. Après merge, nettoyer
git checkout main
git pull
git branch -d feature/my-feature
```

### Hotfix
```bash
# 1. Créer depuis main
git checkout main
git pull
git checkout -b hotfix/critical-bug

# 2. Fix + commit
git commit -m "fix: critical bug description"

# 3. PR avec review accéléré
# 4. Merge + deploy immédiat
```

---

## Tags & Releases

### Versioning (SemVer)
```
v{MAJOR}.{MINOR}.{PATCH}

MAJOR: Breaking changes
MINOR: New features (backward compatible)
PATCH: Bug fixes
```

### Créer un Tag
```bash
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0
```

---

## Git Hooks (Recommandé)

### Pre-commit
```bash
# .git/hooks/pre-commit ou via husky
npm run lint
npm run test -- --run
```

### Commit-msg
```bash
# Valider le format du commit message
# Utiliser commitlint
```

---

## Commandes Utiles

```bash
# Voir les branches
git branch -a

# Supprimer une branche locale
git branch -d feature/done

# Supprimer une branche remote
git push origin --delete feature/done

# Annuler le dernier commit (garder les changes)
git reset --soft HEAD~1

# Voir l'historique propre
git log --oneline --graph

# Stash temporaire
git stash
git stash pop

# Rebase interactif (squash commits)
git rebase -i HEAD~3
```

---

## Fichiers à Ignorer

### `.gitignore` Essentiel
```gitignore
# Environnement
.env
.env.local
*.local

# Dependencies
node_modules/
__pycache__/
*.pyc
.venv/

# Build
dist/
build/

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Coverage
coverage/
htmlcov/
.coverage
```
