# TASKS Schema Documentation

**JSON Schema:** [`tasks.schema.json`](./tasks.schema.json)
**Version:** 1

## Overview

This schema defines the machine-readable contract for TASKS.md files used by the Shikamaru Runner.

## Dialecte Markdown canonique (BLOQUANT)

Il n'existe qu'UN dialecte Markdown pour les tasks — celui que les scripts (`smoke.ts`, `archive-done-tasks.ts`, `validate.ts`, `synthesize-learnings.ts`) parsent :

| Élément | Canonique | INTERDIT en écriture |
|---------|-----------|----------------------|
| Header de task | `### T{id}: {titre}` (heading niveau 3, **colon**) | `## T{id}` (niveau 2) ; `### T{id} — {titre}` (em-dash — toléré en LECTURE par les scripts T155 seulement) |
| Champs | `**Statut:**`, `**Files:**`, `**Smoke:**`… (bold inline) | `### Smoke` (champs en headings) |
| Prompt | `**Prompt:**` | `**Prompt Claude Code:**` (toléré en lecture seulement) |

**Why** : le speccer a généré `## T{id}` + champs en headings sur pythia-lab (2 runs) et KONBINI (4 runs) → smoke gate joué à la main, archiveur aveugle (`/shika-improve` 2026-07-15 finding C2). Canonique passé de l'em-dash au **colon** le 2026-07-26 : les validators clients n'acceptaient que le colon (gate 0.1 échoué à chaque run Ziggy ×2, post-T155) et le colon passe partout (validé empiriquement Ziggy 2026-07-22, compatible avec la regex tolérante T155 des scripts source). Ce document (pluriel, `schemas/`) est le contrat machine ; `references/task-schema.md` (singulier) est le guide d'écriture du speccer — les deux DOIVENT décrire ce même dialecte. T155 durcit les scripts en lecture, mais l'ÉCRITURE reste strictement canonique.

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `schemaVersion` | integer | Must be `1` |
| `project` | string | Project identifier |
| `tasks` | array | List of task objects |

## Task Object

### Always Required

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique ID matching pattern `T[0-9]+[a-z]?` (e.g., T1, T17b) |
| `title` | string | Short title (5-100 chars) |
| `status` | enum | One of: `pending`, `ready`, `in_progress`, `in_review`, `needs_review`, `needs_user_validation`, `done`, `blocked`, `timeout`, `backlog`, `abandoned`, `superseded` |

Statuts étendus (workflow review, utilisés par le board — étendus le 2026-07-12) :

| Statut | Sémantique |
|--------|-----------|
| `in_review` | PR ouverte, review (humaine ou multi-LLM) en cours |
| `needs_review` | Implémentée, en attente de review avant merge |
| `needs_user_validation` | Implémentée mais non validable E2E par le runner — le user doit valider live (gate CLAUDE.md « no done without E2E ») ; ce n'est PAS `done` |
| `superseded` | Remplacée par une autre task — état terminal, archivable comme `abandoned` |

### Required for `status: ready`

| Field | Type | Description |
|-------|------|-------------|
| `prompt` | string | Full Claude Code prompt (min 50 chars), must be self-contained |
| `files_touched` | array | Files this task can modify (min 1 item) |
| `criteria` | array | Done criteria - binary, verifiable (min 2 items) |

### Required for `type: core` or `type: integration`

| Field | Type | Description |
|-------|------|-------------|
| `success_metrics` | array | Quantitative metrics with thresholds |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | enum | `setup`, `core`, `integration` |
| `review` | enum | `skip`, `opus` (default: opus) |
| `dependsOn` | array | Task IDs this depends on |
| `timeout` | string | Timeout duration (e.g., `30m`) |
| `context` | string | What exists, files to read |
| `edge_cases` | array | Edge cases with expected behavior |
| `boundaries` | object | 3-tier boundaries (always/ask_first/never) |
| `completed` | date | Completion date |
| `pr` | string | PR number (e.g., `#123`) |
| `branch` | string | Git branch name |
| `notes` | string | Additional notes |
| `assignee` | string | Team member ID who claimed this task |
| `reviewer` | string | Team member ID who will review |
| `claimedAt` | date-time | When task was claimed |
| `priority` | object | Scoring based on votes (see below) |
| `quest` | string | `**Quest:** {Qn\|hygiène}` — la quête du `QUESTS.md` que la task sert (voir ci-dessous) |

### Champ `**Quest:**` (optionnel)

Couche portefeuille : relie une task à une quête du `QUESTS.md` de son repo.

