---
schemaVersion: 1
project: GPXIFY
lastUpdated: 2026-04-18
---

<!-- Archive: 10 tasks done/abandoned supprimées le 2026-05-12. Voir git history: git log -p -- TASKS.md -->

> **Note 2026-04-18** : T3 (Sentry) a ete specee via `/shika-speccer` et decoupee en T3.1 -> T3.4 (section Ready). L'entree T3 originale est conservee comme parent epic en section "Next" pour traçabilite.

# Tasks

## Ready

### T1: Augmenter coverage tests backend — services critiques
**status:** ready
**type:** quality
**priority:** high

**Goal:** Passer le coverage global de ~20% a >=70%, en ciblant en priorite les services critiques (gpx_parser, statistics, ptp_service, race_service).

**Context:** CLAUDE.md cible 70% coverage (paths critiques 90%), actuel ~20%. Le sprint PTP vient d'etre termine — moment ideal pour consolider les tests avant deploiement prod. Frameworks deja en place : pytest + pytest-asyncio + pytest-cov.

**Files:**
- `backend/tests/` (ajout tests)
- `backend/app/services/gpx_parser.py` (90% cible)
- `backend/app/services/statistics.py` (90% cible)
- `backend/app/services/ptp_service.py`
- `backend/app/services/race_service.py`
- `backend/app/api/*.py` (80% cible)

**Acceptance tests:**
- [ ] `pytest --cov=app --cov-report=term-missing` affiche coverage global >=70%
- [ ] `gpx_parser.py` coverage >=90%
- [ ] `statistics.py` coverage >=90%
- [ ] Tous les endpoints API ont au moins un test happy path + un test 400/422
- [ ] Tests passent en CI (une fois CI en place — voir T4)

**Rollback:** Pas de rollback necessaire (ajout de tests uniquement).
**Timeout:** 4h

---

### T2: Augmenter coverage tests frontend — utils et services
**status:** ready
**type:** quality
**priority:** medium

**Goal:** Coverage frontend >=60% global, >=70% pour utils et services API.

**Context:** Vitest + React Testing Library deja en place. Co-localisation des tests (convention : `Component.test.tsx` a cote de `Component.tsx`). Prioriser les utils deterministes avant les composants UI.

**Files:**
- `frontend/src/utils/*.ts` + `*.test.ts`
- `frontend/src/services/api.ts` + tests avec mock axios
- `frontend/src/store/useAppStore.ts` + tests
- `frontend/src/hooks/*.ts` + tests

