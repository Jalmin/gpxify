---
name: shika-update
description: "Updater Shikamaru — propage les mises à jour skills/scripts depuis le repo source vers tous les projets. UTILISER QUAND: mettre à jour Shikamaru sur les projets, nouvelle version skills, propagation de fix."
---

# /shika-update

Propage les fichiers Shikamaru depuis `~/Projects/shikamaru/` vers tous les projets cibles.

## Sources et cibles

**Source (read-only)** : `~/Projects/shikamaru/`
- `.claude/commands/shika-*.md`
- `.claude/commands/references/*.md`
- `.claude/commands/VERSION`
- `scripts/{validate,smoke,archive-done-tasks,synthesize-learnings,recettage,verifier-harnais-smoke}.ts` + `scripts/__fixtures__/smoke-parse.md` — **ALWAYS** propager les scripts runner : les workflows clients les appellent en gates (Smoke §d.1bis BLOQUANT, learnings §3.2) et leur absence produit `ERR_MODULE_NOT_FOUND` en plein run (Ziggy 2026-07-27 : smoke joué inline à la main, `active_learnings.md` jamais régénéré). Le vérificateur et son fixture voyagent ENSEMBLE (un harnais sans corpus est un instrument mort) — upstream du durcissement T90/T91 pennylane, 2026-08-12.
- `schemas/*` — **ALWAYS** propager les dépendances des scripts/workflows avec eux (run-intent.schema.json est cité par shika-run §1). Un script propagé sans ses dépendances produit des fausses alertes côté client (« Schemas loaded: false », Ziggy 2026-07-28).

**Guard run actif** : **NEVER** propager vers un projet dont `.runner-state.json` indique des **agents vivants** (`status` ∈ {`running`, `in_progress`}, ou tout statut **inconnu** — fail-safe — ET `updatedAt` < 24h) — muter le tree sous les pieds d'un runner casse son clean-tree guard et fait accuser ses agents à tort (Ziggy 2026-07-28). Le check remonte AUSSI les répertoires **parents** jusqu'à `~/Projects` : un projet imbriqué partage le git tree de son parent, le propager mute le tree du run parent (BDO/06-agentforce-victor 2026-07-28, trou constaté 30 min après le landing du guard). Le projet est SKIPPÉ avec message explicite dans le récap ; `--force` outrepasse. **Un `checkpoint` ne bloque PAS** : c'est un run **parqué** qui attend une session fraîche, plus personne ne tient le tree, et sa reprise repasse par le clean-tree guard du runner **devant un humain** — l'endroit exact où une modif inattendue doit se voir. Bloquer dessus ne protégeait rien et gelait le projet 24h **après chaque checkpoint**, réarmé à chaque reprise (Ziggy 2026-08-19 : seul des 30 projets resté en arrière, guard forcé à la main après vérification que le run reprenait dans un **worktree séparé**). La propagation par-dessus un checkpoint émet un **avertissement** dans le récap : committer ou stasher avant de reprendre le run. NB : le state peut être périmé dans l'autre sens (BDO : updatedAt de 18h alors que le run committait 3 min avant) — le guard s'appuie sur le state, pas sur l'activité git ; un runner qui ne rafraîchit pas son state se protège mal.

**Cible** : projets avec `.shikamaru/shika-version.json` dans `~/Projects/`

## Miroir global `~/.claude/commands/` — copies réelles uniquement

- **NEVER** installer un skill dans le miroir global via symlink — **ALWAYS** copier le fichier réel. Le harness ne suit pas les symlinks pour l'enregistrement des commandes : seules les copies réelles apparaissent en `/commande` (constaté ×3 : `/shika-improve` → « Unknown command » 2026-07-15 ×2 + 2026-07-26, alors que le symlink existait).
- **ALWAYS** copier aussi `VERSION` dans `~/.claude/commands/` — sans lui, impossible de vérifier quelle version du pack est installée globalement (angle mort du self-check).
- Tout symlink rencontré dans le miroir → le remplacer par une copie réelle lors de la propagation.

## Flags

| Flag | Effet |
|------|-------|
| `--dry` | Liste projets à updater sans toucher |
| `--project=X` | Un seul projet (nom dossier) |
| `--force` | Ignore version, copie tout |
| `--init` | Crée `.shikamaru/` + version si absent |

## Workflow

### 0. Lire version source

```typescript
const sourceVersion = readFile("~/Projects/shikamaru/.claude/commands/VERSION").trim();
// Format: YYYY.MM.DD-PATCH (ex: 2026.05.14-0)
```

### 1. Découvrir projets cibles

```typescript
const projects = find("~/Projects/*/", { dirs: true })
  .filter(p => exists(join(p, ".shikamaru/shika-version.json")) || args.init);
```

### 2. Pour chaque projet

**Si `--init`** :
```bash
mkdir -p .shikamaru
echo '{"version": "0.0.0", "updatedAt": ""}' > .shikamaru/shika-version.json
```

