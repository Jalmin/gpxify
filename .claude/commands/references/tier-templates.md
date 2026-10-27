---
title: Tier Templates (XS · S · M)
role: Spec templates for all non-L tiers
description: Merged templates for XS (ultra-light), S (intermediate), M (full Quality Gate). Matrice authoritative in task-schema.md. Tier = review level only (XS skip, S standard, M opus) — no size rejection.
---

# Tier Templates

---

## XS-fast (template Speccer ultra-light — 3 champs, skip QG)

Mode collecte pour `[ETAPE 4-XS/6]` du Speccer. 3 champs obligatoires, AUCUNE Quality Gate, durée cible <2 min.

```markdown
### T<id>: <titre>
**Statut:** ready
**Tier:** XS
**Goal:** <1 phrase impérative, >20 char, action mesurable>
**Files:**
- <chemin> (min 1, max 2 — au-delà : escalade vers S)
**Done:**
- [ ] <1 critère binaire>
**Durée:** 5-15 min
```

**Obligatoires :** Goal, Files (1-2), Done (≥1 binaire), **Tier: XS** (déclenche exception validator).

**⚠️ Important — Champ `**Tier:** XS` requis dans TASKS.md** :
Le validateur `scripts/validate.ts` reconnaît ce champ et relaxe les contraintes pour XS :
- Pas de `Prompt Claude Code` requis (l'agent infère depuis Goal + Files)
- Pas de `Critère de done` (≥2 items) requis — un `Done` (≥1 checkbox) suffit
- Pas de `Success metrics` requis pour tier=XS même si type=core/integration

Sans le champ `**Tier:** XS`, la task XS sera rejetée par `npx tsx scripts/validate.ts --all` au prochain `/shika-run`.

**Skip explicite (NE PAS demander en mode XS-fast) :**
- Pas de `Prompt` (l'agent infère depuis Goal + Files)
- Pas de `TDD`
- Pas de `Edge cases`
- Pas de `Boundaries`
- Pas de `Fallback`
- Pas de `Context` détaillé (1 phrase optionnelle)
- Pas de `Rollback` explicite (déduit : `git revert`)

**Exemple canonique :**

```markdown
### T-XS-EX1: Fix typo README "Shikamuru" → "Shikamaru"
**Statut:** ready
**Tier:** XS
**Goal:** Corriger la coquille "Shikamuru" dans le titre du README.md (occurrence ligne 1)
**Files:**
- README.md
**Done:**
- [ ] La chaîne "Shikamuru" n'apparaît plus dans README.md (grep retourne 0 ligne)
**Durée:** 5 min
```

**Auto-escalade vers S/M si :**
- Files >2 paths → demander de découper en sous-tasks XS, OU passer manuellement en flow S (pas de dépendance T149)
- Goal ou Files contient un signal M tardif (`auth`, `oauth`, `migration`, `secret`, `schema`, `rls`, `rbac`) → prompt user pour confirmer escalade vers M

**Guards sécurité `Files` (BLOCKING en mode XS-fast) :**
- 🚫 Chemins absolus (`/...`) ou `~`/`$HOME` interdits
- 🚫 Segments `..` (path traversal) interdits
- 🚫 Fichiers sensibles (`.env*`, `*.pem`, `*.key`, `id_rsa*`, `credentials*`) interdits
- 🚫 Chemins hors repo courant (résolu, vérifié startswith repo root) interdits
- ✅ Repo-relatif uniquement, profondeur max 2 niveaux pour nouveaux fichiers

---

## S-mini (template Speccer intermédiaire — 5 champs, QG light)

Mode collecte pour `[ETAPE 4-S/6]` du Speccer. 5 champs obligatoires, Quality Gate light (Goal mesurable + Done ≥3 binaires uniquement), durée cible 2-4 min vs ~7-10 min en mode M.

```markdown
### T<id>: <titre>
**Statut:** ready
**Tier:** S
**Goal:** <1 phrase impérative, >20 char, action mesurable>
**Context:** <1-2 phrases, >30 char, mentionne un pourquoi>
**Files:**
- <chemin> (min 1)
**Done:**
- [ ] <critère binaire 1>
- [ ] <critère binaire 2>
- [ ] <critère binaire 3>
**Boundaries:**
- ✅ **Always:** <règle 1 ligne>
- 🚫 **Never:** <règle 1 ligne>
**Durée:** 15-30 min
```

**Obligatoires :** Goal, Context, Files (≥1), Done (≥3 binaires), Boundaries (≥1 Always + ≥1 Never), **Tier: S**.

**Skip explicite (NE PAS demander en mode S-mini) :**
- Pas de `Prompt Claude Code` détaillé (l'agent infère depuis Goal + Context + Files + Done)
- Pas de `TDD`
- Pas de `Edge cases` table
- Pas de `Fallback` explicite (déduit : retry + skip)
- Pas de `Rollback` explicite (déduit : `git revert`)

**Exemple canonique :**

```markdown
### T-S-EX1: Ajouter champ téléphone au formulaire contact
**Statut:** ready
**Tier:** S
**Goal:** Ajouter un input "Téléphone" (optionnel, validation format E.164) au formulaire de contact
**Context:** Les commerciaux veulent rappeler les leads par téléphone sans avoir à chercher l'info ailleurs. Champ optionnel pour ne pas augmenter le taux d'abandon du formulaire.
**Files:**
- src/components/ContactForm.tsx
**Done:**
- [ ] Le champ "Téléphone" apparaît dans le formulaire en dessous du champ "Email"
- [ ] La validation E.164 bloque l'envoi si format invalide (avec message d'erreur)
- [ ] Le champ vide passe la validation (optionnel) et est envoyé comme `null`
**Boundaries:**
- ✅ **Always:** préserver le comportement existant (les champs actuels restent obligatoires)
- 🚫 **Never:** rendre le champ téléphone obligatoire sans validation préalable produit
**Durée:** 20 min
```

**Quality Gate light (validation inline en `[ETAPE 4-S/6]`, PAS étape 5 full) :**
- ✅ Goal >20 char + mesurable (pas de "Améliorer" sans détail)
- ✅ Done ≥3 checkboxes binaires (test = "vrai ou faux", pas "mieux"/"améliorer")
- 🚫 Skip : anti-patterns table, validation Prompt, validation EdgeCases, validation Fallback (non demandés en mode S)

**Auto-escalade vers M (déclenche T149 escape hatch) :**
- Files >3 paths → prompt user "Tu touches {N} fichiers, ça ressemble à M. Escalade ? (o/n)"
- Goal ou Files contient signal M (`auth`, `oauth`, `migration`, `secret`, `schema`, `rls`, `rbac`) → prompt user

**Guards sécurité `Files` (mêmes règles que XS-fast) :** chemins repo-relatifs uniquement, pas de `..`, pas de fichiers sensibles (`.env*`, `*.pem`, `*.key`, `id_rsa*`, `credentials*`), pas de chemins absolus, pas hors repo.

---

## XS — Ultra-light (≤60 lignes, ≤2 fichiers, 5-15 min)

Pas de Prompt — l'agent infère depuis Goal + Files. Auto-promote → S si >2 fichiers OU >60 lignes total.

```markdown
### T<id>: <titre>
**Statut:** ready
**Tier:** XS
**Type:** <setup|core|integration|cleanup>
**Goal:** <1 phrase déclarative — résultat mesurable>
**Context:** <1-3 phrases> *(recommandé)*
**Files:**
- <chemin> (modifié)
**Done:**
- [ ] <1 critère binaire>
**Rollback:** <git revert ou action simple>
**Durée:** 5-15 min
```

Obligatoires : Goal, Files, Done(1+), Durée. Context + Rollback ⚠️.

---

## S — Intermédiaire (≤200 lignes, ≤3 fichiers, 15-30 min)

Prompt court (3-8 lignes). Auto-promote → M si >3 fichiers OU >200 lignes OU logique nouvelle.

```markdown
### T<id>: <titre>
**Statut:** ready
**Tier:** S
**Type:** <setup|core|integration|cleanup>
**Goal:** <1 phrase déclarative>
**Context:** <1-2 phrases : pourquoi>
**Files:**
- <chemin>
**Prompt:**
```
<instructions courtes — 3-8 lignes>
```
**Done:**
- [ ] <critère 1>
- [ ] <critère 2>
- [ ] <critère 3>
**Boundaries:**
- ✅ **Always:** <règle>
- 🚫 **Never:** <règle>
<!-- Smoke: facultatif (T224) — la preuve live se fait au run, §d.0 de shika-run.md. Un Smoke écrit reste joué en d.1bis. -->
**Smoke:**
- start_cmd: `npm run dev &` *(optionnel — lance l'app si besoin)*
- `curl -sf localhost:$PORT/api/health | grep -q 'ok'` → couvre le critère Done #2
**Rollback:** <action concrète>
**Durée:** 15-30 min
```

Obligatoires : Goal, Context, Files, Prompt, Done(3+), Rollback, Durée. Boundaries ⚠️. **Smoke** facultatif (T224).

---

## M — Full Quality Gate (≤1200 lignes, ≤7 fichiers, 30-90 min)

4 sous-templates selon type. M.core + M.integration : TDD + Edge cases + Fallback obligatoires.

### M.setup — install, config, OAuth, secret, env, deploy

```markdown
### T<id>: <titre>
**Statut:** ready
**Tier:** M
**Type:** setup
**Goal:** <1 phrase>
**Context:** <1-3 phrases>
**Files:**
- <chemins>
**Prompt:**
```
<étapes numérotées — 5-15 lignes>
```
**Done:**
- [ ] <critère 1>
- [ ] <critère 2>
- [ ] <critère 3>
**Edge cases:**
| Situation | Comportement |
|-----------|-------------|
| <cas 1> | <comportement> |
| <cas 2> | <comportement> |
| <cas 3> | <comportement> |
**Boundaries:**
- ✅ **Always:** <règle>
- ⚠️ **Ask first:** <règle>
- 🚫 **Never:** <règle>
**Rollback:** <action concrète>
**Durée:** 30-90 min
```

Obligatoires : Goal, Context, Files, Prompt, Done(3+), Boundaries, Rollback, Durée. Edge cases ⚠️.

### M.core — feature, logique, algo, calcul, validation, parser

```markdown
### T<id>: <titre>
**Statut:** ready
**Tier:** M
**Type:** core
**Goal:** <1 phrase>
**Context:** <1-3 phrases>
**Files:**
- <chemins>
**TDD:**
1. Test <cas 1> → résultat attendu
2. Test <cas 2> → résultat attendu
3. Test <cas 3> → résultat attendu
**Prompt:**
```
<instructions — peut référencer les tests TDD>
```
**Done:**
- [ ] <critère 1>
- [ ] <critère 2>
- [ ] <critère 3>
**Edge cases:**
| Situation | Comportement |
|-----------|-------------|
| <cas 1> | <comportement> |
| <cas 2> | <comportement> |
| <cas 3> | <comportement> |
**Boundaries:**
- ✅ **Always:** <règle>
- ⚠️ **Ask first:** <règle>
- 🚫 **Never:** <règle>
**Fallback:** <plan B si job primaire échoue>
<!-- Smoke: facultatif (T224) — la preuve live se fait au run, §d.0 de shika-run.md. Un Smoke écrit reste joué en d.1bis. -->
**Smoke:**
- start_cmd: `npm run dev &` *(optionnel — lance l'app si besoin)*
- `curl -sf localhost:$PORT/api/x | grep -q 'expected'` → couvre le critère Done #N
**Rollback:** <action concrète>
**Durée:** 30-90 min
```

Obligatoires : tous (Goal, Context, Files, TDD, Prompt, Done(3+), Edge cases(3+), Boundaries, Fallback, Rollback, Durée). **Smoke** facultatif (T224).

### M.integration — API, webhook, MCP, HTTP, external, SMTP, email

```markdown
### T<id>: <titre>
**Statut:** ready
**Tier:** M
**Type:** integration
**Goal:** <1 phrase>
**Context:** <1-3 phrases>
**Files:**
- <chemins>
**TDD:**
1. Test happy path → succès attendu
2. Test erreur réseau → comportement attendu
3. Test edge case domain → comportement attendu
**Prompt:**
```
<instructions>
```
**Done:**
- [ ] <critère 1>
- [ ] <critère 2>
- [ ] <critère 3>
**Edge cases:**
| Situation | Comportement |
|-----------|-------------|
| Service externe down | <comportement> |
| Auth expirée/refusée | <comportement> |
| Rate limit atteint | <comportement> |
| Réponse malformée | <comportement> |
**Boundaries:**
- ✅ **Always:** <règle>
- ⚠️ **Ask first:** <règle>
- 🚫 **Never:** <règle>
**Fallback (STRICT):** <plan B — service down ne casse pas l'app interne>
<!-- Smoke: facultatif (T224) — la preuve live se fait au run, §d.0 de shika-run.md. Un Smoke écrit reste joué en d.1bis. -->
**Smoke:**
- start_cmd: `npm run dev &` *(optionnel — lance l'app si besoin)*
- `curl -sf localhost:$PORT/api/x | grep -q 'expected'` → couvre le critère Done #N
**Rollback:** <revert + désactivation feature flag>
**Durée:** 30-90 min
```

Obligatoires : tous + Fallback STRICT. **Smoke** facultatif (T224).

### M.cleanup — archive, remove, delete, deprecate, refactor (sans logique)

```markdown
### T<id>: <titre>
**Statut:** ready
**Tier:** M
**Type:** cleanup
**Goal:** <1 phrase>
**Context:** <1-3 phrases>
**Files:**
- <chemins>
**Prompt:**
```
<instructions>
```
**Done:**
- [ ] <critère 1>
- [ ] <critère 2>
- [ ] <critère 3>
**Edge cases:**
| Situation | Comportement |
|-----------|-------------|
| <cas 1> | <comportement> |
| <cas 2> | <comportement> |
| <cas 3> | <comportement> |
**Boundaries:**
- ✅ **Always:** <règle, souvent "préserver l'historique git">
- 🚫 **Never:** <règle, souvent "ne pas casser les imports cross-modules">
**Rollback:** <git revert + restauration manuelle si nécessaire>
**Durée:** 30-90 min
```

Obligatoires : Goal, Context, Files, Prompt, Done(3+), Rollback, Durée. Edge cases + Boundaries ⚠️.

---

## Anti-patterns

| Anti-pattern | Pourquoi refuser |
|--------------|------------------|
| Tier escalation pour ajouter Edge cases | Si S a besoin d'Edge cases, c'est M, pas "S+" |
| Pas de Fallback en M.integration | Bloquant |
| Pas de TDD en M.core | Bloquant |
| Prompt > 10 étapes en S | → re-classer M |
| Prompt step-by-step en XS | XS n'a pas de Prompt |