**Acceptance tests:**
- [ ] `npm run test:coverage` affiche global >=60%
- [ ] `src/utils/` coverage >=70%
- [ ] `src/services/` coverage >=70%
- [ ] Tests utilisent mocks explicites pour API (pas d'appels reseau reels)

**Rollback:** Pas de rollback necessaire.
**Timeout:** 3h

---

### T3.1: Setup Sentry account + SENTRY_DSN
**status:** ready
**type:** observability
**priority:** medium
**parent:** T3

**Goal:** Creer le projet Sentry (plan Developer gratuit) et propager le DSN aux env files + docs.

**Context:** Plan Developer gratuit = 5k erreurs/mois + 10k traces perf. Un seul projet Sentry, tag `environment: production`. Action principalement humaine (creation compte + projet) + commit des env files.

**Files:**
- `.env.example` (ajouter `SENTRY_DSN=`)
- `.env.production.example` (ajouter `SENTRY_DSN=`)
- `ENV_VARIABLES.md` (documenter `SENTRY_DSN`, `SENTRY_RELEASE`, `SENTRY_ENVIRONMENT`)
- `backend/app/core/config.py` (ajouter champs Settings : `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`)

**Acceptance tests:**
- [ ] Projet Sentry cree (plan Developer)
- [ ] `SENTRY_DSN` present dans les 2 `.env.*.example` (valeur vide)
- [ ] `ENV_VARIABLES.md` documente les 3 variables Sentry
- [ ] `Settings` Pydantic valide le DSN (format URL) avec fallback `None` en dev

**Rollback:** Supprimer les variables des env files + revert commit.
**Timeout:** 30min

---

### T3.2: Backend Sentry integration (FastAPI + PII scrubbing)
**status:** ready
**type:** observability
**priority:** medium
**parent:** T3
**depends_on:** T3.1

**Goal:** Initier le SDK Sentry cote backend avec scrubbing PII maximal (GDPR — traces GPX = geolocalisation sensible).

**Context:** Integration `sentry-sdk[fastapi]`. Init conditionnelle : actif uniquement si `SENTRY_DSN` defini ET `ENVIRONMENT == "production"`. Scrubbing via `before_send` : strip IPs, strip body des requetes `/gpx/*` et `/share/*`, denyList sur cles sensibles (`lat`, `lon`, `elevation`, `track_data`, `points`).

**Files:**
- `backend/requirements.txt` (ajouter `sentry-sdk[fastapi]==2.X`)
- `backend/app/core/sentry.py` (nouveau — init + before_send scrubber)
- `backend/app/main.py` (appeler `init_sentry()` avant `FastAPI()`)

**Acceptance tests:**
- [ ] `sentry-sdk[fastapi]` installe (version epinglee)
- [ ] `init_sentry()` est no-op si `ENVIRONMENT != "production"`
- [ ] `traces_sample_rate=0.05` (5% perf tracing)
- [ ] `before_send` strip : request IP, request body pour endpoints `/gpx/*` et `/share/*`
- [ ] `before_send` denyList : `lat`, `lon`, `elevation`, `track_data`, `points`
- [ ] Test unitaire `tests/test_sentry_scrubber.py` : verifier qu'un event avec un body GPX a les coords strippees
- [ ] Lancement local avec `ENVIRONMENT=production SENTRY_DSN=fake` ne crash pas

**Rollback:** Retirer import + appel `init_sentry()` dans `main.py`, desinstaller `sentry-sdk`.
**Timeout:** 2h

---

### T3.3: Frontend Sentry integration (React + PII scrubbing)
**status:** ready
**type:** observability
**priority:** medium
**parent:** T3
**depends_on:** T3.1

**Goal:** Initier `@sentry/react` dans le frontend, remplacer le TODO dans `ErrorBoundary.tsx:33`, scrubbing PII sur breadcrumbs.

**Context:** Init conditionnelle : actif seulement si `import.meta.env.VITE_SENTRY_DSN` defini ET `import.meta.env.MODE === "production"`. Scrubbing `beforeSend` : strip breadcrumbs contenant `track_data`, `points`, coords `lat/lon/elevation`. Perf tracing 5%.

**Files:**
- `frontend/package.json` (ajouter `@sentry/react`)
- `frontend/src/lib/sentry.ts` (nouveau — init + beforeSend)
- `frontend/src/main.tsx` (appeler `initSentry()` avant `ReactDOM.createRoot`)
- `frontend/src/components/ErrorBoundary.tsx` (ligne 33 : remplacer TODO par `Sentry.captureException(error, { extra: errorInfo })`)
- `.env.example` frontend (`VITE_SENTRY_DSN=`)

**Acceptance tests:**
- [ ] `@sentry/react` installe (version epinglee, compatible React 18.3)
- [ ] `initSentry()` no-op si pas en production ou pas de DSN
- [ ] `tracesSampleRate=0.05`, `browserTracingIntegration` active
- [ ] `beforeSend` : strip breadcrumbs avec cles `track_data`, `points`, `lat`, `lon`, `elevation`
- [ ] `ErrorBoundary.tsx:33` ne contient plus le TODO Sentry
- [ ] Build prod (`npm run build`) reussit sans warning TypeScript
- [ ] Test Vitest : `ErrorBoundary` appelle bien `Sentry.captureException` quand Sentry est init

**Rollback:** Revert `ErrorBoundary.tsx`, retirer `@sentry/react`, supprimer `lib/sentry.ts`.
**Timeout:** 2h

---

### T3.4: Release tagging + smoke test prod + doc observability
**status:** ready
**type:** observability
**priority:** medium
**parent:** T3
**depends_on:** T3.2, T3.3

**Goal:** Tagger les releases avec le SHA Git pour correler les erreurs Sentry a une version, smoke test sur un deploiement prod (ou staging), documenter.

**Context:** Sans release tag, impossible de savoir quelle version introduit un bug. Vite expose `VITE_APP_VERSION` au build. Backend recupere via env `SENTRY_RELEASE` (fourni par Coolify ou CI). Smoke test : declencher une erreur volontaire sur `/api/v1/sentry-debug` (endpoint test qui throw), verifier qu'elle arrive dans Sentry avec la bonne release.

**Files:**
- `frontend/vite.config.ts` (injecter `VITE_APP_VERSION` depuis `git rev-parse --short HEAD`)
- `backend/app/main.py` (endpoint `/api/v1/sentry-debug` GUARDE par `ENVIRONMENT != "production"`)
- `backend/app/core/sentry.py` (lire `SENTRY_RELEASE` depuis env)
- `docs/OBSERVABILITY.md` (nouveau — runbook Sentry)

**Acceptance tests:**
- [ ] Sentry prod recoit une erreur avec `release=<sha>` tag
- [ ] `environment=production` tag visible dans Sentry
- [ ] Endpoint `/api/v1/sentry-debug` existe uniquement en non-prod (404 en prod)
- [ ] `docs/OBSERVABILITY.md` documente : comment lire les erreurs, comment ajuster le sampling, comment invalider un release
- [ ] Test end-to-end : build frontend + backend avec SENTRY_DSN reel de test, trigger erreur, voir dans Sentry

**Rollback:** Retirer endpoint debug + revert vite.config, doc peut rester.
**Timeout:** 1h

---

## Ready — Sprint Consolidation GPX-toolbox (specé 2026-07-10 via /shika-speccer)

### T19: [chore] Nettoyage repo — tooling hors-sujet, templates trackés, build Docker reproductible
**status:** ready
**type:** cleanup
**priority:** high
**Tier:** S

**Goal:** Sortir du repo les artefacts hors-sujet (arctic-tracker.ts), détracker les 89 fichiers de templates gitignorés, et rendre le build Docker backend reproductible (gunicorn épinglé dans requirements).

**Context:** Audit 2026-07-10 : `scripts/arctic-tracker.ts` est du tooling Shikamaru sans rapport avec GPXIFY ; `improvements/`, `project-template/`, `template-tailwind-css/` sont trackés malgré le `.gitignore` (89 fichiers de poids mort) ; le Dockerfile fait `pip install gunicorn` au runtime dans le CMD (build non reproductible, accès réseau requis au boot) ; `httpx==0.27.2` est épinglé en double dans requirements.txt et requirements-dev.txt.

**Files:**
- `scripts/arctic-tracker.ts` (suppression)
- `backend/requirements.txt`
- `backend/requirements-dev.txt`
- `backend/Dockerfile`

**Done:**
- [ ] `git ls-files improvements/ project-template/ template-tailwind-css/ | wc -l` retourne 0 (via `git rm -r --cached`, fichiers locaux préservés)
- [ ] `scripts/arctic-tracker.ts` n'existe plus (après vérification qu'aucun skill `.claude/commands/*.md` ne le référence — sinon le déplacer vers `.claude/` au lieu de supprimer)
- [ ] `gunicorn` épinglé dans `backend/requirements.txt` et le CMD du Dockerfile ne contient plus `pip install`
- [ ] `httpx` n'apparaît que dans un seul des deux fichiers requirements
- [ ] `docker compose build backend` réussit

