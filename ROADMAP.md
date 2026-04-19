# ROADMAP.md — GPXIFY

Derniere mise a jour : 2026-04-19

---

## Now (pret pour le run / en cours)

- **T1 — Coverage tests backend** (services critiques a 90%, global a 70%) — priorite haute
- **T2 — Coverage tests frontend** (utils/services a 70%, global a 60%) — priorite medium
- **T3.1 — Sentry : setup account + DSN** (30min, ready)
- **T3.2 — Sentry : backend integration** (2h, ready, depend T3.1)
- **T3.3 — Sentry : frontend integration** (2h, ready, depend T3.1)
- **T3.4 — Sentry : release tagging + smoke test** (1h, ready, depend T3.2+T3.3)
- **T9.1 — Backend trail_planner + migration enum calc_mode** (2h30, ready, TDD, feedback Paul) — PR #1 draft
- **T9.2 — Frontend UI Trail Planner + store migration** (2h, ready, TDD, depend T9.1) — PR #2 draft
- **T9.3 — Doc FAQ + reponse Paul** (45min, ready, depend T9.2) — PR #3 draft
- **T10 — Fix conftest SQLite ARRAY pour debloquer tests API** (1h30, review follow-up P1)
- **T11 — Documenter fix `total_time_minutes` dans PR #1** (10min, review follow-up P1)
- **T12 — Backend borne `constant_pace_kmh` (parite frontend)** (20min)
- **T13 — Frontend UX `constantPaceInput` null** (30min)
- **T14 — Wire `CalcConfigSchema.parse()` dans buildRequest** (45min)
- **T15 — `git rm App.tsx.backup`** (5min)
- **T16 — Commentaire fatigue start-of-segment** (10min)

---

## Next (a specer ou dependances)

- **T4 — Pipeline CI GitHub Actions** (lint + tests + build) — bloquant pour enforce coverage
- **T5 — Rate limit par IP sur `/share/save`** — amelioration securite
- **T6 — Deploy production migration PTP** — attendu apres validation staging

---

## Later (idees, pas engage)

- **T7 — Google OAuth (completion)** — si use case utilisateur emerge
- **T8 — Upload Google Drive (Phase 2 PTP)** — nice-to-have, code deja commente
- **T17 — Refactor AidStationTable props → internal state** (review follow-up, preexistant)
- **T18 — Rename `paliers` → `intervals_crossed`** (cosmetique)
- Amelioration UX fusion GPX (feedback utilisateur quand gaps detectes)
- Export PDF version "brief start line" (subset du PTP pour coach)
- Heatmap de densite sur plusieurs courses (analyse multi-traces)
- Integration Strava OAuth (import direct depuis compte Strava)
- Multi-langue (i18n) — actuellement FR only

---

## Abandonne

(aucun item pour l'instant)
