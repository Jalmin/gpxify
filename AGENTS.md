# AGENTS.md — Memoire inter-sessions GPXIFY

> A lire au debut de chaque session. Ajouter une entree en fin de session si un probleme ou workaround non-evident a ete rencontre.

---

## Learnings

### 2026-04-18 — Feedback utilisateur Paul : Naismith trop rapide
**Contexte** : User Paul ecrit un feedback positif + remarque : la formule par defaut (Naismith @ 12 km/h) est trop rapide pour son allure, et le mode "allure personnalisee" ne permet qu'une moyenne.
**Insight** : Pour les publics rando / ultra, Naismith sous-estime systematiquement le temps. Un mode configurable 4-parametres est l'attendu (pattern `Trail Planner`). Le feedback est utilisable comme lean validation avant de le coder — tout le monde demande des parametres separes plat / montee / descente / fatigue.
**Application** : Toujours garder un path pour les modes "expert" a cote des presets. Pattern pour futures features : preset-first mais editable (voir T9.2 `TRAIL_PLANNER_PRESETS`).

### 2026-01-28 — Migrations Alembic au boot Docker
**Contexte** : Les migrations etaient skippees en prod (Dockerfile ligne 33-34 commentee).
**Fix** : Commit 4416684 reactive `alembic upgrade head` au startup du container backend.
**Application** : Ne plus commenter cette ligne. Toujours tester migration sur staging avant prod.

### 2026-01-28 — Colonne `cutoff_time` trop courte
**Contexte** : Certaines courses PTP utilisent des formats `DD:HH:MM` ou `JJdHH:MM`, debordent du varchar(10).
**Fix** : Commit e3d48a0 passe la colonne a varchar(50).
**Application** : Pour les champs texte libre venant de sources externes (scraping, parsing Claude), prevoir large des le depart.

### 2026-01-28 — Parsing ravitos via Claude Haiku
**Contexte** : Les tableaux de ravitos des sites de courses n'ont pas de format standard.
**Solution** : Claude Haiku (`/admin/parse-ravito-table`) fait le parsing depuis texte brut ou copie-colle.
**Gotcha** : Reponse fragile — toujours valider la structure Pydantic cote serveur avant d'inserer.

### 2026-01-26 — Rate limiting `share.py`
**Contexte** : Le rate limit etait desactive "temporairement" puis oublie.
**Fix** : Reactive a 10/minute.
**Application** : Tout rate limit desactive doit avoir un TODO tracable + date de reactivation.

---

## Erreurs connues

### Sprint PTP pas encore deploye en prod
**Symptome** : Feature roadbook presente en dev/staging mais pas accessible sur le domaine prod.
**Cause** : Migration `002_add_ptp_tables.py` pas encore executee en prod + `ADMIN_PASSWORD_HASH` a configurer.
**Suivi** : Voir TASKS.md T6.

### Coverage tests faible (~20%)
**Symptome** : Regressions possibles non detectees avant deploiement.
**Cause** : Historiquement dev feature-first, tests ajoutes au fil de l'eau.
**Suivi** : Voir TASKS.md T1 (backend) et T2 (frontend).

### Monitoring prod absent
**Symptome** : Erreurs prod silencieuses, debug a l'aveugle.
**Cause** : Sentry pas integre (TODO `ErrorBoundary.tsx:33`).
**Suivi** : Voir TASKS.md T3.

---

## Conventions projet importantes

- **Jamais** de SQL brut avec interpolation (voir `.claude/rules/security.md`).
- **Jamais** de `any` TypeScript sauf cas exceptionnels documentes.
- **Toujours** valider les inputs avec Pydantic cote backend.
- **Toujours** utiliser les services `/backend/app/services/` pour la logique metier (pas dans les routes).
- **Migrations** : Alembic obligatoire pour tout changement de schema.
- **Partages** : retention 30j max (GDPR), pas de stockage permanent de traces.

---

## Agents externes utilises

- **Claude Haiku** (`@anthropic-ai/sdk`) — parsing tableau ravitos (PTP admin).
  - Cout : faible (~$0.001 / parsing)
  - Fallback : edition manuelle via form admin si parsing echoue.
