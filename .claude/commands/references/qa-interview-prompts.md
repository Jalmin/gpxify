# QA Interview Prompts — Banque questions + heuristiques

Référence consultée par `/shika-qa` (T125) pour mener l'interview Phase 1. Chaque question a : prompt à afficher, exemples bonnes réponses, conversion → YAML.

⚠️ **Hard rule globale** : 1 question = 1 prompt. Jamais batcher (cf. CLAUDE.md global).

---

## Glossaire (T131 finding #7) — pour reformuler aux users non-tech

Quand le user dit "je comprends pas", utilise ces reformulations :

| Terme technique | Reformulation |
|-----------------|---------------|
| `loginUrl` | "L'URL de la page où tu te connectes — l'URL qui apparaît dans la barre d'adresse de ton navigateur quand tu cliques 'Se connecter'" |
| `path relatif` | "Le chemin après le nom de domaine. Ex: pour `https://app.com/login`, le path relatif c'est `/login`" |
| `sélecteur CSS` | "Une recette pour identifier un champ ou bouton précis sur la page. Pour la plupart des forms, `input[type=email]` marche tout seul (HTML5 standard)" |
| `viewport` | "La taille de l'écran simulée — desktop (PC), tablet, ou mobile (téléphone)" |
| `manifest YAML` | "Un fichier qui décrit ce qu'on teste — quelles pages, quels clics, quels champs. Tu donnes les infos en français, je le construis pour toi" |
| `env var` | "Une variable d'environnement — un mot-clé que tu mets dans ton terminal AVANT de lancer le run, pour passer un secret (ex: password) sans l'écrire en clair quelque part" |
| `parcours` | "Une séquence d'actions qui simule un user qui utilise ton app — ex: 'login → dashboard → clique sur Stagiaires'" |
| `expect` | "Une vérification — 'après cette action, je m'attends à voir X sur la page'. Si on voit pas X, le test échoue" |
| `urlPattern` | "Un pattern d'URL qu'on s'attend à voir après une action. Ex: si après login on doit être sur `/dashboard`, urlPattern = `^/dashboard$`" |
| `ignoreList` | "Une liste de domaines tiers (analytics, tracker) à exclure des erreurs détectées — sinon on te spamme avec des erreurs Sentry/Hotjar/etc." |

⚠️ **Si user dit "je comprends pas" 2× sur la même question** → utilise ces reformulations + auto-pilot avec smart defaults (voir Q2 section autopilot).

---

## Heuristiques détection parcours candidats

À exécuter AVANT Q3 pour proposer une short-list au user.

⚠️ **Important** : `find -path "**/foo"` ne marche PAS (les globstars `**` ne sont pas expansés par `find`). On utilise `find -name` puis filtrage en post-process.

### Next.js (app router) — chemins racine OU sous `src/`

```bash
find . -name "page.tsx" -not -path "*/node_modules/*" -not -path "*/.next/*" 2>/dev/null
find . -name "page.jsx" -not -path "*/node_modules/*" -not -path "*/.next/*" 2>/dev/null
```

Filtrer en post-process pour ne garder que les chemins contenant `/app/` (route). Convertir `app/foo/bar/page.tsx` ou `src/app/foo/bar/page.tsx` → URL candidate `/foo/bar`.

### Next.js (pages router)

```bash
find . -path "*/pages/*" -name "*.tsx" -not -path "*/node_modules/*" -not -path "*/api/*" 2>/dev/null
find . -path "*/pages/*" -name "*.jsx" -not -path "*/node_modules/*" -not -path "*/api/*" 2>/dev/null
```

Exclure `_app.tsx`, `_document.tsx`. Convertir `pages/foo/bar.tsx` → `/foo/bar`.

### Vue / Nuxt / SvelteKit

```bash
# Nuxt 3
find . -path "*/pages/*" -name "*.vue" -not -path "*/node_modules/*" 2>/dev/null
# SvelteKit
find . -name "+page.svelte" -not -path "*/node_modules/*" -not -path "*/.svelte-kit/*" 2>/dev/null
# Vue Router (config explicite)
grep -rh "path:" --include="index.ts" --include="router.ts" --include="*.routes.ts" 2>/dev/null
```

### Tests existants (extraire URLs déjà testées)

```bash
grep -rEh "(goto|visit|navigate)\(" --include="*.spec.ts" --include="*.test.ts" --include="*.e2e.ts" 2>/dev/null \
  | grep -oE "['\"]\/[a-zA-Z0-9_/-]+['\"]" \
  | sort -u
```

### Forms détectés (signal "il y a une interaction utilisateur")

```bash
grep -rh "<form" --include="*.tsx" --include="*.jsx" --include="*.vue" --include="*.svelte" --include="*.html" 2>/dev/null \
  | head -20
```

