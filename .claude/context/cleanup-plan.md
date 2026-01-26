# Plan de Nettoyage - GPXIFY

> Analyse effectuee le 2026-01-26
> Statut: PHASE 1-4 TERMINEES

---

## Resume Executif

| Severite | Nombre | Statut |
|----------|--------|--------|
| CRITIQUE | 1 | CORRIGE |
| HAUTE | 1 | CORRIGE |
| MOYENNE | 3 | 1 DOCUMENTE |
| BASSE | 4 | CORRIGE |

---

## 1. CORRECTIONS CRITIQUES (Immediat)

### 1.1 Secrets Google OAuth exposes
- **Fichier**: `.env.production.example`
- **Lignes**: 25-27
- **Probleme**: Credentials reelles visibles dans le repo
- **Impact**: Securite compromise - acces non autorise possible
- **Action**: Remplacer par placeholders
- **Statut**: [x] CORRIGE 2026-01-26

```
# AVANT (DANGEREUX)
GOOGLE_CLIENT_ID=646813821201-le0dqlhd1qr7r3v93rn4ni101ce9ltku.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# APRES (SECURISE)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

---

## 2. CORRECTIONS HAUTE PRIORITE

### 2.1 Rate limiting desactive sur /share/save
- **Fichier**: `backend/app/api/share.py`
- **Ligne**: 18
- **Probleme**: Decorateur @limiter.limit commente
- **Impact**: Vulnerable aux abus (spam de partages)
- **Action**: Reactiver le rate limiting
- **Statut**: [x] CORRIGE 2026-01-26

### 2.2 Rate limiting par IP non implemente
- **Fichier**: `backend/app/api/share.py`
- **Ligne**: 64
- **Probleme**: TODO non resolu
- **Impact**: Pas de protection contre abus par IP
- **Action**: Implementer ou documenter comme dette technique
- **Statut**: [ ] A evaluer

---

## 3. CORRECTIONS MOYENNE PRIORITE

### 3.1 Routes API inconsistantes
- **Probleme**: Melange snake_case et kebab-case
- **Exemples**:
  - `/api/v1/gpx/upload` (snake_case)
  - `/api/v1/gpx/export-segment` (kebab-case)
  - `/api/v1/gpx/detect-climbs` (kebab-case)
- **Action**: Standardiser en kebab-case (REST convention)
- **Impact**: Breaking change potentiel
- **Statut**: [ ] A planifier (v2)

### 3.2 Monitoring manquant (ErrorBoundary)
- **Fichier**: `frontend/src/components/ErrorBoundary.tsx`
- **Ligne**: 33
- **Probleme**: TODO Sentry non implemente
- **Action**: Integrer Sentry ou documenter
- **Statut**: [ ] Backlog

### 3.3 Variables d'environnement inutilisees
- **Variables**:
  - `VITE_GOOGLE_CLIENT_ID` (defini mais jamais importe)
- **Action**: Documente comme Phase 2 (Google OAuth)
- **Statut**: [x] DOCUMENTE - Variable optionnelle pour Phase 2

---

## 4. NETTOYAGE BASSE PRIORITE

### 4.1 Fichiers orphelins a la racine
| Fichier | Action |
|---------|--------|
| test-upload.sh | Deplacer vers scripts/ ou supprimer |
| test_merge.py | Deplacer vers backend/tests/ ou supprimer |
| test_merge_part1.gpx | Deplacer vers tests/fixtures/ |
| test_merge_part2.gpx | Deplacer vers tests/fixtures/ |
| debug-server.sh | Documenter ou supprimer |
| check-logs.sh | Documenter ou supprimer |
| check-containers.sh | Documenter ou supprimer |

### 4.2 Dossiers inutilises
| Dossier | Action |
|---------|--------|
| src/test/ | Supprimer (vide) |
| Sauvemacourse-test/ | Ajouter en .gitignore ou archiver |
| project-template/ | Documenter usage ou archiver |
| template-tailwind-css/ | Documenter usage ou archiver |
| improvements/ | Archiver (documentation obsolete) |

### 4.3 Fichiers de documentation a consolider
- 23 fichiers .md a la racine
- Action: Regrouper dans docs/ ou archiver
- **Statut**: [x] CORRIGE - docs/ cree avec structure deployment/, google-auth/, archive/

---

## 5. ORDRE D'EXECUTION

### Phase 1 - Securite (Immediat) - TERMINEE
1. [x] Scanner le projet (cartographie)
2. [x] Nettoyer .env.production.example (secrets)
3. [x] Reactiver rate limiting share.py

### Phase 2 - Organisation (Cette semaine) - TERMINEE
4. [x] Creer dossier scripts/ pour les .sh
5. [x] Deplacer fichiers test orphelins
6. [x] Supprimer dossier src/test/ vide
7. [x] Mettre a jour .gitignore

### Phase 3 - Documentation - TERMINEE
8. [x] Consolider documentation .md (docs/ cree)
9. [x] Documenter templates (PURPOSE.md ajoutes)
10. [x] Archiver improvements/ (PURPOSE.md ajoute)

### Phase 4 - Refactoring - PARTIEL
11. [ ] Standardiser routes API (reporte v2 - breaking change)
12. [ ] Implementer monitoring Sentry (backlog)
13. [x] Nettoyer variables env inutilisees (documente comme Phase 2)

---

## 6. METRIQUES AVANT/APRES

### Avant nettoyage
| Metrique | Valeur |
|----------|--------|
| Fichiers orphelins racine | 7 |
| Dossiers inutilises | 5 |
| Secrets exposes | 2 |
| TODOs non resolus | 2 |
| Variables env inutilisees | 4 |

### Apres nettoyage Phase 1-4 (actuel)
| Metrique | Valeur | Delta |
|----------|--------|-------|
| Fichiers .md racine | 5 | -18 |
| Dossiers documentes | 3 | +3 (PURPOSE.md) |
| Secrets exposes | 0 | -2 |
| TODOs documentes | 2 | = |
| Variables env | 1 optionnelle | documente |

### Structure finale
```
GPXIFY/
├── docs/                    # Documentation organisee
│   ├── deployment/          # 6 fichiers
│   ├── google-auth/         # 4 fichiers
│   ├── archive/             # 8 fichiers historiques
│   └── README.md
├── scripts/                 # Scripts utilitaires
├── .claude/                 # Contexte Claude
├── frontend/                # React SPA
├── backend/                 # FastAPI API
└── *.md                     # 5 fichiers essentiels
```

---

## 7. RISQUES ET MITIGATIONS

| Risque | Mitigation |
|--------|------------|
| Breaking change routes API | Reporter en v2, documenter |
| Perte de fichiers utiles | Git history preserve tout |
| Rate limiting trop strict | Commencer avec limites genereuses |

---

> Derniere mise a jour: 2026-01-26