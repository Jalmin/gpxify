# Current Sprint - PTP (Profile to Print)

> **Dernière mise à jour** : 2026-01-26
> **Sprint** : PTP Feature
> **Période** : 2026-01-26 - En cours

---

## Objectifs du Sprint

### Must Have (Obligatoire)
- [x] Phase 1 : Migrations BDD (races, aid_stations, admin_settings)
- [x] Phase 2 : Backend Admin (CRUD races, auth, parsing Claude)
- [x] Phase 3 : Backend Public (GET races, sun-times)
- [ ] Phase 4 : Frontend Admin (AdminPage, formulaires)
- [ ] Phase 5 : Frontend Public (RoadbookPage, config)

### Should Have (Important)
- [ ] Phase 6 : Profil enrichi (markers km + temps + soleil)
- [ ] Phase 7 : Export PDF (html2canvas + jsPDF)

### Nice to Have (Si temps)
- [ ] Phase 8 : Polish (CSS print, responsive, tests)

---

## Issues Actives

| Issue | Priorité | Status | Description |
|-------|----------|--------|-------------|
| PTP Backend | High | ✅ Complété | CRUD races, auth, Claude parsing |
| PTP Frontend Admin | High | 🔄 À faire | Page admin avec formulaires |
| PTP Frontend Public | High | 🔄 À faire | Page roadbook coureur |

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

### En cours
- [ ] Frontend AdminPage (Phase 4)

### À venir
- [ ] Frontend RoadbookPage (Phase 5)
- [ ] Profil Chart.js avec annotations (Phase 6)
- [ ] Export PDF multi-pages (Phase 7)

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

### Prochaines étapes Frontend
1. Installer `chartjs-plugin-annotation`, `html2canvas`, `jspdf`
2. Créer types TypeScript dans `types/ptp.ts`
3. Créer API client dans `services/api.ts`
4. AdminPage : login + CRUD + preview
5. RoadbookPage : sélecteur + config + profil + PDF

---

## Plan détaillé

Voir : `.claude/plans/enchanted-toasting-perlis.md`