**Boundaries:**
- ✅ **Always:** `git rm --cached` uniquement pour les templates (les fichiers restent sur le disque)
- 🚫 **Never:** toucher aux `.gpx` locaux, à `.claude/`, `.shikamaru/` (tooling actif) ni à `TASKS.md`

**Smoke:** (backend détecté — Dockerfile CMD modifié)
- assert: `docker compose build backend && docker compose run --rm backend python -c "import gunicorn; print('OK')"` affiche `OK`

**Rollback:** `git revert` du commit + `git checkout` des fichiers détrackés si besoin.
**Durée:** 30 min

---

### T20: [docs] Resynchroniser CLAUDE.md et TASKS.md avec l'état réel du code
**status:** ready
**type:** cleanup
**priority:** medium
**Tier:** S

**Goal:** Corriger dans `.claude/CLAUDE.md` les points rendus obsolètes depuis janvier (audit 2026-07-10) et dédupliquer l'epic T3 dans TASKS.md.

**Context:** La doc pré-date la migration auto Alembic (Dockerfile:37) : la section 10 liste encore "migrations skippées en production" comme problème connu ET comme dette technique, alors que c'est résolu. Les comptages ont drifté (28 composants réels vs 33 documentés, 7 pages vs 5, 12 services vs 13, 3 migrations vs 1 citée). L'epic T3 apparaît en double dans TASKS.md (section Next, lignes ~190 et ~207).

**Files:**
- `.claude/CLAUDE.md`
- `TASKS.md`

