# Command: /audit - Security & Code Audit

**Trigger** : Effectuer un audit de sécurité ou de qualité de code.

---

## Types d'Audit

### 1. Security Audit
Vérification des vulnérabilités et conformité sécurité.

### 2. Code Quality Audit
Revue de la qualité, maintenabilité et patterns.

### 3. Dependency Audit
Vérification des dépendances et vulnérabilités connues.

### 4. GDPR Compliance Audit
Vérification conformité protection des données.

---

## Security Audit Checklist

### Secrets & Credentials
- [ ] Pas de secrets dans le code source
- [ ] `.env` dans `.gitignore`
- [ ] Pas de credentials dans les commits historiques
- [ ] Variables sensibles bien nommées (`*_SECRET`, `*_KEY`)

```bash
# Rechercher des patterns suspects
grep -r "password\|secret\|key\|token" --include="*.py" --include="*.ts" --include="*.tsx"
```

### Input Validation
- [ ] Tous les inputs utilisateur validés (Pydantic)
- [ ] Upload fichiers : taille limitée, type vérifié
- [ ] Pas d'injection SQL possible (ORM utilisé)
- [ ] Pas de XSS possible (React échappe par défaut)

### Authentication & Authorization
- [ ] Tokens JWT avec expiration courte
- [ ] Refresh tokens sécurisés
- [ ] Rate limiting sur endpoints sensibles
- [ ] CORS restrictif en production

### Headers & Transport
- [ ] HTTPS obligatoire
- [ ] Headers de sécurité configurés (Nginx)
- [ ] Cookies avec flags Secure, HttpOnly, SameSite

### Error Handling
- [ ] Erreurs ne leakent pas d'info sensible
- [ ] Stack traces cachées en production
- [ ] Messages d'erreur génériques pour l'utilisateur

---

## Code Quality Audit Checklist

### Architecture
- [ ] Séparation des concerns (API / Service / Model)
- [ ] Pas de logique métier dans les routes
- [ ] Pas de duplication de code significative
- [ ] Patterns cohérents dans tout le projet

### TypeScript (Frontend)
- [ ] Pas de `any` non justifié
- [ ] Types stricts pour les props/state
- [ ] Interfaces documentées
- [ ] Imports organisés

### Python (Backend)
- [ ] Type hints sur fonctions publiques
- [ ] Docstrings sur fonctions complexes
- [ ] Pas de code mort
- [ ] Exceptions spécifiques (pas de bare `except`)

### Tests
- [ ] Coverage > 70%
- [ ] Paths critiques couverts > 90%
- [ ] Tests lisibles et maintenables
- [ ] Pas de tests flaky

---

## Dependency Audit

### Frontend
```bash
cd frontend

# Audit npm
npm audit

# Fix automatique (si safe)
npm audit fix

# Voir les détails
npm audit --json
```

### Backend
```bash
cd backend

# Avec pip-audit
pip-audit

# Ou avec safety
safety check -r requirements.txt
```

### Severity Actions
| Severity | Action | Délai |
|----------|--------|-------|
| Critical | Patch immédiat | < 24h |
| High | Patch rapide | < 1 semaine |
| Medium | Prochain sprint | < 1 mois |
| Low | Batch update | Trimestriel |

---

## GDPR Compliance Audit

### Données Collectées
- [ ] Inventaire des données personnelles à jour
- [ ] Base légale définie pour chaque traitement
- [ ] Durée de rétention respectée

### Droits Utilisateurs
- [ ] Accès aux données possible
- [ ] Suppression/oubli implémenté
- [ ] Portabilité disponible (export GPX)

### Sécurité
- [ ] Chiffrement en transit (HTTPS)
- [ ] Logs ne contiennent pas de PII
- [ ] Accès aux données restreint

### Documentation
- [ ] Privacy policy à jour
- [ ] Registre des traitements (si requis)

---

## Output Format

### Rapport d'Audit
```markdown
# Audit Report - GPXIFY
**Date** : YYYY-MM-DD
**Type** : [Security / Code Quality / Dependency / GDPR]
**Auditor** : [Name/Claude]

## Executive Summary
[1-2 phrases résumant les findings]

## Findings

### Critical (Action immédiate requise)
- [ ] Finding 1 - Description - Impact - Remediation

### High (Action rapide requise)
- [ ] Finding 2 - Description - Impact - Remediation

### Medium (À planifier)
- [ ] Finding 3 - Description - Impact - Remediation

### Low (Nice to have)
- [ ] Finding 4 - Description - Impact - Remediation

## Recommendations
1. Recommendation 1
2. Recommendation 2

## Next Steps
- [ ] Action 1 - Owner - Deadline
- [ ] Action 2 - Owner - Deadline
```

---

## Automated Tools

### Linting & Static Analysis
```bash
# Frontend
npm run lint
npx tsc --noEmit

# Backend
flake8 app/
mypy app/
```

### Security Scanning
```bash
# Secrets detection
gitleaks detect

# Dependency scanning
npm audit
pip-audit
```
