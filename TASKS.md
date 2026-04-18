---
schemaVersion: 1
project: GPXIFY
lastUpdated: 2026-04-18
---

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

### T9.1: [TDD] Backend TimeCalculator trail_planner + migration API enum `calc_mode`
**status:** ready
**type:** feature
**priority:** medium
**parent:** T9
**origin:** Feedback Paul (user) — Naismith trop rapide pour son allure

**Goal:** Ajouter un 3e mode de calcul `trail_planner` (allure plat + penalite montee + bonus descente + facteur fatigue lineaire) au `TimeCalculator`, migrer l'API de `use_naismith: bool` vers `calc_mode: CalcMode` (enum 3 valeurs).

**Context:** Aujourd'hui `TimeCalculator` a 2 modes (Naismith fige a 12 km/h, ou allure constante). Paul (user) demande un mode "Trail Planner" avec 4 parametres ajustables. L'API est consommee uniquement par le frontend GPXIFY → migration cleaner en enum sans retrocompat.

**Files:**
- `backend/app/services/time_calculator.py` (etendu)
- `backend/app/models/gpx.py` (enum `CalcMode`, `TrailPlannerConfig`, `AidStationTableRequest` migre)
- `backend/app/services/aid_station_service.py` (propager `cumulative_distance_km` pour fatigue)
- `backend/app/services/gpx_parser.py` (signature mise a jour)
- `backend/app/api/gpx.py` (endpoint reutilise le nouveau modele)
- `backend/tests/test_time_calculator.py` (nouveau)
- `backend/tests/test_api.py` (etendu — migration tests use_naismith)