| Aspect | Règle |
|--------|-------|
| Valeurs | `Qn` (id d'une quête du QUESTS.md) ou `hygiène` (ne sert aucune quête vivante) |
| Écrit par | `/shika-speccer`, gate quête souple — une fois par feature, après confirmation de scope |
| Consommé par | `/shika-run` §1.1 « Plafond hygiène » — bloque un run portant **≥2** tasks `hygiène` |
| Absent | **toléré et neutre** : ni compté, ni bloqué. Les tasks legacy ne sont jamais rétro-bloquées |
| `validate.ts` | inchangé — champ optionnel, sa présence comme son absence laissent la validation verte |

Motif de lecture ANCRÉ (tolère les 3 dialectes réels, rejette la prose type « Questions universelles ») :
```
/^(?:[-*]\s+)?\*\*Quest\*?\*?:?\*{0,2}\s*(.+?)\s*$/im
```

### Priority Object (yoyo-evolve pattern)

| Field | Type | Description |
|-------|------|-------------|
| `score` | integer | Net score = upvotes - downvotes |
| `upvotes` | integer | Number of thumbs up (default: 0) |
| `downvotes` | integer | Number of thumbs down (default: 0) |
| `source` | enum | `manual`, `github`, `computed` |
| `lastUpdated` | date-time | When score was last synced |

**Sorting rule:** Tasks with `priority.score > 0` are executed before others. Equal scores preserve original order.

**Example:**
```yaml
priority:
  score: 5
  upvotes: 7
  downvotes: 2
  source: github
  lastUpdated: 2026-03-18T10:00:00Z
```

### Multiplayer Fields

These fields enable team collaboration on tasks:

| Field | Type | Description |
|-------|------|-------------|
| `assignee` | string | Team member ID (from team.json) who owns this task |
| `reviewer` | string | Team member ID who will review the PR |
| `claimedAt` | date-time | When the task was claimed via `/shika-claim` |

**Usage:**
- Use `/shika-claim T5` to claim a task (sets `assignee` and `claimedAt`)
- `/shika-run` only executes tasks where `assignee` matches current user OR is empty
- Tasks assigned to others are skipped with a log message

**Example (Markdown in TASKS.md):**
```markdown
### Task 72: Schema team + champs Assignee/Reviewer
**Statut:** ready
**Assignee:** loic
**ClaimedAt:** 2026-03-19T14:00:00Z
**Reviewer:** clement
**Files:**
- schemas/team.schema.json
```

**Example (JSON equivalent):**
```json
{
  "id": "T72",
  "title": "Schema team + champs Assignee/Reviewer",
  "status": "ready",
  "assignee": "loic",
  "reviewer": "clement",
  "claimedAt": "2026-03-19T14:00:00Z"
}
```

## Validation Rules

1. **Ready tasks must have:**
   - Non-empty `prompt` (>= 50 chars)
   - At least 1 file in `files_touched`
   - At least 2 done `criteria`

2. **Core/Integration tasks must have:**
   - `success_metrics` array

3. **Task IDs must be unique**

## Example

```json
{
  "schemaVersion": 1,
  "project": "my-project",
  "lastUpdated": "2026-03-07",
  "tasks": [
    {
      "id": "T1",
      "title": "Setup project structure",
      "status": "ready",
      "type": "setup",
      "prompt": "Create the initial project structure with src/, tests/, and config files...",
      "files_touched": ["src/", "package.json", "tsconfig.json"],
      "criteria": [
        "npm run build passes without errors",
        "tsconfig.json exists with strict mode enabled"
      ]
    }
  ]
}
```

## Recettage automatisé (UI Testing)

Pour les tasks UI, vous pouvez définir un scénario de recettage Playwright qui sera exécuté automatiquement par `/shika-run`.

### Format du champ Recettage

```yaml
**Recettage:**
  base_url: http://localhost:3000
  start_cmd: npm run dev
  steps:
    - goto: /pricing
    - wait: [data-testid=pricing-table]
    - screenshot: 01-pricing-page
    - click: [data-testid=plan-pro]
    - wait: 500ms
    - screenshot: 02-plan-selected
    - fill: [data-testid=email] >> test@example.com
    - click: [data-testid=submit]
    - wait: [data-testid=success-message]
    - screenshot: 03-success
```

### Actions supportées

| Action | Format | Description |
|--------|--------|-------------|
| `goto` | `goto: /path` | Navigate to URL (relative or absolute) |
| `screenshot` | `screenshot: name` | Capture screenshot with name |
| `click` | `click: selector` | Click element (CSS selector) |
| `fill` | `fill: selector >> value` | Fill input field |
| `wait` | `wait: selector` or `wait: 500ms` | Wait for element or duration |
| `scroll` | `scroll: selector` or `scroll: top/bottom` | Scroll to element or position |

### Sélecteurs recommandés

1. `[data-testid=xxx]` — le plus fiable
2. `role=button`, `role=link` — accessibilité
3. `.class-name` — en dernier recours

### Output

Le script génère dans `.shikamaru/recettage/T{id}/`:
- `01-*.png`, `02-*.png`, ... — screenshots
- `report.md` — rapport avec statut de chaque step

### Intégration /shika-run

Le recettage est déclenché automatiquement si le champ `**Recettage:**` est présent dans la task. Un échec marque la task `needs_review` (pas `blocked`).

## Validation

```bash
npx tsx scripts/validate.ts --tasks
```
