# DECISIONS.md — GPXIFY

Arbitrages techniques majeurs. Une decision = contexte + options + rationale + consequences + rollback.

---

### 2026-04-18 — T9 Mode de calcul Trail Planner + migration API enum `calc_mode`

**Contexte** : User feedback (Paul) — la formule Naismith par defaut est trop rapide pour son allure, et le mode "allure personnalisee" ne permet de renseigner qu'une moyenne (pas de gestion plat/montee/descente/fatigue). Demande : un mode style "Trail Planner" avec 4 parametres.

**Options considerees** :
1. **Ajuster les coefficients Naismith** (expose la BASE_SPEED et penalites comme tunables) — correctif minimal, pas de fatigue
2. **3e mode `trail_planner` complet** — nouveau mode avec 4 params configurables + preset "Trail moyen"
3. **Offrir un editeur de formule libre** — ultra flexible mais complexite UX enorme

**Decision** : Option 2 — 3e mode complet `trail_planner` scope V1 Dashboard uniquement.

**Arbitrages techniques** :
- **Modele fatigue : lineaire progressif** (`+X% toutes les N km`). Simple, predictible, facile a expliquer. Alternatives (step, exponentiel) rejetees pour lisibilite utilisateur.
- **API : migration vers enum `calc_mode`** — remplace `use_naismith: bool`. L'API est consommee uniquement par le frontend GPXIFY (pas de clients tiers), donc aucune raison de garder l'ancien format. Option additive rejetee (modele confus "si trail_planner_config present alors ignorer use_naismith").
- **Scope V1 : Dashboard / AidStationTable uniquement** — pas PTP `RoadbookPage` (qui garde son `pace_override` pour l'instant). Evite d'exploser le scope au premier jet. PTP pourra hertier en V2.
- **Preset default** : "Trail moyen" (10 km/h plat, +6min/100m D+, -3min/100m D-, fatigue +5% / 20km). Tous les champs sont editables apres application du preset.
- **Contraintes Pydantic** : `flat_pace ∈ ]0, 30]`, `climb_penalty ∈ [0, 30]`, `descent_bonus ∈ [0, 20]`, `fatigue_percent ∈ [0, 50]`, `fatigue_interval > 0`.
- **Migration localStorage Zustand** : persist version v2, migrate `{useNaismith: true}` → `{calcMode: "naismith"}`, `{useNaismith: false, customPace}` → `{calcMode: "constant_pace", constantPaceKmh}`.
- **Breaking change strict** : l'ancien champ `use_naismith` dans le payload HTTP retourne 400 (pas 422 pour distinguer deprecation vs validation). Aide le debug cote client.

**Consequences** :
- Toutes les surfaces UI qui utilisaient `useNaismith` doivent etre migrees (Dashboard, store, types, schema, backup file `.backup` peut rester en l'etat).
- FAQ a mettre a jour pour expliquer les 3 modes.
- Metier a surveiller apres deploiement : repartition des 3 modes (opportunite de `T9.4` telemetrie rejetee au tri initial mais peut revenir plus tard).
- Conserve `pace_override` cote PTP sans modification — dette a traiter en V2 si demande utilisateur.
- Le mode est cote serveur-stateless (calcul a la volee) : aucun impact DB, aucune migration Alembic.

**Plan de rollback** :
- Code : `git revert` des commits T9.1 et T9.2.
- Frontend deploye : bump persist version a v3 pour invalider les states v2 corrompus, toast informatif "Options reinitialisees".
- Backend deploye : l'ancien payload `use_naismith` devient 400 — user devra raffraichir la page pour recuperer le nouveau bundle. Pas de data loss possible (endpoint stateless).

**Suivi** : T9.1 (backend TDD), T9.2 (frontend TDD), T9.3 (doc + reply Paul) dans TASKS.md.

---

### 2026-04-18 — T3 Sentry : plan Developer, 100% erreurs + 5% perf, scrubbing PII maximal, prod uniquement

**Contexte** : TODO documente dans `ErrorBoundary.tsx:33`, besoin de visibilite sur les erreurs prod apres completion du sprint PTP. GPXIFY traite des donnees personnelles (traces GPX = geolocalisation GDPR).

**Options considerees** :
1. **Plan Developer gratuit** (5k erreurs + 10k traces / mois, 1 user)
2. **Plan Team payant (~$26/mois)** (50k erreurs + alertes Slack)
3. **Self-hosted Sentry sur Coolify** (controle total, zero vendor lock)
4. **Alternative** (Axiom / Highlight.io / Logtail)

**Decision** : Plan Developer gratuit.

**Rationale** :
- Side-project avec un seul utilisateur decideur, trafic faible, 5k erreurs/mois largement suffisant.
- Self-hosted = dette ops disproportionnee pour le besoin actuel.
- Upgrade vers Team possible plus tard si le quota est sature.

**Arbitrages techniques lies** :
- **Sampling** : 100% erreurs, 5% perf (`tracesSampleRate=0.05`). Sur plan gratuit, 10k traces/mois peuvent se consommer vite sur `/gpx/upload` (30 req/min). 5% laisse de la visibilite Core Web Vitals + API latency sans saturer.
- **PII scrubbing maximal** (non negociable, GDPR) :
  - Strip IPs completes (user + request)
  - Strip body des requetes `/gpx/*` et `/share/*` (contiennent les traces)
  - denyList sur cles : `lat`, `lon`, `elevation`, `track_data`, `points`
  - Breadcrumbs strippes des memes cles
- **Environnement** : Production uniquement (`environment=production`). Staging/dev pollueraient le quota sans valeur ajoutee.
- **Release tagging** : via SHA Git (Vite injecte `VITE_APP_VERSION`, backend lit `SENTRY_RELEASE`).

**Consequences** :
- Dependance SaaS Sentry (GDPR : Sentry heberge en UE ou US — privilegier region EU lors de la creation du projet).
- Nouveau secret a gerer : `SENTRY_DSN` dans `.env.production`.
- Nouveau contrat : tout nouveau endpoint qui manipule des coords doit etre ajoute a la denyList du scrubber.
- Si quota sature, bascule auto vers sampling reduit ou upgrade.

**Plan de rollback** : Retirer l'appel `init_sentry()` dans `main.py` (backend) et `initSentry()` dans `main.tsx` (frontend). Desinstaller les packages. Les env vars peuvent rester.

**Suivi** : T3.1 -> T3.4 dans TASKS.md.

---

### 2026-04-18 — Bootstrap Shikamaru sur GPXIFY

**Contexte** : Projet actif en production, sprint PTP termine, plusieurs TODOs connus. Besoin de structurer le suivi inter-sessions pour eviter les oublis et tracer les decisions.

**Options considerees** :
1. **Shikamaru bootstrap complet** (TASKS / AGENTS / ROADMAP / SPEC / DECISIONS) — coherent avec les autres projets CB, decouvrable par `/shika-init`
2. **Rester sur CLAUDE.md seul** — simple mais pas de traçabilite tasks/decisions
3. **Outil externe (Linear, Notion)** — fragmentation du contexte, dependance SaaS

**Decision** : Option 1 — Shikamaru bootstrap complet.

**Rationale** : CLAUDE.md reste la constitution, Shikamaru ajoute la couche operationnelle (backlog tracable, memoire des erreurs, arbitrages). Coherent avec autres projets CB (pattern fullstack avec env-config, testing-framework, docker-deployment, ci-cd).

**Consequences** :
- Nouveaux fichiers a maintenir (TASKS, AGENTS, ROADMAP, DECISIONS)
- `/shika-speccer` et `/shika-run` utilisables sur le projet
- Obligation de logger les learnings en fin de session dans AGENTS.md

**Plan de rollback** : Supprimer les fichiers Shikamaru (TASKS.md, AGENTS.md, ROADMAP.md, SPEC.md, DECISIONS.md, .shikamaru/). CLAUDE.md et le code ne sont pas impactes.

---

### 2025-11-01 — Stack frontend : React + Vite + TailwindCSS

**Contexte** : Choix initial de stack pour la SPA d'analyse GPX.

**Options considerees** :
1. **Next.js** — SEO friendly, SSR, mais overkill pour une SPA d'analyse cote client
2. **React + Vite** — build rapide, HMR, SPA pure
3. **Svelte / SvelteKit** — plus leger mais ecosysteme plus petit

**Decision** : React + Vite + TailwindCSS.

**Rationale** : Analyse GPX = 100% cote client (pas de SSR utile), Vite optimal pour DX, React ecosysteme mature pour les integrations (Leaflet, Chart.js).

**Consequences** : Pas de SEO natif (mitige par pages Marketing/FAQ/Legal cote statique). Backend API separe obligatoire.

---

### 2025-11-01 — State management : Zustand

**Contexte** : Besoin d'un store global pour state multi-traces + preferences UI.

**Options considerees** :
1. **Redux Toolkit** — industrie standard mais boilerplate
2. **Zustand** — API minimale, hooks natifs
3. **Context + useReducer** — pas de lib, mais re-render tricky sur grosses stores

**Decision** : Zustand 5.0.

**Rationale** : API simple, TypeScript-friendly, pas de Provider hell, performance correcte (selectors).

**Consequences** : Migration future vers Redux possible si complexite explose, mais pas prevue.

---

### 2025-11-01 — Backend : FastAPI + SQLAlchemy async + PostgreSQL

**Contexte** : API REST pour parsing GPX + stockage partages + PTP.

**Options considerees** :
1. **FastAPI** — async natif, Pydantic, OpenAPI auto
2. **Flask** — simple mais async bolt-on
3. **Django REST** — lourd pour une API sans back-office

**Decision** : FastAPI 0.115 + SQLAlchemy 2.0 async + PostgreSQL.

**Rationale** : Validation Pydantic obligatoire pour inputs (GDPR, securite), async indispensable pour parsing GPX non-bloquant, OpenAPI auto genere `/docs`.

**Consequences** : Toutes les routes doivent etre async. Les services sont au coeur du code metier (pas dans les routes).

---

### 2025-11-01 — Partage anonyme : liens `/s/{share_id}` expirables

**Contexte** : Permettre le partage de traces sans auth obligatoire, respect GDPR.

**Options considerees** :
1. **Auth obligatoire** — sessions persistantes mais friction utilisateur elevee
2. **Liens anonymes expirables** — pas de friction, retention limitee
3. **Lien permanent signe** — conservation indefinie, probleme GDPR

**Decision** : Liens anonymes avec expiration 30 jours.

**Rationale** : Friction minimale, conforme au principe de minimisation GDPR, rate limit SlowAPI pour eviter l'abus.

**Consequences** : Retention automatique via `expires_at` indexe. Purge batch a prevoir (job cron ou cleanup au `GET` expire).

---

### 2026-01-27 — Sprint PTP : parsing ravitos via Claude Haiku

**Contexte** : Les sites de courses publient les tableaux de ravitos dans des formats disparates. Parser specifique par site = non scalable.

**Options considerees** :
1. **Parser manuel par site** — deterministe mais N parsers a maintenir
2. **Regex generique** — fragile, casse des qu'un site change de format
3. **LLM (Claude Haiku)** — generique, robuste aux variations de format

**Decision** : Claude Haiku via `/admin/parse-ravito-table`.

**Rationale** : Admin uniquement (pas d'abus possible), cout negligeable (~$0.001/parsing), Haiku rapide et fiable sur ce type d'extraction structuree.

**Consequences** : Dependance Anthropic API (clef `ANTHROPIC_API_KEY`). Fallback : edition manuelle via form admin si parsing echoue. Toujours valider la structure Pydantic avant insertion DB.

---

### 2026-01-28 — Migrations Alembic au boot Docker

**Contexte** : Les migrations etaient skippees au startup (Dockerfile ligne 33-34 commentee historiquement par peur de migration longue au boot). Risque : oubli d'executer migration en prod.

**Options considerees** :
1. **Migration manuelle** (ssh + `alembic upgrade head`) — historique, fragile, source d'incidents
2. **Migration auto au boot** — simple, fail-fast si migration casse
3. **Job Kubernetes pre-deploy** — overkill pour deploiement Coolify

**Decision** : Migration auto au boot (commit 4416684).

**Rationale** : Coolify redemarre le container backend au deploy, la migration fait partie du cycle de vie normal.

**Consequences** : Si une migration echoue, le container ne demarre pas (fail-fast). Prevoir rollback avec `alembic downgrade` dans le runbook deploy. Migrations doivent rester rapides (<30s).
