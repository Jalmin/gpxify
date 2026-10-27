---
name: shika-init
description: "Point d'entree universel Shikamaru — 3 modes (Reprendre/Nouveau/Evolution majeure). Interview inversee pour specs de qualite. UTILISER QUAND: nouveau projet, reprendre un projet, planifier une evolution, ou mots-cles 'shikamaru', 'init', 'on reprend', 'c'est quoi le plan', 'nouveau projet', 'on demarre', 'bootstrap'."
---

# /shika-init

Point d'entree universel Shikamaru. **15 min d'echange upfront = des heures de debugging evitees.**

## IMPORTANT : Comportement guide

- ALWAYS follow this flow step by step
- Display the header for each step
- ALWAYS wait for user response before moving to next step
- Use AskUserQuestion for all questions (never plain text)
- Consult BRICKS_INDEX.json for valid stacks/patterns

---

## Etape 0 — Choix du mode

Ask via AskUserQuestion with 3 options:

| Option | Description |
|--------|-------------|
| **REPRENDRE** | Continuer le projet en cours — charge le contexte, propose les prochaines actions |
| **NOUVEAU PROJET** | Demarrer from scratch — interview inversee, genere tous les fichiers Shikamaru |
| **EVOLUTION MAJEURE** | Planifier un gros chantier — refonte archi, migration stack, trop gros pour Speccer |

---

# MODE REPRENDRE

## R1 — Chargement du contexte

Auto-read existing Shikamaru files: CLAUDE.md, TASKS.md, AGENTS.md, ROADMAP.md, SPEC.md, DECISIONS.md

Analyse:
- Tasks in_progress and ready
- Last activity (date dernier commit, file modifications)
- Recent learnings from AGENTS.md

## R2 — Resume et proposition

Display project state summary (type, stack, last activity, in-progress tasks, ready tasks, recent learnings, roadmap next items).

Ask via AskUserQuestion:
- Continuer [task en cours]
- Lancer /shika-run sur les tasks ready
- Ajouter une nouvelle feature (/shika-speccer)
- Planifier une evolution majeure
- Autre chose

---

# MODE NOUVEAU PROJET

## N1 — Detection + Briques

Auto-detect:
1. Project name (package.json, pyproject.toml, Cargo.toml, or folder name)
2. Stack + exact version
3. Git repo check
4. Project type classification:

| Type | Indicateurs |
|------|-------------|
| **scraper** | Puppeteer, Playwright, Scrapy, cheerio, httpx |
| **api** | Express, FastAPI, Hono, routes/, endpoints |
| **fullstack** | Next.js, Nuxt, SvelteKit, app/ + api/ |
| **cli** | bin/, commander, yargs, argparse |
| **lib** | exports dans package.json, setup.py |
| **etl** | pandas, dbt, airflow, data/, pipelines |
| **agent** | langchain, claude-sdk, openai, anthropic |
| **landing** | pages statiques, marketing, SEO |
| **data-analysis** | marimo, jupyter, notebooks |
| **automation** | n8n, make, zapier |

5. Consult BRICKS_INDEX.json for category, default stack, recommended patterns, similar projects

Display detection results + ask confirmation via AskUserQuestion: "C'est bon ?" — Oui / Non, corriger le type / Non, autre stack

## N2 — Interview inversee (15 min)

Generate 5-10 personalized questions based on project type. Internal prompt:
- Goal: get ALL info needed for an unambiguous spec, identify edge cases BEFORE coding, anticipate integration constraints
- NEVER ask questions answerable from code — ONLY business + external constraints questions

Example questions per type:

| Type | Questions typiques |
|------|-------------------|
| **scraper** | Frequence ? Rate limiting ? Stockage ? Alertes si site change ? Format sortie ? |
| **api** | Consommateurs ? Auth ? Rate limiting ? Versioning ? Doc auto ? |
| **fullstack** | Users cibles ? Auth ? Responsive ? SEO ? Deploiement ? |
| **cli** | Users (dev/ops/end-user) ? Interactif/scripted ? Config/flags ? Distribution ? |
| **agent** | LLMs supportes ? Fallback ? Streaming ? Cout max ? Logging ? |
| **etl** | Volume ? Frequence ? Sources multiples ? Validation ? Alertes ? |
| **landing** | Objectif ? Analytics ? A/B testing ? CMS ? Multilingue ? |

Format:
- Use AskUserQuestion with QCM + "Autre"
- Max 4 questions per AskUserQuestion call
- Display recap before continuing

## N3 — Contraintes techniques + Briques

Display default CB stack for project type, ask confirmation: "Tu veux partir sur cette base ?" — Oui / Non, custom

Then ask technical constraints via AskUserQuestion (one at a time):

1. **Framework de test ?** — Options by language, indicate CB recommendation
2. **Librairies OBLIGATOIRES ?** (free text)
3. **Librairies INTERDITES ?** (free text)
4. **Design system / conventions UI ?** (if applicable) — Tailwind / shadcn/ui / Custom tokens / No UI / Autre
5. **Conventions de code ?** — ESLint+Prettier / Biome / Nothing / Autre
6. **Patterns a activer ?** (multiselect from bricks) — env-config, ci-cd, docker-deployment, testing-framework