### Présentation au user

Affiche les candidats sous forme de liste numérotée avec source :

```
Parcours candidats détectés :
 1. /login            (form trouvé app/login/page.tsx)
 2. /dashboard         (route Next.js)
 3. /students/new      (form trouvé app/students/new/page.tsx)
 4. /invoices          (route + form)
 5. /reports/export    (route + URL trouvée dans tests)

Lesquels (3 max recommandés) ?
```

### Cap candidats > 8 — guidance HOW filtrer (T131 finding #1)

Si > 8 routes détectées (cas typique des dashboards type CRM, ERP), Claude DOIT pre-filtrer avant l'affichage avec cette priorité de criticité métier :

1. **Auth flow** — toujours le 1er parcours (login → page principale post-auth)
2. **Core business** — 2-3 routes du domaine principal (ex: `/students`, `/invoices`, `/sessions` pour KalioKool)
3. **Forms à fort trafic** — pages de création (`/X/new`) où l'écriture BDD a un coût réel
4. **Reports / exports** — souvent où les bugs PDF / aggrégation se cachent
5. **Onboarding** — `/signup`, `/verify-email` — coût UX fort si cassé

**Heuristique** : si la route contient `/api/`, `/admin/`, `/_*` ou `/(public)/cgv|privacy|legal/` → exclure (pas critique pour un user typique). Garder seulement 8 max.

Affichage utilisateur explicite quand le cap est atteint :
```
20+ routes détectées. J'ai filtré aux 8 plus critiques par criticité métier
(auth + core + forms + reports). Si tu veux un parcours hors liste, donne le
chemin manuellement (ex: "/admin/dashboard").
```

---

## Q1 — URL test

**Prompt à afficher** :
```
Q1 / 6 — Quelle URL pour le run QA ?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
On veut tester contre une URL ATTEIGNABLE par le runner. En général :
  • dev local : http://localhost:3000
  • staging : https://staging.<projet>.com
  • preview Vercel : https://<projet>-pr-XX.vercel.app

Si dev local, assure-toi que `npm run dev` (ou équivalent) tourne dans un autre terminal AVANT de lancer le run.

⚠️ Évite la prod sauf cas explicite.

Quelle URL ?
```

### Détection prod IMMEDIATE (T131 finding #2 — pas Phase 2.1, mais Q1)

**Après la réponse user**, AVANT de passer à Q2, vérifier le pattern prod :

- Domaine racine sans préfixe `localhost`, `127.0.0.1`, `staging.`, `dev.`, `preview.`, `pr-`, `*.vercel.app` → **suspect prod**.

Si suspect prod, AFFICHER IMMÉDIATEMENT :

```
⚠️ Pattern prod détecté (`{baseUrl}`).

Avant de continuer, choisis :

  • prod-readonly  — je veux tester en lecture seule (que des goto + expect,
                     aucun fill/click qui crée/modifie/supprime de la donnée)
  • staging       — c'est en réalité un staging masqué derrière ce domaine
  • cleanup-after — c'est la prod et j'accepte les écritures, je nettoie en BDD
                     manuellement après le run
  • annule        — je veux pointer vers une autre URL
```

Pas de continuation Q2 tant que le user n'a pas répondu (path documenté pour acquittement explicite). Si `prod-readonly`, Q3 va FORCER seulement les steps `goto`+`expect`. Si `cleanup-after`, log un warning final en Q6.

**Bonnes réponses** :
- `http://localhost:3000` ✓
- `https://staging.kaliokool.com` ✓
- `kaliokool-pr-42.vercel.app` → demander si http ou https, normaliser

**Conversion YAML** :
```yaml
baseUrl: http://localhost:3000
```

**Edge case** : si user entre une URL sans schéma → préfixer `https://` par défaut, demander confirmation. Trailing slash → strip avant validation Zod.

---

## Q2 — Auth

**Prompt à afficher** :
```
Q2 / 6 — L'app a-t-elle un login ?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Si oui, je vais avoir besoin de :
  • L'URL de la page de login (relative à baseUrl)
  • Le sélecteur du champ email
  • Le sélecteur du champ password
  • L'email d'un compte de test (en clair, pas sensible)
  • Le NOM d'une env var qui contiendra le password (jamais le password en clair !)

Si non, on saute toute la partie auth.

Auth requise ? (oui/non/pas sûr)
```

**Si oui**, sub-questions séquentielles (1 par 1) :

```
2.1 — Quand tu cliques "Se connecter" sur la page d'accueil, quelle URL apparaît dans la barre d'adresse ?
      Ex: https://app.example.com/login → ton path est `/login`.

2.2 — Sélecteur du champ email — par défaut `input[type=email]` (HTML5 standard, marche sur 90%
      des apps). Si tu sais que ton form en a plusieurs, donne le sélecteur exact (`input[name=...]`,
      `#email`). Sinon réponds "default" et on prend `input[type=email]`.