**Done:**
- [ ] La section 10 ne mentionne plus "Migrations Alembic skippees" ni la dette "pas executees automatiquement au demarrage Docker" (déplacées en "Problemes Resolus" avec date)
- [ ] Comptages corrigés partout : 28 composants, 7 pages, 12 services, 6 fichiers tests backend, 3 migrations Alembic
- [ ] TASKS.md ne contient plus qu'une seule entrée epic T3 (celle avec le découpage T3.1→T3.4)
- [ ] La ligne "Derniere mise a jour" du CLAUDE.md porte la date du commit

**Boundaries:**
- ✅ **Always:** ne corriger que les faits vérifiés par l'audit du 2026-07-10
- 🚫 **Never:** réécrire des sections entières ni changer la structure du CLAUDE.md

**Rollback:** `git revert` (doc uniquement).
**Durée:** 15-20 min

---

### T21: [refactor] Extraire la logique race_recovery du router vers un service dédié
**status:** ready
**type:** cleanup
**priority:** high
**Tier:** M

**Goal:** Déplacer les ~350 lignes de logique métier de `backend/app/api/race_recovery.py` vers un nouveau `race_recovery_service.py`, le router ne gardant que validation d'upload et mapping HTTP — comportement strictement identique.

**Context:** Le router race_recovery (387 lignes) contient 100% de la logique inline (find_closest_point_index, modèle de vitesse ajustée pente, recherche binaire des timestamps), ce qui viole la règle projet "pas de logique métier dans les routes" (CLAUDE.md §7). C'est le préalable à toute évolution de l'outil de sauvetage de trace, axe produit prioritaire.

**Files:**
- `backend/app/api/race_recovery.py`
- `backend/app/services/race_recovery_service.py` (nouveau)
- `backend/tests/test_race_recovery.py`

**Prompt Claude Code:**
```
1. Lire race_recovery.py en entier et lister les fonctions pures (parse_time_duration,
   find_closest_point_index, calculs vitesse/pente, reconstruction timestamps).
2. AVANT tout déplacement : ajouter un test golden dans test_race_recovery.py —
   appeler l'endpoint /recover avec les fixtures existantes, sauvegarder le GPX
   résultat, l'assert byte-à-byte (l'algo est déterministe).
3. Créer race_recovery_service.py : déplacer toutes les fonctions + la logique
   d'orchestration dans une fonction recover_race_track(...) avec type hints
   et docstrings Google style. Aucun changement d'algorithme.
4. Réduire le router : parsing UploadFile/Form, appel du service, mapping des
   ValueError du service vers HTTPException 400 avec les MÊMES messages qu'avant.
5. Lancer pytest : tests existants + golden passent sans modification de leurs asserts.
```

**Done:**
- [ ] `race_recovery.py` (router) ne contient plus aucune fonction de calcul (uniquement I/O HTTP), < 100 lignes
- [ ] Toutes les fonctions déplacées dans `race_recovery_service.py` avec type hints complets
- [ ] Test golden ajouté : même GPX d'entrée → GPX de sortie identique avant/après refactor
- [ ] `pytest backend/tests/test_race_recovery.py` passe sans modification des asserts existants

**Edge cases:**
| Situation | Comportement |
|-----------|-------------|
| Messages d'erreur 400 (GPX invalide, format temps) | Identiques au caractère près (contrat API public) |
| Creator string "GPX Ninja - Race Recovery" | Inchangé dans le GPX exporté |
| Import circulaire service ↔ utils/elevation_quality | Le service importe utils, jamais l'inverse |

**Boundaries:**
- ✅ **Always:** préserver la signature de l'endpoint (noms des champs Form/File) et les messages d'erreur
- ⚠️ **Ask first:** si un comportement actuel semble être un bug pendant le déplacement — le noter, ne PAS le corriger dans cette task
- 🚫 **Never:** modifier l'algorithme (modèle vitesse, bornes 30-200%, recherche binaire 50 itérations)

**Fallback:** si le test golden diffère après extraction → bisecter fonction par fonction, ne pas merger tant que non-identique.

**Smoke:** (backend détecté)
- start_cmd: `cd backend && uvicorn app.main:app --port 8000`
- assert: `curl -sf -X POST localhost:8000/api/v1/race/recover -F "incomplete_gpx=@tests/fixtures ou GPX généré" -F "complete_gpx=@..." -F "official_time=05:30:00" -o /tmp/rec.gpx && python -c "import gpxpy; gpxpy.parse(open('/tmp/rec.gpx'))"` — HTTP 200 + GPX parsable (réutiliser les GPX générés par les fixtures de test_race_recovery.py)

