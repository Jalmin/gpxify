# Current Sprint - PTP (Profile to Print)

> **Dernière mise à jour** : 2026-01-27
> **Sprint** : PTP Feature
> **Période** : 2026-01-26 - 2026-01-27 (TERMINÉ)

---

## Objectifs du Sprint

### Must Have (Obligatoire)
- [x] Phase 1 : Migrations BDD (races, aid_stations, admin_settings)
- [x] Phase 2 : Backend Admin (CRUD races, auth, parsing Claude)
- [x] Phase 3 : Backend Public (GET races, sun-times)
- [x] Phase 4 : Frontend Admin (AdminPage, formulaires)
- [x] Phase 5 : Frontend Public (RoadbookPage, config)

### Should Have (Important)
- [x] Phase 6 : Profil enrichi (markers km + temps + soleil)
- [x] Phase 7 : Export PDF (html2canvas + jsPDF)

### Nice to Have (Si temps)
- [x] Phase 8 : Polish (spacing, lien Marketing, docs)

---

## Issues Actives

| Issue | Priorité | Status | Description |
|-------|----------|--------|-------------|
| PTP Backend | High | ✅ Complété | CRUD races, auth, Claude parsing |
| PTP Frontend Admin | High | ✅ Complété | Page admin avec formulaires |
| PTP Frontend Public | High | ✅ Complété | Page roadbook coureur |
| PTP Profil enrichi | Medium | ✅ Complété | Annotations Chart.js |
| PTP Export PDF | Medium | ✅ Complété | html2canvas + jsPDF |

---

## Progrès

### Complété cette semaine

#### Backend (100%)
- [x] Migration `002_add_ptp_tables.py` créée
- [x] Modèles SQLAlchemy : Race, RaceAidStation, AdminSettings
- [x] Modèles Pydantic : RaceCreate, RaceUpdate, RaceResponse, etc.
- [x] Service `race_service.py` : CRUD complet
- [x] Service `ptp_service.py` : parsing Claude + API sunrise-sunset.org
- [x] Router `admin.py` : auth + CRUD protégé
- [x] Router `races.py` : endpoints publics
- [x] Router `ptp.py` : endpoint sun-times
- [x] Variables env ajoutées : ANTHROPIC_API_KEY, ADMIN_SECRET_URL, ADMIN_PASSWORD_HASH

### Complété (Phase 4-8)
- [x] Frontend AdminPage avec login, CRUD, parsing Claude
- [x] Frontend RoadbookPage avec config coureur
- [x] Profil Chart.js avec annotations (ravitos, soleil)
- [x] Export PDF multi-pages (Coureur + Assistance)
- [x] Lien Marketing -> Roadbook

---

## Architecture PTP

### Pages
| Page | URL | Accès | Description |
|------|-----|-------|-------------|
| Admin | `/admin/{secret}` | Mot de passe | Gestion des courses |
| Roadbook | `/roadbook` | Public | Préparation coureur |

### Tables BDD
```
races
├── id (UUID)
├── name, slug
├── gpx_content (TEXT)
├── total_distance_km, total_elevation_gain/loss
├── start_location_lat/lon
├── is_published
└── created_at, updated_at

race_aid_stations
├── id (UUID)
├── race_id (FK)
├── name, distance_km, elevation
├── type ('eau'|'bouffe'|'assistance')
├── services (TEXT[])
├── cutoff_time
└── position_order

admin_settings
├── key (PK)
└── value
```

### Endpoints API
- `POST /api/v1/admin/login` - Auth admin
- `GET/POST/PUT/DELETE /api/v1/admin/races` - CRUD courses
- `POST /api/v1/admin/parse-ravito-table` - Claude parsing
- `GET /api/v1/races` - Courses publiées
- `GET /api/v1/races/{slug}` - Détails course
- `POST /api/v1/ptp/sun-times` - Lever/coucher soleil

---

## Risques & Blockers

| Risque/Blocker | Impact | Mitigation |
|----------------|--------|------------|
| Migration non exécutée en prod | High | Exécuter `alembic upgrade head` avant déploiement |
| ANTHROPIC_API_KEY manquante | Medium | Endpoint parse-ravito retourne 503 si non configurée |

---

## Notes

### Décisions prises
- **Auth admin** : URL secrète + mot de passe (pas d'OAuth)
- **Parsing ravitos** : Claude Haiku pour coût/performance
- **Sun times** : API sunrise-sunset.org (gratuit, fiable)
- **PDF export** : html2canvas + jsPDF (côté client)

### Fichiers créés (Backend)
```
backend/app/
├── models/race.py          # Pydantic models
├── models/ptp.py           # SunTimes, ParsedRavito
├── services/race_service.py
├── services/ptp_service.py
├── api/admin.py
├── api/races.py
└── api/ptp.py

backend/alembic/versions/
└── 002_add_ptp_tables.py
```

### Fichiers Frontend créés
- `frontend/src/types/ptp.ts` - Types TypeScript
- `frontend/src/pages/AdminPage.tsx` - Page admin
- `frontend/src/pages/RoadbookPage.tsx` - Page roadbook
- `frontend/src/components/PTPElevationProfile.tsx` - Profil enrichi
- `frontend/src/utils/pdfExport.ts` - Export PDF
- `frontend/src/services/api.ts` - API client (adminApi, ptpApi)

---

## Plan détaillé

Voir : `.claude/plans/enchanted-toasting-perlis.md`