2.3 — Sélecteur password — pareil, default `input[type=password]`.

2.4 — Email du compte test (en clair, pas un secret) ?

2.5 — Nom de l'env var pour le password — ex: `SHIKA_QA_<PROJET>_PASSWORD`. Tu setteras la valeur
      AVANT le run (`export SHIKA_QA_KALIOKOOL_PASSWORD=...`). JAMAIS le password en YAML.

2.6 — Après login réussi, sur quelle URL atterris-tu ? Ex: `/dashboard`, `/home`, `/`.
      Optionnel — si tu sais pas, on detect any-non-login.
```

### Auto-pilot defaults (T131 finding #5)

Si l'utilisateur répond `"je sais pas"` (ou variation) à 2 questions consécutives → ARRÊTE de demander, applique les **smart defaults** suivants et continue :

| Champ | Smart default |
|-------|---------------|
| `loginUrl` | `/login` (le plus commun) |
| `emailField` | `input[type=email]` |
| `passwordField` | `input[type=password]` |
| `passwordEnvVar` | `SHIKA_QA_<PROJET_UPPERCASE>_PASSWORD` |
| `successUrl` | undefined (any non-login) |

Et affiche : *"OK, je passe en autopilot avec defaults raisonnables. Je te dirai au run si quelque chose foire — tu pourras corriger à ce moment."*

**Bonnes réponses** :
- 2.1 : `/login`, `/auth/sign-in`, `/connexion`
- 2.2 : `input[type=email]` (default), `input[name=email]`, `#email`
- 2.5 : `SHIKA_QA_<PROJECT>_PASSWORD` (convention)

**Conversion YAML** :
```yaml
auth:
  loginUrl: /login
  emailField: input[name=email]
  passwordField: input[name=password]
  email: test@example.com
  passwordEnvVar: SHIKA_QA_KALIOKOOL_PASSWORD
  successUrl: /dashboard  # optionnel
```

**Edge case** : si user dit "pas sûr" → propose de skip auth pour ce run, on pourra l'ajouter plus tard.

---

## Q3 — 3 parcours critiques

**Prompt à afficher** :
```
Q3 / 6 — Quels parcours sont critiques pour ce projet ?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
On va tester 1 à 3 parcours qui te font le plus mal s'ils cassent.

[Affiche candidats détectés en 1.1 — voir heuristiques ci-dessus]

Donne-moi entre 1 et 3 parcours, sous la forme :
  - "Login → dashboard"
  - "Création stagiaire (form complet)"
  - "Génération facture PDF"

Tu peux choisir parmi les candidats ou en proposer d'autres. Ton choix ?
```

### Fast-path read-only (T131 finding #3)

