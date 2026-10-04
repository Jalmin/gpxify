---
title: Project Details
description: Detailed structure tree and patterns for Shikamaru project. Deported from CLAUDE.md for token optimization.
---

## Full Structure Tree

```
shikamaru/
├── .claude/commands/     # Skills: shika-init, speccer, run, qa, review, improve, migrate
│   └── references/       # task-schema, tier-classifier-fast, tier templates, plan-critique, init-archetypes
├── runner-qa/            # E2E Playwright (shika-qa v1)
│   ├── src/              # auth, cli, error-collector, manifest, reporter, run, screenshots
│   └── tests/            # unit/ + smoke.spec.ts
├── scripts/              # validate, recettage, archive-done-tasks, synthesize-learnings, etc.
├── .shikamaru/           # run-intent, runner state, smoke reports
├── schemas/              # JSON + Markdown schemas
├── memory/               # Memoire persistante inter-sessions
└── CLAUDE.md, AGENTS.md, AGENTS-core.md, TASKS.md, QUESTS.md
```

## Scoring projets — guidelines pour scan/review agents

### Critères pondérés (priorité décroissante)
1. **Client satisfaction** + **in-prod / shipped** (poids fort)
2. **Stabilité fonctionnelle** (pas de friction utilisateur récente, pas de bugs ouverts critiques)
3. **Activité récente** (commits 30j, mtime) — poids faible, pas un proxy de valeur

### NEVER
- **NEVER** classer "low priority" un projet stable in-prod uniquement parce qu'il a peu de commits récents.
- **NEVER** scorer sur "âge du repo" / "maturité technique" comme signal négatif. Un projet abouti = OK, pas un risque.

**Why** : pattern récurrent 2026-05-03 — user a corrigé 2× le scan agent qui sous-évaluait kaliokool, ziggy, isidore leroy (in-prod, clients contents). Réinjecté ici le 2026-07-15 après suppression accidentelle par le slim CLAUDE.md T136 (finding R1 `/shika-improve`).

**How to apply** : tout agent qui produit `SCAN_REPORT.md` / `PROJECTS_REVIEW.md` / classement projets DOIT lire ces critères avant de scorer. Le `commit_activity_30d` dans `.shikamaru/routine-config.yaml` reste un signal opérationnel (qui scanne quoi cette nuit) mais n'est PAS un score de valeur.

**Source** : `/shika-improve` 2026-05-06 finding F14, re-landé 2026-07-15 (R1).

## Patterns Phase 12 (Sprint 1-4, 2026-05-03)

| Pattern | Reference |
|---------|-----------|
| Architecture 3-prompts (classifier → template → spec writer) | RouteLLM ICLR 2025 |
| Sub-agent batched (1 appel, N elements) | T97/T100/T106 |
| Sleep cycle bio-inspire (NREM + REM-like) | Frank's living skills |
| Modular monolith + git history hybride | T110-T112 |
| Diff-based insights | Nearly_Tarzan (Reddit) |
| Reviewable artifact (mail draft + Sheet) | Anthropic finding |
| Routing 4 destinations (memory/CLAUDE.md/skill/hook) | LeWoltzy (Reddit) |
| 3 archetypes meta-spec | T110 |
