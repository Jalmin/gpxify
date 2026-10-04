# QA Config Schema — Référence

Schéma strict du manifest YAML consommé par `runner-qa/` et généré par la skill `shika-qa`.

Fichier cible : `<projet>/.shikamaru/qa-config.yaml`
Parser : `runner-qa/src/manifest.ts` → `parseManifest(yamlString): ParseResult`
Mode strict (Zod `.strict()`) — tout champ extra non documenté ici est rejeté.

---

## Structure

```yaml
baseUrl: <URL absolue, requis>
auth: <objet, optionnel>
parcours: <array, requis, min 1>
  - name: <string, requis>
    steps: <array, requis, min 1>
      - <step>
viewports: <array de "desktop" | "tablet" | "mobile", optionnel>
ignoreList: <array de string, optionnel — domaines à ignorer dans error-collector>
```

---

## Champs

### `baseUrl` (requis)

URL absolue (ex: `http://localhost:3000`, `https://staging.example.com`). Validée via Zod `z.string().url()`.

### `auth` (optionnel)

```yaml
auth:
  loginUrl: <string, requis>      # chemin du form de login (relatif à baseUrl)
  emailField: <string, requis>    # selector du champ email
  passwordField: <string, requis> # selector du champ password
  email: <string, requis>         # email de test (en clair, pas sensible)
  passwordEnvVar: <string, requis># nom de l'env var contenant le password
  successUrl: <string, optionnel># URL/regex post-login (validation succès)
```

Le password n'est JAMAIS dans le YAML — toujours via env var. La présence de l'env var est vérifiée par T123 (runner) au runtime, pas par le parser.

### `parcours` (requis, min 1)

Liste des parcours utilisateur à exécuter. Chacun :

- `name` : nom court (ex: `"Login"`, `"Création stagiaire"`)
- `steps` : array de steps (min 1)

### `steps`

Discriminated union sur le champ `type`. 4 types acceptés :

#### `goto`
```yaml
- type: goto
  url: <string, requis>   # URL absolue OU relative à baseUrl
```

#### `fill`
```yaml
- type: fill
  selector: <string, requis>  # CSS selector, non-vide
  value: <string, requis>     # valeur à entrer
```

#### `click`
```yaml
- type: click
  selector: <string, requis>  # CSS selector, non-vide
```

#### `expect`
```yaml
- type: expect
  urlPattern: <string, optionnel>   # regex/string pour match page.url()
  selector: <string, optionnel>     # selector qui doit exister
# AU MOINS UN des deux requis (urlPattern OU selector)
```

### `viewports` (optionnel)

Liste de viewports à exécuter. Valeurs : `desktop`, `tablet`, `mobile`. Défaut runtime : `["desktop", "mobile"]`.

### `ignoreList` (optionnel)

Liste de domaines/patterns à ignorer dans l'auto-error-detection (ex: `["facebook.com", "google-analytics.com"]`). Le runner T123 filtre `requestfailed` et `response.status>=400` sur ces patterns.

---

## Exemple manifest valide complet

```yaml
baseUrl: http://localhost:3000

auth:
  loginUrl: /login
  emailField: '[name="email"]'
  passwordField: '[name="password"]'
  email: test@example.com
  passwordEnvVar: TEST_PASSWORD
  successUrl: /dashboard

parcours:
  - name: Login
    steps:
      - type: goto
        url: /login
      - type: fill
        selector: '[name="email"]'
        value: test@example.com
      - type: click
        selector: 'button[type="submit"]'
      - type: expect
        urlPattern: /dashboard

  - name: Création stagiaire
    steps:
      - type: goto
        url: /students/new
      - type: fill
        selector: '[name="firstName"]'
        value: Test
      - type: fill
        selector: '[name="lastName"]'
        value: Stagiaire
      - type: click
        selector: 'button[type="submit"]'
      - type: expect
        selector: '[data-testid="success-toast"]'

viewports:
  - desktop
  - mobile

ignoreList:
  - facebook.com
  - google-analytics.com
```

---

## Exemples invalides + erreur attendue

### 1. `baseUrl` absent
```yaml
parcours:
  - name: home
    steps:
      - type: goto
        url: /
```
→ `ParseError { path: ["baseUrl"], code: "REQUIRED" }`

### 2. `baseUrl` non-URL
```yaml
baseUrl: pas-une-url
parcours: [...]
```
→ `ParseError { path: ["baseUrl"], code: "INVALID_URL" }`

### 3. Champ extra non-prévu
```yaml
baseUrl: http://localhost:3000
unknownField: foo  # ← rejeté en mode strict
parcours: [...]
```
→ `ParseError { code: "UNKNOWN_KEY" }`

### 4. Step type inconnu
```yaml
steps:
  - type: got  # typo de "goto"
    url: /
```
→ `ParseError { path: [..., "steps", 0], code: "INVALID_DISCRIMINATOR" }`

### 5. `expect` sans target
```yaml
steps:
  - type: expect  # ni urlPattern ni selector
```
→ `ParseError { code: "EXPECT_NEEDS_TARGET" }`

---

## Codes d'erreur

| Code | Signification |
|------|---------------|
| `EMPTY_INPUT` | YAML vide ou whitespace seul |
| `YAML_SYNTAX` | YAML mal formé (avec ligne/colonne) |
| `REQUIRED` | Champ obligatoire absent |
| `INVALID_URL` | `baseUrl` n'est pas une URL valide |
| `MIN_LENGTH` | Array vide alors que min 1 attendu |
| `INVALID_DISCRIMINATOR` | `step.type` inconnu |
| `INVALID_SELECTOR` | Selector vide ou whitespace |
| `UNKNOWN_KEY` | Champ extra hors schéma (mode strict) |
| `EXPECT_NEEDS_TARGET` | Step `expect` sans `urlPattern` ni `selector` |

---

## Conventions

- **Strict mode** : tout champ extra rejette le manifest. Pas de "sera ignoré silencieusement".
- **URL relative** : dans `step.goto.url`, accepté — résolue contre `baseUrl` par le runner T123.
- **Auth en env var** : passwords jamais en clair dans le YAML. Le manifest est committable.
- **Ordre des steps** : exécution séquentielle. Pas de parallèle. Pas de skip conditionnel.
- **Échec d'un parcours** : le runner T123 marque le parcours fail mais continue les suivants (pas de short-circuit du batch).

---

*Référence du contract YAML — Phase 14 v1. Évolutions futures (nouveaux step types, conditions) = nouvelle task.*