**Comparer versions** :
```typescript
const targetVersion = readJSON("{project}/.shikamaru/shika-version.json").version;
if (targetVersion === sourceVersion && !args.force) {
  log("✓ {project} déjà à jour ({version})");
  continue;
}
```

**Copie des fichiers** (sauf override local) :
```typescript
const files = [
  { src: ".claude/commands/shika-run.md", dest: ".claude/commands/shika-run.md" },
  { src: ".claude/commands/shika-speccer.md", dest: ".claude/commands/shika-speccer.md" },
  { src: ".claude/commands/shika-review.md", dest: ".claude/commands/shika-review.md" },
  { src: ".claude/commands/shika-improve.md", dest: ".claude/commands/shika-improve.md" },
  { src: ".claude/commands/references/", dest: ".claude/commands/references/" },
  { src: "scripts/validate.ts", dest: "scripts/validate.ts" },
  { src: "scripts/smoke.ts", dest: "scripts/smoke.ts" },
  { src: "scripts/archive-done-tasks.ts", dest: "scripts/archive-done-tasks.ts" },
  { src: "scripts/synthesize-learnings.ts", dest: "scripts/synthesize-learnings.ts" },
  { src: "scripts/recettage.ts", dest: "scripts/recettage.ts" },
];

for (const file of files) {
  const localOverride = "{project}/.claude/commands.local/{basename(file)}";
  if (args.dry) {
    log(`[DRY] Copierait: ${file.src} → ${file.dest}`);
    continue;
  }
  
  if (exists(localOverride)) {
    log(`⚠️ Skip ${file.dest} (override local)`);
    continue;
  }
  
  copy(`~/Projects/shikamaru/${file.src}`, `{project}/${file.dest}`);
}
```

**Mise à jour version** (si pas dry) :
```typescript
writeJSON("{project}/.shikamaru/shika-version.json", {
  version: sourceVersion,
  updatedAt: new Date().toISOString(),
  source: "~/Projects/shikamaru",
});
```

### 2.5 Self-check post-propagation (obligatoire)

Le propagateur vérifie son propre travail — **jamais de propagation silencieusement incomplète** :

1. **Complétude** : comparer la liste des fichiers source (`.claude/commands/available/*.md` + `shika-dispatch.md` + `references/*.md` + `VERSION`) avec la liste effectivement installée sur chaque cible (y compris le miroir global `~/.claude/commands/`). Fichier manquant → le lister dans le récap, pas de ✓.
1bis. **Miroir enregistrable — EXÉCUTÉ PAR LE SCRIPT** (T170, plus « à faire à la main »). `propagateToGlobalMirror()` tourne automatiquement après la propagation aux projets et avant le récap ; son self-check intégré vérifie les 3 points : (a) `~/.claude/commands/VERSION` == VERSION source, (b) `find ~/.claude/commands -maxdepth 1 -type l` vide — un symlink = commande non enregistrée par le harness (cf. « copies réelles uniquement »), (c) présence de tous les `shika-*.md` + `references/*.md`. Symlink trouvé → supprimé et remplacé par une copie réelle. Self-check rouge → récap ❌ + **exit 1**, sans annuler la propagation aux projets (déjà réussie).
1ter. **Delete stale du miroir** : un `shika-*.md` racine ou un `references/*.md` présent dans le miroir mais **absent de la source** est supprimé (cas T171 : `shika-migrate.md` et `shika-review.md` archivés hors de `available/` restaient proposés par le harness). Allowlist STRICTE : préfixe `shika-` à la racine + sous-dossier `references/` uniquement. **NEVER** toucher aux fichiers non-shikamaru du miroir (`edgar.md`, `polaris.db`, `sc/`) — y compris s'ils sont des symlinks. Toute suppression est **listée nommément** dans le récap : jamais de disparition silencieuse.
1quater. **Hooks globaux — EXÉCUTÉ PAR LE SCRIPT** (T217). Tout `scripts/hooks/*.py` qui porte, dans ses 10 premières lignes, l'en-tête `# hook: <event> | <matcher> | timeout=<s>` (matcher = tout le milieu, `|` compris : `# hook: PreToolUse | Edit|Write | timeout=10`) est copié dans `~/.claude/hooks/` et son entrée `python3 ~/.claude/hooks/<nom>.py` est fusionnée dans `~/.claude/settings.json`. Sans en-tête → « ignoré (pas d'en-tête hook) ».
   Écriture : lecture → fusion → sauvegarde `settings.json.bak-<horodatage>` → fichier temporaire + rename **sur la cible réelle** (le `settings.json` de claude-b est un lien, il le reste). Une 2ᵉ exécution ne duplique rien.
   Seules les entrées pointant vers `~/.claude/hooks/<x>.py` sont à nous : sans source ni fichier sur disque → retirées et nommées « stale ». Toute autre entrée (kanban, echo…) reste byte-identique. **NEVER** propager dans les `.claude/settings.json` des projets clients.
   Récap : `hooks : N copiés, M déjà à jour, K stale retirés` ; self-check `jq -e '.hooks'` + relecture de chaque entrée, rouge → **exit 1**. Tests : `SHIKA_SOURCE_DIR` + `HOME` temporaires (`tests/test_shika_update_hooks.py`).