## N3.5 — Choix d'archetype

**Reference:** `references/init-archetypes.md`

Ask via AskUserQuestion:
1. monolithe-simple
2. monolithe-layered
3. modular-monolith
4. je-sais-pas (triggers clarification questions)

-> see references/init-archetypes.md for details (descriptions, decision tree, structures, conventions, promotion rules, anti-patterns)

If "je-sais-pas":
- Ask: "Combien de modules independants ?" (1 / 2 / 3+)
- Ask: "Si X plante, Y et Z continuent ?" (oui / non)
- Apply decision tree from init-archetypes.md

CLAUDE.md generated MUST include archetype section:
```markdown
## Archetype
**Type** : {simple | layered | modular}
**Justification** : {reason — for modular, list modules}
**Promotion** : see init-archetypes.md section "Promotion entre archetypes"
```

## N4 — Creation des dossiers

Execute mkdir based on archetype from N3.5:
- ALWAYS: `mkdir -p .shikamaru .claude/commands`
- For modular: also create `subprojects/{module1,module2,module3}` + `shared/types/`
- For modular: touch `subprojects/{X}/{CLAUDE,TASKS,AGENTS}.md` per module

## N5 — Generation des fichiers

Create these files with collected info:

### 1. CLAUDE.md
Include: project name, description (from interview), stack + versions, type + similar CB projects, mandatory/forbidden libs, conventions (test framework, code conventions, design system), active patterns, rules (read AGENTS.md, etc.), memory section.

### 2. SPEC.md
Skeleton with frontmatter (schemaVersion, project, type, lastUpdated) + sections: Overview, Stack, Fonctionnalites (TBD by Speccer), Modele de donnees (TBD), Integrations, Edge cases, Deploiement.

### 3. TASKS.md
Frontmatter + first task T1 (type: setup, status: ready) with Goal, Context, Files, Acceptance tests, Rollback, Timeout.

### 4. AGENTS.md
Empty structured file: Learnings (none), Erreurs connues (none).

### 5. ROADMAP.md (optional)
Create only if ideas emerged during interview. Sections: Now / Next / Later / Abandonne.

## N6 — Recap + handoff

Display summary: project name, type, stack, files created (with line counts), constraints captured, edge cases identified.

Ask via AskUserQuestion: "Tu veux lancer /shika-speccer pour approfondir ?" — Oui / Non, je code direct / Non, plus tard

---

# MODE EVOLUTION MAJEURE

## E1 — Chargement contexte + Briques

- Load existing Shikamaru files (same as REPRENDRE)
- Analyze current architecture from code
- Consult BRICKS_INDEX.json: existing patterns, similar projects with comparable evolutions, validated stacks for new need
- Display project summary (same as REPRENDRE)

## E2 — Description du chantier

Ask: "C'est quoi ce chantier en une phrase ?" Wait for response.

## E3 — Interview approfondie (15-20 min)

Ask structured questions via AskUserQuestion:

- **Impact**: modules touches ? deps externes a MAJ ? retro-compatibilite cassee ?
- **Risques**: qu'est-ce qui peut mal tourner ? donnees a migrer ? plan de rollback ?
- **Contraintes**: timeline ? budget ? qui valide quoi ?
- **Alternatives**: autres approches considerees ? pourquoi ce choix ?

## E4 — Generation DECISIONS.md

Create/update DECISIONS.md with new entry containing: date, title, context, options considered (pros/cons each), decision, rationale, consequences, rollback plan.

## E5 — Decoupage en phases

Propose phased breakdown and update ROADMAP.md:
- Now (Phase 1) — items with estimates
- Next (Phase 2) — items with dependencies
- Later (Phase 3+) — optional/nice-to-have

## E6 — Proposition

Display summary: title, number of phases, estimated duration, files updated, Phase 1 ready to spec.

Ask via AskUserQuestion: "Tu veux lancer /shika-speccer sur la Phase 1 ?" — Oui / Non, plus tard / Non, je veux revoir le decoupage

---

# Ressources

## BRICKS_INDEX.json

Located at: `/Users/loicjalmin/Projects/shikamaru/BRICKS_INDEX.json` or `./BRICKS_INDEX.json` in current project.

## Structure BRICKS_INDEX.json

```typescript
interface BricksIndex {
  lastRefresh: string;
  categories: Array<{
    id: string;           // "scraper", "api", "agent", etc.
    name: string;
    projects: string[];
    defaultStack: { lang: string; deps: string[]; db?: string; };
    patterns: string[];
  }>;
  patterns: Array<{
    id: string; name: string; description: string;
    gain: string; seenIn: string[]; appliesTo: string[];
  }>;
  stacks: Array<{
    id: string; name: string; seenIn: string[];
    deps: string[]; useCase: string;
  }>;
}
```