Pour les parcours qui sont juste des `goto + expect` (vérifier qu'une page liste se charge, ex: `/invoices`, `/sessions`, `/dashboard`), pas besoin de sub-question détaillée. Claude génère directement :

```yaml
- name: <nom-parcours>
  steps:
    - { type: goto, url: <path> }
    - { type: expect, selector: "h1" }   # default: tout titre
```

Skip la sub-question. Affiche le YAML auto-généré au user et passe au parcours suivant.

**Critère "read-only"** : pas de form sur la page, pas de boutons d'action critiques. Détecté à partir de la liste des candidats Q3 (ceux SANS tag `(form trouvé...)`). Si doute, demander quand même.

### Sub-question pour parcours avec interaction

```
Parcours [X] / [N] : "[nom]"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Décris la séquence d'actions, en langage naturel. Ex :
  • "Va sur /login, remplis email + password, clique sur 'Se connecter', vérifie que l'URL devient /dashboard"
  • "Va sur /students/new, remplis le nom, clique 'Créer', vérifie qu'il y a un toast de succès"

Séquence ?
```

**Conversion YAML** :

Claude doit convertir le langage naturel en `steps[]` selon `references/qa-config-schema.md`.

⚠️ **Auto-quote selectors (T131 finding #4)** : YAML inline flow interprète `[abc]` comme un array. Claude DOIT TOUJOURS quoter les valeurs string contenant `[`, `:`, `,`, `#`, `*`, `&`, `>`, `|`, `?`, `@`. Préférer le double quote :

```yaml
# ❌ MAUVAIS — YAML parse error
- { type: fill, selector: input[name=firstName], value: Test }

# ✅ BON
- { type: fill, selector: "input[name=firstName]", value: Test }
```

| Langage naturel | YAML |
|-----------------|------|
| "Va sur /foo" | `{ type: goto, url: /foo }` |
| "Remplis l'email avec test@x.com" | `{ type: fill, selector: "input[name=email]", value: "test@x.com" }` |
| "Clique sur Login" | `{ type: click, selector: "button:has-text('Login')" }` |
| "Vérifie que l'URL est /dashboard" | `{ type: expect, urlPattern: "^/dashboard$" }` |
| "Vérifie qu'il y a un titre" | `{ type: expect, selector: "h1" }` |

**Hard rule** : si Claude ne sait pas convertir une phrase → ne pas inventer de selector. Demande au user de fournir le selector exact (ouvre devtools).

**Edge case** : si user décrit > 8 steps pour un parcours → suggère de splitter en 2 parcours plus petits.

### Restriction prod-readonly (T131 finding #2)

Si user a choisi `prod-readonly` en Q1, rejeter tout step `fill`, `click`, ou tout pattern de mutation détecté dans la séquence (verbes "crée", "supprime", "modifie", "envoie", etc.). Forcer une re-formulation read-only ou bypass via `cleanup-after`.

---

## Q4 — Viewports

**Prompt à afficher** :
```
Q4 / 6 — Sur quels viewports tester ?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Plus de viewports = plus de screenshots = plus de durée de run.
  • desktop seul (1920×1080) : rapide, pas de check responsive
  • desktop + mobile (375×812) : recommandé pour la plupart des apps
  • desktop + tablet (768×1024) + mobile : si responsive critique

Ton choix ?
```

AskUserQuestion (3 options + Other) :
- desktop seul
- desktop + mobile (Recommended)
- desktop + tablet + mobile

**Conversion YAML** :
```yaml
viewports: [desktop, mobile]  # ou [desktop] ou [desktop, tablet, mobile]
```

---

## Q5 — Données de test

### Skip-if-inlined (T131 finding #6)

Avant d'afficher Q5, Claude inspecte les `steps[]` générés en Q3 :
- Si tous les `fill` ont déjà un `value` inliné (proposé par Claude pendant Q3) → **AFFICHER UNIQUEMENT UNE CONFIRMATION** :
  ```
  Q5 / 6 — Données de test
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  J'ai déjà inliné ces valeurs dans les parcours :
    • parcours `students-create` → firstName=ShikaQA, lastName=TestStagiaire, email=shikaqa-test@example.com

  OK avec ces valeurs ? (oui / je modifie)
  ```
  → user dit "oui" → skip Q5 et passe à Q6. User dit "je modifie" → demande quelles valeurs changer.

- Si aucun parcours n'a de `fill` (read-only seulement) → **SKIP COMPLETEMENT Q5**. Aller direct à Q6.

- Sinon (inline partiel ou aucun inline) → afficher le prompt classique ci-dessous.

**Prompt classique** :
```
Q5 / 6 — Données de test à utiliser dans les forms ?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pour chaque champ que les parcours remplissent, donne une valeur de test sûre.
Si tu n'as pas de form à remplir (juste des goto + expect), réponds "aucune".

Ex :
  • email: qa-test@example.com
  • nom: TestStagiaire (PAS de placeholder dynamique)
  • montant: 100

Données ?
```

**Conversion YAML** : injecte les valeurs dans les `steps[].value` du parcours correspondant. Pas de champ `data:` séparé dans le manifest (pas dans le schéma T122).

**Edge case** : si user mentionne `{timestamp}` ou autre placeholder dynamique → ce SKILL ne remplace PAS les placeholders au runtime (limitation v1). Refuser et demander une valeur fixe.

---

## Q6 — Actions destructives à éviter

**Prompt à afficher** :
```
Q6 / 6 — Y a-t-il des actions destructives à éviter pendant le run ?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Le runner exécute les parcours TEL QUE décrits. S'il y a des boutons "Supprimer compte", "Vider la DB", des callbacks Stripe en prod, etc., il faut les contourner.

Liste les patterns d'URL à IGNORER côté error-collector (3rd party domains, analytics, etc.) :
  • Ex: amplitude, segment, sentry, hotjar
  • Ex: googletagmanager, facebook.com

Patterns à ignorer (séparés par virgule, ou "aucun") ?
```

**Conversion YAML** :
```yaml
ignoreList: [amplitude, segment, sentry, googletagmanager]
```

**Edge case** : Q6 sert AUSSI de second moment de vigilance pour la baseUrl. Si baseUrl matche un pattern prod, afficher un warning explicite ICI (en plus de Phase 2 avant le run).

---

## Récap final avant validation

Après les 6 questions, présente le YAML construit :

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Manifest généré
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[YAML brut]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
On valide et on lance le run ? (oui / re-q[X] / pause)
```

Le user peut dire `re-q3` pour reprendre la Q3 (re-définir les parcours). Les autres réponses passent à la validation parser + sauvegarde.