2. **Scripts exécutables** : pour chaque script `.ts` propagé → dry-run `npx tsx <script> --help` (ou équivalent no-op) **exécuté DEPUIS le projet cible** (pas depuis la source — c'est le cwd client qui révèle les imports cassés, `__dirname` ESM, paths périmés). Crash → ❌ dans le récap.
3. Tout échec est AFFICHÉ (règle F13) — un self-check rouge n'annule pas la propagation des autres fichiers mais interdit le récap « tout est à jour ».
4. **Scripts VISIBLES DES WORKTREES** : un script propagé mais **non suivi par git** n'existe pas dans les worktrees — les sub-agents du Runner y tournent, et le gate Smoke y meurt en `ERR_MODULE_NOT_FOUND`. Après propagation, vérifier `git check-ignore scripts/<x>.ts` / `git status` sur la cible : script non tracké → ❌ dans le récap + **proposer au user de tracker `scripts/`** dans le repo client. (Ziggy, **2 runs de suite** : `smoke.ts` présent dans le repo, absent des worktrees, 2 tasks tombées ; le fallback inline du §d.1bis a tenu, mais la cause racine est ici.) Alternative acceptable si le client refuse de tracker : lancer le smoke depuis le repo principal après checkout de la branche.
5. **Couplage script ⟂ dépendances** : **NEVER** propager un validateur schema-based sans vérifier que `schemas/` est arrivé avec lui, et le dire dans le récap. **Why** : c'est exactement cette propagation partielle qui a fabriqué le « gate muet » de Ziggy — donc le revert du validateur par le user — donc un gate 0.1 aveugle aux erreurs de schéma pendant plusieurs runs. Une propagation partielle coûte plus cher qu'une propagation refusée.

**Why** : 3 scripts satellites cassés découverts à l'usage et non à la propagation (shika-update paths périmés 06-21, archive-done-tasks regex 05-16, synthesize-learnings ESM 06-11) + miroir global incomplet constaté le 2026-07-15 (`/shika-improve` → Unknown command).

### 3. Récap

```
╔════════════════════════════════════════════════════════╗
║           SHIKA-UPDATE RÉSULTAT                        ║
╠════════════════════════════════════════════════════════╣
║ Source : 2026.05.14-0                                  ║
║ Projets scannés : 42                                   ║
║ Mis à jour : 8                                         ║
║ Déjà à jour : 33                                       ║
║ Skipped (override local) : 1                           ║
╚════════════════════════════════════════════════════════╝
```

**Règles du récap (lisibilité)** :
- **NEVER** tronquer la liste des projets propagés. Soit la liste COMPLÈTE des noms, soit compte total + écarts explicites (« 25 propagés, 2 échoués : X, Y ») — jamais un extrait trié qui masque le reste. (Why : liste tronquée par tri ASCII → fausse conclusion « KONBINI hors périmètre » + user obligé de re-demander la couverture, 2026-07-15/16, ×3 sessions.)
- **ALWAYS** afficher les chemins RELATIFS à `~/Projects` (« POOOL-pipeline/core »), jamais le basename seul — « core » est apparu 3× dans le même récap sans qu'on sache quels sous-projets étaient touchés (2026-07-26).
- **ALWAYS** lister en fin de récap les **candidats non-initialisés** : répertoires de `~/Projects` avec `.claude/` ou `TASKS.md` mais SANS `.shikamaru/shika-version.json`, avec la suggestion `--init --project=X`. (Why : KONBINI invisible du scan, découvert à la main — 2ᵉ session où sa couverture pose question, 2026-07-16 + 2026-07-26.)
- **ALWAYS** conclure le récap post-merge par une phrase d'état sans ambiguïté : « Propagation incluse et terminée — rien à faire dans les projets » (ou l'action restante précise si échecs).

## Règle d'override local

Si projet a `.claude/commands.local/{fichier}` → fichier source skipé pour ce projet.
Permet customisations sans conflit.

## Implémentation

Script : `scripts/shika-update.ts`

```typescript
#!/usr/bin/env node
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, basename } from "path";
import { execSync } from "child_process";

const SOURCE_DIR = "~/Projects/shikamaru";
const PROJECTS_DIR = "~/Projects";

// ... implémentation complète
```

Usage : `npx tsx scripts/shika-update.ts [--dry|--project=X|--force|--init]`

**Arguments : fail-closed.** Tout argument hors de cette liste (ou `--project=`
sans valeur) → `exit 1` avant la moindre écriture, avec suggestion du drapeau
le plus proche. Incident 2026-08-19 : `--dry-run` (au lieu de `--dry`) était lu
comme « pas de dry-run » → propagation LIVE sur 8 projets, l'opérateur croyant
faire un essai à blanc ; `--projet=X` visait les ~29 projets au lieu d'un seul.

