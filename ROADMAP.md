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

---

## Done (sprint T9 + review follow-ups — merge 2026-04-19)

- **T9.1** Backend trail_planner + migration enum calc_mode — PR #1 merged (commit d9915f4)
- **T9.2** Frontend UI Trail Planner + store migration — PR #2 merged (commit abec604)
- **T9.3** Doc FAQ (+ reply Paul a envoyer manuellement) — PR #3 merged (commit d7b8226)
- **T10** Fix conftest SQLite ARRAY — PR #4 merged (commit 798dabc)
- **T11** Side effects doc dans PR #1 body
- **T12** Borne `constant_pace_kmh le=30` (integre PR #1)
- **T13** UX constantPaceInput null + placeholder (integre PR #2)
- **T14** Wire CalcConfigSchema.parse() dans buildRequest (integre PR #2)
- **T15** git rm App.tsx.backup + .gitignore — PR #5 merged (commit 46237b2)
- **T16** Commentaire fatigue start-of-segment (integre PR #1)

**Action humaine restante :** envoyer la reponse a Paul (draft dans AGENTS.md 2026-04-18).

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
