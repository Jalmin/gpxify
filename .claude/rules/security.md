# Security Requirements - GPXIFY

Ce document définit les exigences de sécurité et conformité GDPR pour GPXIFY.

---

## GDPR & Protection des Données

### Données Personnelles Traitées

| Donnée | Type | Sensibilité | Rétention |
|--------|------|-------------|-----------|
| **Traces GPX** | Géolocalisation | Haute | 30 jours max (partages) |
| **Metadata GPX** | Timestamps, device | Moyenne | Avec la trace |
| **IP visiteurs** | Technique | Basse | Logs uniquement |

### Principes GDPR Appliqués

| Principe | Application GPXIFY |
|----------|-------------------|
| **Minimisation** | Pas de compte obligatoire, données minimales |
| **Limitation durée** | Partages expirés à 30 jours |
| **Transparence** | Privacy policy visible |
| **Sécurité** | Chiffrement, rate limiting |

### Droits des Utilisateurs
- **Accès** : Les traces sont accessibles via le lien de partage
- **Suppression** : Expiration automatique, pas de stockage permanent
- **Portabilité** : Export GPX natif

---

## Authentication & Authorization

### État Actuel
- **Pas d'authentification obligatoire** pour l'analyse de traces
- **Partage anonyme** via liens uniques
- **OAuth optionnel** (Google) si implémenté

### Si Auth Implémentée
```python
# Configuration JWT
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION = 3600  # 1 heure
REFRESH_TOKEN_EXPIRATION = 604800  # 7 jours
```

### Rate Limiting (SlowAPI)
```python
# Limites actuelles (depuis le code source 2026-01-26)
RATE_LIMIT_UPLOAD = "30/minute"     # gpx.py:28
RATE_LIMIT_MERGE = "10/minute"      # gpx.py:160
RATE_LIMIT_AID_STATION = "20/minute" # gpx.py:228
RATE_LIMIT_SHARE = "10/minute"      # share.py:18
```

---

## Secrets Management

### Variables d'Environnement Requises

| Variable | Usage | Sensibilité |
|----------|-------|-------------|
| `SECRET_KEY` | JWT signing | **CRITIQUE** |
| `DATABASE_URL` | Connexion DB | **HAUTE** |
| `GOOGLE_CLIENT_SECRET` | OAuth | **HAUTE** |
| `SMTP_PASSWORD` | Emails | Haute |
| `CORS_ORIGINS` | Sécurité | Moyenne |

### Règles Strictes

```bash
# ❌ JAMAIS commiter de secrets
.env
*.pem
*_secret*
credentials.json

# ✅ Template à commiter
.env.example
```

### Rotation des Secrets
| Secret | Fréquence | Procédure |
|--------|-----------|-----------|
| `SECRET_KEY` | 90 jours | Redéployer avec nouvelle clé |
| `DATABASE_URL` | Changement de mot de passe | Mise à jour env |
| OAuth secrets | Annuelle | Régénérer dans console Google |

---

## Input Validation

### Backend (Pydantic)
```python
from pydantic import BaseModel, validator, constr
from fastapi import UploadFile

class UploadGpxRequest(BaseModel):
    """Validation stricte des uploads GPX."""

    @validator('file')
    def validate_file(cls, v: UploadFile):
        # Taille max
        if v.size > 10 * 1024 * 1024:  # 10MB
            raise ValueError("File too large")

        # Type MIME
        allowed = ['application/gpx+xml', 'application/xml', 'text/xml']
        if v.content_type not in allowed:
            raise ValueError("Invalid file type")

        return v
```

### Protection Injection
```python
# ✅ SQLAlchemy ORM - pas de SQL brut
track = session.query(Track).filter(Track.id == track_id).first()

# ❌ JAMAIS de SQL brut avec interpolation
# session.execute(f"SELECT * FROM tracks WHERE id = '{track_id}'")
```

### Frontend
```typescript
// Validation côté client (UX, pas sécurité)
const validateFile = (file: File): boolean => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['.gpx'];

  if (file.size > maxSize) return false;
  if (!allowedTypes.some(t => file.name.endsWith(t))) return false;

  return true;
};
```

---

## Data Protection

### Chiffrement

| Couche | Protection |
|--------|------------|
| **Transit** | TLS 1.2+ obligatoire (HTTPS) |
| **Repos** | Pas de stockage permanent de traces |
| **Database** | Encryption at rest (provider) |

### Headers de Sécurité (Nginx)
```nginx
# Headers configurés
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; ..." always;
```

### CORS
```python
# Production
CORS_ORIGINS = [
    "https://gpxify.com",
    "https://www.gpxify.com"
]

# ❌ Jamais en production
# CORS_ORIGINS = ["*"]
```

---

## Logging & Monitoring

### Ce Qu'on Log
```python
# ✅ OK à logger
logger.info(f"GPX uploaded: {file_id}, size: {file_size}")
logger.warning(f"Rate limit exceeded for IP: {masked_ip}")
logger.error(f"Parse error for file: {file_id}")

# ❌ JAMAIS logger
# logger.info(f"User data: {gpx_content}")  # Données perso
# logger.debug(f"Token: {jwt_token}")       # Secrets
# logger.info(f"IP: {full_ip}")             # PII non masqué
```

### Masquage IP
```python
def mask_ip(ip: str) -> str:
    """Masque les derniers octets pour GDPR."""
    parts = ip.split('.')
    return f"{parts[0]}.{parts[1]}.xxx.xxx"
```

### Rétention Logs
| Type | Durée | Justification |
|------|-------|---------------|
| Access logs | 30 jours | Sécurité |
| Error logs | 90 jours | Debugging |
| Audit logs | 1 an | Compliance |

---

## Dependency Security

### Scan Automatique
```bash
# Backend
pip-audit

# Frontend
npm audit
```

### Politique de Mise à Jour
| Type | Action | Délai |
|------|--------|-------|
| **Critical CVE** | Patch immédiat | < 24h |
| **High CVE** | Patch rapide | < 1 semaine |
| **Medium** | Prochaine release | < 1 mois |
| **Low** | Batch update | Trimestriel |

### Fichiers de Dépendances
```bash
# Vérifier avant merge
pip-audit -r requirements.txt
npm audit --audit-level=high
```

---

## Checklist Sécurité (Avant Deploy)

### Code
- [ ] Pas de secrets hardcodés
- [ ] Input validation sur tous les endpoints
- [ ] Pas de SQL brut
- [ ] Pas de `any` en TypeScript pour données externes
- [ ] Error messages ne leakent pas d'infos sensibles

### Config
- [ ] CORS restrictif (domaines spécifiques)
- [ ] Rate limiting activé
- [ ] HTTPS obligatoire
- [ ] Headers de sécurité configurés

### Infra
- [ ] `.env` pas commité
- [ ] Database non exposée publiquement
- [ ] Logs ne contiennent pas de PII
- [ ] Backups chiffrés

### Compliance
- [ ] Privacy policy à jour
- [ ] Rétention des données respectée
- [ ] Consentement si cookies (hors essentiels)

---

## Incident Response

### En Cas de Breach
1. **Identifier** : Scope de l'incident
2. **Contenir** : Isoler les systèmes affectés
3. **Notifier** : CNIL si données perso (72h max GDPR)
4. **Documenter** : Post-mortem détaillé
5. **Remédier** : Corriger la vulnérabilité

### Contacts
- Responsable sécurité : [À définir]
- CNIL : https://www.cnil.fr/