**Rollback:** `git revert` (1 commit atomique).
**Durée:** 60 min

---

### T22: [core] Détection spatiale des gaps dans le merge GPX
**status:** ready
**type:** core
**priority:** high
**Tier:** M

**Goal:** Ajouter dans `GPXMergeService` la détection des gaps **spatiaux** (distance haversine entre le dernier point d'un fichier et le premier du suivant) en complément de la détection temporelle existante.

**Context:** Aujourd'hui la détection de gaps est purement temporelle (`time_gap > 300s`) : deux traces distantes de 10 km mais proches en temps fusionnent silencieusement, et les traces **sans timestamps** ne déclenchent aucune détection. Pour un outil de soudure fiable (axe produit), le gap spatial doit être détecté même sans horodatage.

**Files:**
- `backend/app/services/gpx_merge_service.py`
- `backend/app/models/gpx.py` (MergeOptions : ajout `spatial_gap_threshold_m`)
- `backend/tests/test_merge.py`

**TDD Tests d'abord:**
1. Deux fichiers séparés de ~10 km sans timestamps → warning "spatial gap" avec distance + coords, et split en 2 segments → attendu : warning présent, 2 segments
2. Deux fichiers contigus (< seuil) sans timestamps → aucun warning spatial → attendu : 1 segment, 0 warning
3. Gap à la fois temporel ET spatial → un seul split, les deux warnings émis (pas de double split) → attendu : 2 segments, 2 warnings
4. Seuil custom `spatial_gap_threshold_m=50` sur un gap de 100 m → warning émis → attendu : détection au seuil configuré

**Prompt Claude Code:**
```
1. Écrire les 4 tests TDD ci-dessus dans test_merge.py (rouge).
2. Ajouter spatial_gap_threshold_m: int = 500 dans MergeOptions (modèle Pydantic,
   ge=10, le=100000).
3. Dans gpx_merge_service.py, au point de jonction entre fichiers (là où le
   time_gap est déjà calculé) : calculer la distance haversine entre dernier
   point du fichier N et premier du fichier N+1. Réutiliser la fonction
   haversine existante du projet (chercher dans services/ ou utils/ — ne pas
   en recréer une).
4. Si distance > seuil : émettre warning f"Spatial gap: {distance:.0f}m between
   {file_a} and {file_b} at ({lat},{lon})" et splitter le segment (même
   mécanique que le gap temporel, en respectant interpolate_gaps).
5. Si gap temporel ET spatial au même point : un seul split, deux warnings.
6. pytest vert, puis vérifier qu'aucun test existant ne casse.
```

**Done:**
- [ ] Les 4 tests TDD passent
- [ ] Un merge de 2 traces sans timestamps séparées de 10 km produit un warning contenant la distance
- [ ] `spatial_gap_threshold_m` exposé dans MergeOptions avec défaut 500 et bornes validées Pydantic
- [ ] Les tests merge existants passent sans modification (comportement temporel inchangé)

**Edge cases:**
| Situation | Comportement |
|-----------|-------------|
| Fichier d'un seul point | Distance calculée sur ce point unique, pas de crash |
| Gap spatial ET temporel simultanés | 1 seul split, 2 warnings distincts |
| Traces sans timestamps (tri impossible) | Ordre d'upload préservé + détection spatiale active quand même |
| Seuil aberrant (0 ou négatif) | Rejeté par validation Pydantic (ge=10), 422 |

**Boundaries:**
- ✅ **Always:** réutiliser la fonction haversine existante du projet (distance_calculator)
- ⚠️ **Ask first:** avant de changer le seuil temporel existant (300 s) — hors scope
- 🚫 **Never:** modifier le comportement du merge quand aucun gap spatial n'existe (zéro régression)

**Fallback:** si le calcul de distance échoue sur un point (coords manquantes/aberrantes) → log warning + skip la détection spatiale pour cette jonction, le merge continue (ne jamais faire échouer un merge à cause de la détection).

**Smoke:** (backend détecté)
- start_cmd: `cd backend && uvicorn app.main:app --port 8000`
- assert: `curl -sf -X POST localhost:8000/api/v1/gpx/merge` avec 2 GPX de test séparés de >1 km (générés par script inline) → la réponse JSON contient un warning matchant `grep -i "spatial"`

**Rollback:** `git revert` ; le champ MergeOptions est additif (défaut = comportement qui préserve l'API).
**Durée:** 60-90 min

---

### T23: [core] Interpolation réelle des gaps au merge (`interpolate_gaps=True`)
**status:** ready
**type:** core
**priority:** high
**depends_on:** T22
**Tier:** M

**Goal:** Implémenter la vraie interpolation de points dans les gaps détectés quand `interpolate_gaps=True` : aujourd'hui le flag ne fait qu'éviter le split de segment, alors que l'UI promet "ligne droite entre les gaps" (checkbox cochée par défaut).

**Context:** [GPXMerge.tsx:26] expose `interpolate_gaps: true` par défaut avec la promesse "ligne droite entre les gaps", mais `gpx_merge_service.py:137` se contente de ne pas splitter — aucun point n'est généré. La promesse UI est cassée depuis le début. Dépend de T22 (mêmes fichiers, la détection spatiale définit les gaps à combler).

**Files:**
- `backend/app/services/gpx_merge_service.py`
- `backend/tests/test_merge.py`

**TDD Tests d'abord:**
1. Gap de 1 km avec timestamps des deux côtés + `interpolate_gaps=True` → points intermédiaires tous les ~100 m, timestamps strictement croissants entre les deux bornes → attendu : ≥8 points insérés, temps monotones
2. Gap sans timestamps + `interpolate_gaps=True` → points interpolés sans attribut time → attendu : points présents, time=None
3. `interpolate_gaps=False` sur le même gap → aucun point inséré, segment splitté (comportement T22 inchangé)
4. Warning de traçabilité : la réponse contient "interpolated N points" pour chaque gap comblé

**Prompt Claude Code:**
```
1. Écrire les 4 tests TDD (rouge).
2. Dans gpx_merge_service.py, quand un gap (temporel OU spatial, cf. T22) est
   détecté ET interpolate_gaps=True : générer des points en interpolation
   linéaire lat/lon/élévation entre les deux points frontière, espacement
   cible 100 m (min 1 point, cap 500 points par gap).
3. Timestamps : interpolation linéaire si les deux bornes sont horodatées,
   sinon time=None sur les points générés.
4. Élévation : linéaire si les deux bornes en ont une, sinon None (ne pas
   inventer une altitude d'un seul côté).
5. Émettre un warning par gap comblé : "interpolated {n} points over {d:.0f}m
   between {file_a} and {file_b}".
6. pytest vert + tests T22 et existants inchangés.
```

**Done:**
- [ ] Les 4 tests TDD passent
- [ ] `interpolate_gaps=True` génère des points intermédiaires (espacement ~100 m, cap 500/gap) au lieu de simplement ne pas splitter
- [ ] Chaque gap comblé produit un warning "interpolated N points" (traçabilité des données fabriquées)
- [ ] `interpolate_gaps=False` conserve exactement le comportement split de T22

**Edge cases:**
| Situation | Comportement |
|-----------|-------------|
| Gap énorme (>50 km) | Interpolation cappée à 500 points + warning explicite sur la taille du gap |
| Élévation présente d'un seul côté | Points générés avec ele=None (jamais extrapoler) |
| Timestamps incohérents (borne B antérieure à A) | Pas d'interpolation de temps (time=None) + warning |
| Gap sous le seuil de détection | Aucune interpolation (rien à combler) |

**Boundaries:**
- ✅ **Always:** tracer chaque interpolation dans les warnings de la réponse (l'utilisateur doit savoir que des points sont fabriqués)
- ⚠️ **Ask first:** avant de toucher au label de la checkbox frontend (hors scope, backend only)
- 🚫 **Never:** interpoler sans warning, ni générer des timestamps non-monotones

**Fallback:** si l'interpolation échoue sur un gap (données aberrantes) → retomber sur le comportement split (T22) + warning, ne jamais faire échouer le merge.

**Smoke:** (backend détecté)
- start_cmd: `cd backend && uvicorn app.main:app --port 8000`
- assert: `curl -sf -X POST localhost:8000/api/v1/gpx/merge` avec 2 GPX séparés de ~1 km et `interpolate_gaps=true` → le GPX résultat contient plus de points que la somme des 2 entrées ET la réponse contient un warning `grep -i "interpolated"`

**Rollback:** `git revert` ; aucun changement de schéma API (le flag existait déjà).
**Durée:** 90 min

---

## Next (pas ready, besoin de specer ou dependances)

### T3: [EPIC] Integration Sentry frontend + backend
**status:** next (epic — voir T3.1 -> T3.4 pour les tasks ready)
**type:** observability
**priority:** medium

**Goal:** Monitoring erreurs prod via Sentry sur les deux stacks.

**Decoupage (specee 2026-04-18) :**
- T3.1 — Setup Sentry account + SENTRY_DSN (ready)
- T3.2 — Backend Sentry integration (ready, depend T3.1)
- T3.3 — Frontend Sentry integration (ready, depend T3.1)
- T3.4 — Release tagging + smoke test (ready, depend T3.2+T3.3)

**Arbitrages** : plan Developer gratuit, 100% erreurs + 5% perf, scrubbing PII maximal (GDPR), production uniquement. Voir DECISIONS.md entree 2026-04-18.

---

### T4: Pipeline CI GitHub Actions
**status:** next
**type:** devops
**priority:** medium

**Goal:** Lint + tests + build bloquants avant merge sur main.

**Context:** Pattern `ci-cd` selectionne dans les briques Shikamaru. Aucun `.github/workflows/` detecte dans le repo actuellement. Permet d'enforce le coverage minimum (voir T1/T2).

**Files (preview):**
- `.github/workflows/ci.yml` (matrix frontend/backend)
- `.github/workflows/docker-build.yml` (build + push image sur tag)

**Pre-requis:** T1 ou T2 avance pour ne pas bloquer sur coverage jour 1.

---

### T5: Rate limiting par IP sur `/share/save`
**status:** next
**type:** security
**priority:** medium

**Goal:** Remplacer le rate limit global par un rate limit par IP sur `/share/save`.

**Context:** TODO documente dans `share.py:64`. Evite qu'un seul abuseur pollue le partage pour tous. SlowAPI supporte nativement `get_remote_address`.

**Files (preview):**
- `backend/app/api/share.py`
- `backend/app/middleware/rate_limit.py`

---

### T6: Deploy production migration PTP
**status:** next
**type:** release
**priority:** high

**Goal:** Deployer la migration `002_add_ptp_tables.py` + feature PTP en production.

**Context:** Sprint PTP termine, migrations Alembic maintenant auto au boot Docker (commit 4416684, 2026-01-28). Besoin : cheklist deploy, verification post-deploy, plan rollback.

**Files (preview):**
- `backend/alembic/versions/002_add_ptp_tables.py`
- Script de smoke test post-deploy
- Mise a jour `CREDENTIALS.md` si necessaire (ADMIN_PASSWORD_HASH prod)

**Pre-requis:** Valider en staging d'abord. Coordination avec ops.

---

## Review follow-ups (issu de /shika-review 2026-04-19 sur PRs #1-3)

### T17: [frontend] Refactor AidStationTable props → internal state (later)
**status:** later
**type:** refactor
**priority:** low
**origin:** /shika-review 2026-04-19 (Issue 9, P2 — preexistant, hors scope T9)

**Goal:** Remplacer le pattern `useState(initialXxx)` par soit (a) state pur interne (fully controlled), soit (b) `useEffect` de sync quand les props changent.

**Context:** Pattern fragile si parent re-render avec nouvelles props sans unmount. Pas declenche aujourd'hui par les flows existants. Preexistant avant T9.2.

**Files:**
- `frontend/src/components/AidStationTable.tsx:62-67`

**Timeout:** 1h (refactor + tests)

---

### T18: [cosmetic] Rename `paliers` → `intervals_crossed`
**status:** later
**type:** cosmetic
**priority:** low
**origin:** /shika-review 2026-04-19 (Issue 10, P3)

**Goal:** Remplacer la variable francaise `paliers` dans `time_calculator.py:82` par un nom anglais pour coherence avec le reste du code.

**Files:**
- `backend/app/services/time_calculator.py:82`

**Acceptance tests:**
- [ ] `paliers` remplace par `intervals_crossed` (ou `steps`)
- [ ] Tous les tests passent (aucun changement de comportement)

**Timeout:** 5min

---

## Later (ideas, pas engage)

### T7: Google OAuth (completion)
Partiellement configure, a completer si use case utilisateur emerge.

### T8: Upload Google Drive (Phase 2 PTP)
Code commente dans `gpx.py`. Nice-to-have pour persistance user cote Drive.

---

## Done

(aucune task tracee dans TASKS.md — historique dans `git log` jusqu'ici)