**TDD — Red step (tests d'abord, doivent echouer) :**
1. Regression : tests Naismith existants passent toujours avec `calc_mode=NAISMITH`
2. Regression : tests constant_pace existants passent avec `calc_mode=CONSTANT_PACE`
3. `trail_planner` baseline : 10km plat, 0 D+, 0 D-, fatigue=0 → 60min @ 10 km/h
4. `trail_planner` climb : 10km + 500m D+, penalty 6min/100m → base 60 + 5*6 = 90min
5. `trail_planner` descent : 10km + 500m D-, bonus 3min/100m → base 60 - 5*3 = 45min
6. `trail_planner` fatigue : 40km, +5%/20km → temps raw * 1.10 (2 intervalles depasses)
7. `trail_planner` fatigue partielle : cumulative 15km, interval 20km → multiplier = 1.0 (pas de palier)
8. API 422 si `calc_mode=trail_planner` sans `trail_planner_config`
9. API 422 si `calc_mode=constant_pace` sans `constant_pace_kmh`
10. API 422 si `flat_pace_kmh <= 0` ou `> 30`
11. API 422 si `fatigue_interval_km = 0`
12. API 400 si ancien champ `use_naismith` present (deprecation stricte)
13. Edge : segment distance=0 → return 0
14. Edge : temps qui deviendrait negatif (gros bonus descente) → clamp `max(0, total)`

**TDD — Green step (impl minimale) :**
- Enum `CalcMode(str, Enum)` : `NAISMITH = "naismith"`, `CONSTANT_PACE = "constant_pace"`, `TRAIL_PLANNER = "trail_planner"`
- `TrailPlannerConfig(BaseModel)` avec contraintes Pydantic : `flat_pace_kmh: float = Field(gt=0, le=30)`, `climb_penalty_min_per_100m: float = Field(ge=0, le=30)`, `descent_bonus_min_per_100m: float = Field(ge=0, le=20)`, `fatigue_percent_per_interval: float = Field(default=0, ge=0, le=50)`, `fatigue_interval_km: float = Field(default=20, gt=0)`
- `AidStationTableRequest` : remplacer `use_naismith` par `calc_mode: CalcMode = CalcMode.NAISMITH`, ajouter `constant_pace_kmh: Optional[float]`, `trail_planner_config: Optional[TrailPlannerConfig]` + `@model_validator(mode="after")` qui enforce la coherence
- `TimeCalculator.estimate_segment_time()` : ajouter params `calc_mode`, `trail_planner_config`, `cumulative_distance_km: float = 0`
- `_calculate_trail_planner_time()` : `base = distance_km / flat_pace * 60` + `climb = (D+/100) * penalty` - `descent = (D-/100) * bonus`, puis `multiplier = 1 + floor(cumulative_km / interval) * (fatigue_percent / 100)`, `total = raw * multiplier`, `return max(0, total)`
- `AidStationService` : accumuler `cumulative_km` segment apres segment, passer au calculator

**TDD — Refactor step :**
- Extraire dataclass / methode privee pour eviter fonction a 10 args
- Docstrings Google-style
- mypy strict pass

**Conditions aux limites (edge cases) :**

| Cas | Comportement attendu | Test |
|-----|---------------------|------|
| `calc_mode=trail_planner` sans config | HTTP 422 `trail_planner_config required` | test_api #8 |
| `flat_pace_kmh = 0` | HTTP 422 Pydantic | test_api #10 |
| `flat_pace_kmh = 31` | HTTP 422 (protection abuse) | test_api #10 |
| `fatigue_interval_km = 0` | HTTP 422 | test_api #11 |
| `fatigue_percent_per_interval = 0` | Fatigue desactivee (multiplier = 1.0) | test #6bis |
| `cumulative_distance_km < 0` | `ValueError` (defensive, ne devrait jamais arriver) | test unitaire |
| Temps final negatif (bonus descente enorme) | Clamp `max(0, total)` | test #14 |
| Distance segment = 0 | `return 0` (no crash) | test #13 |
| Ancien champ `use_naismith` dans payload | HTTP 400 avec message `deprecated, use calc_mode` | test #12 |

**Fallbacks :**
- Si `cumulative_distance_km` pas propage par `AidStationService` (bug regression) → default 0, fatigue ignoree (no crash, coverage test force la propagation)
- Si validation Pydantic laisse passer une config invalide (hypothese defensive) → fallback silencieux `max(0, total)` + log warning

**Acceptance — Definition of Done :**
- [ ] 14+ tests unitaires `time_calculator` passent
- [ ] 7+ tests API `aid-station-table` passent
- [ ] Coverage `time_calculator.py` >= 95%
- [ ] Coverage `aid_station_service.py` >= 90%
- [ ] `grep -r "use_naismith" backend/app/` retourne vide
- [ ] `grep -r "USE_NAISMITH" backend/app/` retourne vide
- [ ] OpenAPI `/docs` montre `calc_mode: CalcMode` enum + `TrailPlannerConfig` schema
- [ ] Aucun test existant n'a ete supprime (sauf remplacement explicite `use_naismith` → `calc_mode`)
- [ ] `mypy backend/app/services/time_calculator.py` pass sans erreur
- [ ] `pytest -v` : aucun skip non justifie

**Rollback :**
- `git revert <sha>` du commit backend
- Si deploye et user envoie ancien payload `use_naismith` : erreur 400 claire avec message d'aide (pas de data loss — endpoint stateless)
- Aucune migration DB impactee (aid station n'utilise pas la DB)

**Timeout :** 2h30

---

### T9.2: [TDD] Frontend UI AidStationTable + store + schema Zod (mode Trail Planner)
**status:** ready
**type:** feature
**priority:** medium
**parent:** T9
**depends_on:** T9.1

**Goal:** Ajouter la 3e option "Trail Planner" au composant `AidStationTable.tsx` avec form 5 parametres + preset "Trail moyen", migrer le store Zustand et le schema Zod.

**Context:** Paul demande un mode avec 4 parametres (flat pace, climb penalty, descent bonus, fatigue). Preset par defaut "Trail moyen" : 10 km/h, +6min/100m D+, -3min/100m D-, fatigue +5% / 20km. Scope V1 : Dashboard uniquement (pas PTP).

**Files:**
- `frontend/src/store/useAppStore.ts` (migrer `useNaismith` → `calcMode` + `trailPlannerConfig`)
- `frontend/src/types/gpx.ts` (ajouter `CalcMode`, `TrailPlannerConfig`)
- `frontend/src/schemas/validation.ts` (Zod `discriminatedUnion` sur `calc_mode`)
- `frontend/src/components/AidStationTable.tsx` (refactor radio 2→3 + form trail_planner)
- `frontend/src/components/AidStationsTab.tsx` (propagation nouveau shape de state)
- `frontend/src/components/TrailPlannerForm.tsx` (nouveau, extraction)
- `frontend/src/constants/presets.ts` (nouveau, `TRAIL_PLANNER_PRESETS`)
- `frontend/src/components/AidStationTable.test.tsx` (nouveau)
- `frontend/src/store/useAppStore.test.ts` (etendu)

**TDD — Red step :**
1. Rendering 3 radio (Naismith, Constant pace, Trail Planner), Naismith selected par defaut
2. Click radio "Trail Planner" → les 5 inputs apparaissent (flat_pace, climb_penalty, descent_bonus, fatigue_percent, fatigue_interval)
3. Bouton "Appliquer preset Trail moyen" → pre-fill (10, 6, 3, 5, 20)
4. Submit trail_planner avec preset → API payload egal a `{ calc_mode: "trail_planner", trail_planner_config: {...} }`
5. Validation : `flat_pace = 0` → border rouge + message + submit disabled
6. Validation : `fatigue_interval = 0` → error + submit disabled
7. Toggle Trail Planner → Naismith → Trail Planner : values preservees (pas de reset)
8. Migration localStorage : ancien state `{ useNaismith: true }` → new state `{ calcMode: "naismith", trailPlannerConfig: null }`
9. Migration localStorage : ancien state `{ useNaismith: false, customPace: 10 }` → new state `{ calcMode: "constant_pace", constantPaceKmh: 10 }`
10. Zod schema valide les 3 modes via `discriminatedUnion`
11. Zod rejette `{ calc_mode: "trail_planner" }` sans config

**TDD — Green step :**
- `useAppStore` : remplacer `useNaismith` par `calcMode: CalcMode`, ajouter `constantPaceKmh: number | null`, `trailPlannerConfig: TrailPlannerConfig | null`
- Migration persist middleware Zustand : `version: 2, migrate: (state, version) => ...`
- `types/gpx.ts` : aligner sur backend
- `AidStationTable.tsx` : radio group controlled, conditional render du form trail_planner
- `TrailPlannerForm.tsx` : 5 inputs number + bouton "Preset Trail moyen"
- `presets.ts` : constante `TRAIL_PLANNER_PRESETS = { "trail-moyen": { flat_pace_kmh: 10, climb_penalty_min_per_100m: 6, descent_bonus_min_per_100m: 3, fatigue_percent_per_interval: 5, fatigue_interval_km: 20 } }`
- Tooltip mise a jour : "3 modes disponibles — voir FAQ"

**TDD — Refactor step :**
- Extraire `TrailPlannerForm.tsx` pour isolation
- Extraire `usePaceForm` hook si le form grossit
- Constantes centralisees dans `presets.ts`

**Conditions aux limites :**

| Cas | Comportement attendu | Test |
|-----|---------------------|------|
| User clique Trail Planner mais ne remplit rien | Submit disabled + message "Remplissez les parametres ou chargez un preset" | test #5 |
| Input `flat_pace = 0` ou vide | Border rouge + message "Valeur > 0 requise" | test #5 |
| Input `flat_pace = 50` (> 30 max) | Border rouge + message "Max 30 km/h" | test supplementaire |
| `fatigue_percent = 0` | OK (fatigue desactivee, submit enabled) | test dedie |
| User toggle mode puis revient | Values preservees via state local | test #7 |
| API 422 (backend rejette config) | Toast erreur "Parametres invalides" + form reste rempli | test integration |
| Network error (fetch reject) | Toast "Erreur reseau" + bouton retry | existant, a preserver |
| localStorage ancien format (`useNaismith`) | Migration silencieuse au load | test #8, #9 |
| localStorage corrompu (JSON invalide) | Reset store au default (pas de crash) | test dedie |

**Fallbacks :**
- Si preset JSON parse echoue (impossible car constante TS, defensive) → fallback hardcode "Trail moyen"
- Si backend renvoie calcul incoherent (temps < 0) → afficher "--" et logger Sentry (T3)
- Si Zustand migration fonction throw → reset store au default + toast "Preferences reinitialisees"

**Acceptance — Definition of Done :**
- [ ] 11+ tests Vitest passent (`AidStationTable.test.tsx`, `useAppStore.test.ts`, `validation.test.ts`)
- [ ] Coverage `AidStationTable.tsx` >= 70%
- [ ] Coverage `TrailPlannerForm.tsx` >= 80%
- [ ] `grep -r "useNaismith" frontend/src/` retourne vide (sauf backup `App.tsx.backup` ignore)
- [ ] `grep -r "USE_NAISMITH" frontend/src/` retourne vide
- [ ] `npm run build` reussit sans warning TypeScript
- [ ] Manual test : upload GPX + Trail Planner preset → table aid stations avec temps plus lents que Naismith
- [ ] Manual test : user existant (localStorage v1) voit son choix preserve au premier load
- [ ] Accessibility : radios ont `aria-labelledby`, form inputs ont `<label htmlFor>` ou `aria-label`

**Rollback :**
- `git revert` + bump `useAppStore` persist version a v3 pour invalider les states v2
- Si deploye : toast informatif "Options de calcul mises a jour" pour les users ayant l'ancien state

**Timeout :** 2h

---

### T9.3: Doc FAQ + tooltip + reponse a Paul
**status:** ready
**type:** doc
**priority:** low
**parent:** T9
**depends_on:** T9.2

**Goal:** Ajouter une entree FAQ expliquant le nouveau mode Trail Planner, mettre a jour le tooltip du composant, et envoyer la reponse a Paul.

**Context:** Paul a pris le temps d'ecrire un feedback construit — boucle de retour importante (validation sociale + engagement futur). La FAQ centralise les explications pour les autres users qui se poseront la question.

**Files:**
- `frontend/src/pages/FAQ.tsx` (nouvelle entree)
- `frontend/src/components/AidStationTable.tsx` (tooltip mis a jour)

**Action manuelle (hors code) :**
- Envoyer la reponse a Paul (email / message — canal depuis lequel il a ecrit)

**Contenu FAQ a ajouter :**
```
Q: Quelle est la difference entre Naismith, Allure constante et Trail Planner ?
R: Trois modes de calcul des temps de passage :

1. **Formule de Naismith (par defaut)** — adaptee au trail running. Vitesse
   de base 12 km/h + 5 min par 100m de D+ + bonus 5 min par 100m de D- en
   pente raide (>12%). Estimation dite "conservative" mais souvent trop
   rapide pour les allures rando ou ultra.

2. **Allure constante** — vitesse moyenne unique en km/h. Utile si vous
   avez deja votre allure cible sans tenir compte du denivele.

3. **Trail Planner** — 4 parametres ajustables pour coller au plus pres a
   votre profil :
   • Allure sur plat (km/h)
   • Penalite de montee (min par 100m D+)
   • Bonus descente (min par 100m D-)
   • Facteur de fatigue progressif (+X% toutes les N km)

   Preset "Trail moyen" fourni (10 km/h, +6/100m, -3/100m, +5%/20km).
   Ajustez selon vos sensations et votre experience.
```

**Acceptance — Definition of Done :**
- [ ] FAQ.tsx contient la nouvelle entree, rendue correctement (verif visuelle)
- [ ] Tooltip `AidStationTable.tsx:279` reference la FAQ ("3 modes disponibles — voir FAQ")
- [ ] Email / message envoye a Paul (capture d'ecran ou confirmation)
- [ ] Optionnel : mention dans `Marketing.tsx:65` (actuellement parle de Naismith uniquement)

**Rollback :** N/A (ajout de texte uniquement).

**Timeout :** 45min

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

### T3: Integration Sentry frontend + backend
**status:** next
**type:** observability
**priority:** medium

**Goal:** Monitoring erreurs prod via Sentry sur les deux stacks.

**Context:** TODO documente dans `ErrorBoundary.tsx:33`. Sprint PTP termine = application complexifiee = besoin de visibilite prod. A specer : plan gratuit suffisant, sampling, PII scrubbing (GDPR).

**Files (preview):**
- `frontend/src/components/ErrorBoundary.tsx`
- `frontend/src/main.tsx` (init Sentry)
- `backend/app/main.py` (init Sentry SDK)
- `.env.example` (SENTRY_DSN)

**Pre-requis:** Specer via `/shika-speccer` (cout, config, scrubbing GDPR).

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

## Later (ideas, pas engage)

### T7: Google OAuth (completion)
Partiellement configure, a completer si use case utilisateur emerge.

### T8: Upload Google Drive (Phase 2 PTP)
Code commente dans `gpx.py`. Nice-to-have pour persistance user cote Drive.

---

## Done

(aucune task tracee dans TASKS.md — historique dans `git log` jusqu'ici)
