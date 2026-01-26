# Command: /deploy - Deployment Procedures

**Trigger** : Déployer l'application en staging ou production.

---

## Environnements (depuis docker-compose.yml)

| Env | URL | Deploy Method |
|-----|-----|---------------|
| **Dev** | localhost:5173 (frontend), localhost:8000 (backend) | `docker-compose up` |
| **Prod** | https://www.gpx.ninja | Coolify (labels caddy) |

### URLs Production (depuis docker-compose.yml)
- Frontend: `https://www.gpx.ninja/*`
- Backend API: `https://www.gpx.ninja/api/*`

### CORS Origins Production
```
https://www.gpx.ninja,http://www.gpx.ninja,https://gpx.ninja,http://gpx.ninja
```

---

## Pre-Deployment Checklist

### Code Quality
- [ ] Tous les tests passent (`npm run test`, `pytest`)
- [ ] Linting OK (`npm run lint`, `flake8`)
- [ ] Build OK (`npm run build`)
- [ ] PR merged sur main

### Database
- [ ] Migrations prêtes (`alembic upgrade head` testé localement)
- [ ] Migrations backwards-compatible
- [ ] Backup récent disponible

### Secrets & Config
- [ ] Variables d'environnement à jour
- [ ] Pas de secrets hardcodés
- [ ] CORS configuré pour le bon domaine

### Dependencies
- [ ] `npm audit` sans vulnérabilités critiques
- [ ] `pip-audit` sans vulnérabilités critiques

---

## Deployment Steps

### 1. Preparation
```bash
# S'assurer d'être sur main à jour
git checkout main
git pull origin main

# Vérifier le dernier commit
git log -1
```

### 2. Build & Test (Local Verification)
```bash
# Frontend
cd frontend && npm run build && npm run test

# Backend
cd backend && pytest

# Docker build test
docker-compose build
```

### 3. Deploy via Coolify

#### Staging
```
1. Push sur main → Deploy automatique
2. Vérifier les logs Coolify
3. Tester sur staging.gpxify.com
```

#### Production
```
1. Dashboard Coolify → GPXIFY Prod
2. Click "Deploy"
3. Attendre build complete
4. Vérifier les logs
```

### 4. Post-Deploy Verification
```bash
# Health check
curl https://gpxify.com/api/health

# Test fonctionnel rapide
# - Upload un GPX
# - Vérifier les stats
# - Créer un partage
```

---

## Database Migration (Si Nécessaire)

### Before Deploy
```bash
# Tester la migration localement
cd backend
alembic upgrade head
alembic downgrade -1  # Vérifier rollback
alembic upgrade head  # Remettre à jour
```

### Deploy Order (Breaking Changes)
1. Deploy le code compatible avec ancien ET nouveau schéma
2. Exécuter les migrations
3. Deploy le code utilisant le nouveau schéma
4. Cleanup (migrations de suppression) si nécessaire

---

## Rollback Procedure

### Si Problème Détecté

#### 1. Immediate Rollback (Coolify)
```
Dashboard → GPXIFY → Deployments → Select previous → Redeploy
```

#### 2. Database Rollback (Si Migration)
```bash
# Connexion au serveur
ssh user@server

# Rollback
cd /app/backend
alembic downgrade -1
```

#### 3. Communication
- Notifier l'équipe (Slack/Discord)
- Documenter l'incident dans `.claude/context/learning-log.md`

---

## Monitoring Post-Deploy

### Métriques à Surveiller (15 min)
| Métrique | Seuil Alert |
|----------|-------------|
| Response time | > 500ms |
| Error rate | > 1% |
| CPU usage | > 80% |
| Memory usage | > 80% |

### Logs à Vérifier
```bash
# Via Coolify ou SSH
docker logs gpxify-backend --tail 100
docker logs gpxify-frontend --tail 100
```

---

## Checklist Post-Deploy

- [ ] Health check OK
- [ ] Test fonctionnel manuel OK
- [ ] Pas d'erreurs dans les logs
- [ ] Métriques stables
- [ ] Utilisateurs notifiés (si downtime prévu)

---

## Contacts

| Role | Contact |
|------|---------|
| DevOps | [À définir] |
| Backend Lead | [À définir] |
| On-call | [À définir] |
