#!/usr/bin/env npx tsx
/**
 * H5: Validateur artefacts bloquant
 * Branché sur les JSON Schemas de schemas/
 *
 * Usage: npx tsx scripts/validate.ts [chemin.md ...] [--tasks-file <p>]
 *                                    [--spec-file <p>] [--tasks] [--spec] [--all]
 * Exit codes: 0 = valid, 1 = errors OU aucun fichier validé
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname, resolve, basename, relative } from "path";
// `.js` obligatoire : package `"type": "module"` → Node ESM refuse l'import
// sans extension sur le chemin compile-puis-node (AGENTS.md, sandbox Cowork).
import { taskHeaderRegex, normalizeTaskId, FIELD_HEADING } from "./lib/task-dialect.js";

// Toutes les règles de validation sont HARDCODÉES ci-dessous (v1) — le
// chargement des JSON Schemas était du code mort (jamais consommé) dont le
// message « Schemas loaded: tasks=false » faisait croire à un gate dégradé
// chez les clients sans schemas/ (fausse alerte Ziggy 2026-07-28).
const rootDir = process.cwd();

// Status values from schema
const VALID_STATUSES = ["pending", "ready", "in_progress", "in_review", "needs_review", "needs_user_validation", "done", "blocked", "timeout", "backlog", "abandoned", "superseded"];
const VALID_REVIEW_LEVELS = ["skip", "standard", "opus"];
const VALID_TASK_TYPES = ["setup", "core", "integration"];

interface ValidationError {
  path: string;
  message: string;
  severity: "error" | "warning";
}

// ── Tolerant field readers ──────────────────────────────────────────────────
// Canonical WRITE dialect is `**Champ:** valeur` (schemas/tasks-schema.md) ;
// READ tolerance also accepts `Champ: valeur` (un-bolded) and the client
// heading dialect `### Champ` + content below (KONBINI/pythia-lab, T155).
// `name` may be a regex alternation like `(?:Statut|Status)`.

/** Single-line field value, or null. */
// `[^*:\n]*` after the name: tolerate free suffix text before the colon
// (`**TDD Tests d'abord (recette pré-enregistrée):**`, `**Prompt Claude Code:**`).
// Ziggy 2026-07-25/27 ×3: a strict `**TDD:**` lookup false-failed the gate on
// every run while the TDD content was present. Suffix tolerance is READ-side
// only — the canonical write format stays `**Champ:**` (schemas/tasks-schema.md).
// STRICT d'abord, tolérant en FALLBACK (review T156 P2) : la tolérance seule
// crée du shadowing par préfixe — `**Tier justification:**` volerait le lookup
// `Tier`, `**Statut cible:**` volerait `Statut`. Le match exact gagne toujours.
// Dialecte BULLET `- **status** : done` (colon HORS du gras, espace avant) :
// KONBINI 2026-07-31 → 10/10 tasks en « Missing status field » alors que chaque
// task portait son statut. La garde anti-silence le reconnaissait déjà, mais pas
// l'extracteur qui lit la valeur — le gate ne pouvait alors ni passer honnêtement
// ni échouer utilement. La tolérance vit ICI (T159), une seule fois, pour TOUS
// les champs (Tier, Review, Goal…) : elle n'était aveugle pour le statut que
// parce qu'elle l'était pour tous.
function fieldValue(block: string, name: string): string | null {
  const bold =
    block.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*(.+)`, "i")) ??
    block.match(new RegExp(`^\\s*[-*]\\s+\\*\\*${name}\\*\\*\\s*:\\s*(.+)$`, "im")) ??
    block.match(new RegExp(`\\*\\*${name}[^*:\\n]*:\\*\\*\\s*(.+)`, "i")) ??
    block.match(new RegExp(`^\\s*[-*]\\s+\\*\\*${name}[^*:\\n]*\\*\\*\\s*:\\s*(.+)$`, "im"));
  if (bold) return bold[1].trim();
  const plain = block.match(new RegExp(`^\\s*(?:[-*]\\s+)?${name}\\s*:\\s*(.+)$`, "im"));
  if (plain) return plain[1].trim();
  const heading =
    block.match(new RegExp(`^#{3,4}\\s+${name}\\s*:?\\s*\\n+(?!#)([^\\n]+)`, "im")) ??
    block.match(new RegExp(`^#{3,4}\\s+${name}[^*:\\n]*:?\\s*\\n+(?!#)([^\\n]+)`, "im"));
  if (heading) return heading[1].trim();
  return null;
}

/** Multi-line field block (until next field/heading/separator), or null. */
function fieldBlock(block: string, name: string): string | null {
  // NB: end-of-string is `(?![\s\S])`, NOT `$` — with the /m flag (needed for
  // the `^` heading anchor) `$` matches end-of-LINE and truncates the block.
  const bold =
    block.match(
      new RegExp(`\\*\\*${name}:\\*\\*([\\s\\S]*?)(?=\\n\\*\\*|\\n#{2,4}\\s|\\n---|(?![\\s\\S]))`, "i")
    ) ??
    block.match(
      new RegExp(`\\*\\*${name}[^*:\\n]*:\\*\\*([\\s\\S]*?)(?=\\n\\*\\*|\\n#{2,4}\\s|\\n---|(?![\\s\\S]))`, "i")
    );
  if (bold) return bold[1];
  // Variante BULLET `- **Files** :` — la frontière de bloc inclut ici la puce
  // de champ suivante (`\n- **Autre** :`). Cette frontière reste EXCLUE des
  // variantes gras ci-dessus : un bloc canonique contient légitimement des
  // puces en gras (`- ✅ **Always:** …` de Boundaries) qui le tronqueraient.
  const bullet =
    block.match(
      new RegExp(
        `^\\s*[-*]\\s+\\*\\*${name}\\*\\*\\s*:([\\s\\S]*?)(?=\\n\\s*[-*]\\s+\\*\\*[^*\\n]+\\*\\*\\s*:|\\n\\*\\*|\\n#{2,4}\\s|\\n---|(?![\\s\\S]))`,
        "im"
      )
    );
  if (bullet) return bullet[1];
  const heading =
    block.match(
      new RegExp(`^#{3,4}\\s+${name}\\s*:?\\s*\\n([\\s\\S]*?)(?=\\n\\*\\*|\\n#{2,4}\\s|\\n---|(?![\\s\\S]))`, "im")
    ) ??
    block.match(
      new RegExp(`^#{3,4}\\s+${name}[^*:\\n]*:?\\s*\\n([\\s\\S]*?)(?=\\n\\*\\*|\\n#{2,4}\\s|\\n---|(?![\\s\\S]))`, "im")
    );
  if (heading) return heading[1];
  return null;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Parse markdown TASKS.md and validate against schema rules
 */
function validateTasks(content: string): ValidationResult {
  const errors: ValidationError[] = [];

  // 1. Validate YAML header (schemaVersion required)
  const headerMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!headerMatch) {
    errors.push({ path: "/header", message: "Missing YAML header (---...---)", severity: "error" });
  } else {
    const header = headerMatch[1];
    if (!header.includes("schemaVersion:")) {
      errors.push({ path: "/header/schemaVersion", message: "Missing schemaVersion (required by schema)", severity: "error" });
    } else {
      const versionMatch = header.match(/schemaVersion:\s*(\d+)/);
      if (!versionMatch || versionMatch[1] !== "1") {
        errors.push({ path: "/header/schemaVersion", message: "schemaVersion must be 1", severity: "error" });
      }
    }
    if (!header.includes("project:")) {
      errors.push({ path: "/header/project", message: "Missing project name (required by schema)", severity: "error" });
    }
  }

  // 2. Parse and validate each task.
  // Canonical header is `### T155 — titre` (schemas/tasks-schema.md "Dialecte
  // Markdown canonique") ; READ tolerance covers the legacy `### Task 72:` and
  // the client dialect `## T2 —` (KONBINI/pythia-lab, T155). The old
  // `split(/^### Task /)` matched none of the modern headers, so task-level
  // validation ran on zero blocks — silently green.
  // Alpha alternative `[A-Z]+[0-9-][A-Z0-9-]*[a-z]?` : même pattern que
  // TASK_HEADER_ALPHA de smoke.ts/archive-done-tasks.ts (T155) — couvre les
  // préfixes projet (`EMAIL-1`, `CRM0-1`, `V3-C1`, Ziggy 2026-07-25/27 ×2).
  // La regex historique `T?\d+` les rendait INVISIBLES : gate 0.1 « vert » en
  // validant les mauvaises tasks, sans aucune erreur levée.
  // La branche alpha EXIGE un séparateur après l'ID (lookahead, review T157 P1) :
  // sans lui, des titres de doc ordinaires (`## API-first design`, `## CI-CD
  // pipeline`, `## B2B onboarding`) deviennent des tasks fantômes → gate
  // faux-ROUGE. Un vrai ID sans séparateur devient invisible mais est rattrapé
  // par la garde anti-silence ci-dessous — c'est son rôle.
  // Grammaire portée dans ./lib/task-dialect (source unique des 3 scripts) —
  // niveau STRICT : c'est ici qu'on ÉNUMÈRE les tasks.
  const headerMatches = [...content.matchAll(taskHeaderRegex("gm"))];
  const taskIds = new Set<string>();
  const dependencies: Map<string, string[]> = new Map();

  // Garde anti-silence : un heading qui RESSEMBLE à une task (son bloc porte un
  // champ statut) mais dont l'ID ne matche pas headerRe → warning, jamais muet.
  {
    const anyHeadingRe = /^#{2,3}\s+\S[^\n]*$/gm;
    // Un FIELD heading (dialecte client `### Statut`, `### Smoke`…) est un CHAMP,
    // pas une frontière de bloc (confirmation T157 : la garde découpait sur tout
    // #{2,3} → un `### Statut` sous `## V3-C1` vidait le bloc → silence total,
    // 3 erreurs perdues vs pré-commit). Même philosophie que archive-done-tasks.
    // FIELD_HEADING vient de ./lib/task-dialect (partagé).
    const matchedStarts = new Set(headerMatches.map((m) => m.index!));
    const allHeadings = [...content.matchAll(anyHeadingRe)].filter((m) => !FIELD_HEADING.test(m[0]));
    for (let i = 0; i < allHeadings.length; i++) {
      const h = allHeadings[i];
      if (matchedStarts.has(h.index!)) continue;
      const blockEnd = i + 1 < allHeadings.length ? allHeadings[i + 1].index! : content.length;
      const block = content.slice(h.index! + h[0].length, blockEnd);
      // Détection statut via fieldValue (review T157 P2) : couvre TOUS les
      // dialectes que le parseur tolère — y compris la forme bullet
      // `- **status** : x`, portée depuis T159 DANS fieldValue plutôt que
      // dupliquée ici (c'était la 3e copie de la même tolérance).
      const hasStatusField = fieldValue(block, "(?:Statut|Status)") !== null;
      if (hasStatusField) {
        // ERROR, pas warning (arbitrage /shika-improve 2026-07-31) : une task
        // invisible du runner est une PANNE de gate, pas une remarque. Le faux
        // positif éventuel est bruyant et se corrige en ajoutant un nom à
        // FIELD_HEADING ; le faux négatif, lui, était silencieux et laissait
        // une task disparaître (confirmation T157 : une vraie task alpha sans
        // séparateur passait de ROUGE 3 erreurs à VERT+warning).
        errors.push({
          path: "/tasks",
          message: `Header de task non reconnu (ID hors format) : « ${h[0].trim()} » — la task serait INVISIBLE au validateur et au runner`,
          severity: "error",
        });
      }
    }
  }

  // INVARIANT (T159) : un fichier de tasks dont on n'extrait AUCUNE task n'a pas
  // été validé — il a été survolé. Déclinaison au niveau task de l'invariant
  // « 0 fichier lu ⇒ ROUGE » : sans lui, un TASKS.md que le parseur ne comprend
  // pas ressort VERT avec « All checks passed », la pire des sorties.
  if (headerMatches.length === 0) {
    errors.push({
      path: "/tasks",
      message: "Aucune task lisible dans ce fichier — le validateur n'a RIEN validé (header attendu : `### T123 — titre` ou `## ABC-1 — titre`)",
      severity: "error",
    });
  }

  for (let i = 0; i < headerMatches.length; i++) {
    const hm = headerMatches[i];
    const blockStart = hm.index! + hm[0].length;
    const blockEnd = i + 1 < headerMatches.length ? headerMatches[i + 1].index! : content.length;
    const block = content.slice(blockStart, blockEnd);
    const titleLine = hm[0].replace(/^#{2,3}\s+/, "");

    // Normalize task ID: `72`, `T72`, `t72b` all live in the same T-uppercase
    // space. Les IDs alpha (`EMAIL-1`, `CRM0-1`) restent TELS QUELS (review
    // T157 P3) — préfixer `T` fabriquait des `TEMAIL-1` introuvables au grep.
    const rawId = hm[1];
    const taskId = normalizeTaskId(rawId);
    const taskPath = `/tasks/${taskId}`;

    // Check for duplicate IDs
    if (taskIds.has(taskId)) {
      errors.push({ path: taskPath, message: `Duplicate task ID: ${taskId}`, severity: "error" });
    }
    taskIds.add(taskId);

    // Extract status (tolerant: bold, plain, or heading dialect).
    // French variants `abandonné(e)(s)` normalize to `abandoned` — same
    // tolerance as archive-done-tasks.ts (clients write them, d67e185).
    const statusRaw = fieldValue(block, "(?:Statut|Status)");
    let status = statusRaw ? statusRaw.split(/\s/)[0].toLowerCase() : null;
    if (status && /^abandonn[eé]e?s?$/.test(status)) status = "abandoned";

    if (!status) {
      errors.push({ path: `${taskPath}/status`, message: "Missing status field (required)", severity: "error" });
    } else if (!VALID_STATUSES.includes(status)) {
      errors.push({ path: `${taskPath}/status`, message: `Invalid status: "${status}". Must be one of: ${VALID_STATUSES.join(", ")}`, severity: "error" });
    }

    // Extract type
    const typeMatch = titleLine.match(/\((\w+)\)$/);
    const taskType = typeMatch ? typeMatch[1].toLowerCase() : null;
    if (taskType && !VALID_TASK_TYPES.includes(taskType)) {
      errors.push({ path: `${taskPath}/type`, message: `Invalid type: "${taskType}". Must be one of: ${VALID_TASK_TYPES.join(", ")}`, severity: "warning" });
    }

    // Extract review level
    const reviewRaw = fieldValue(block, "Review");
    const reviewLevel = reviewRaw ? reviewRaw.split(/\s/)[0].toLowerCase() : null;
    if (reviewLevel && !VALID_REVIEW_LEVELS.includes(reviewLevel)) {
      errors.push({ path: `${taskPath}/review`, message: `Invalid review level: "${reviewLevel}". Must be one of: ${VALID_REVIEW_LEVELS.join(", ")}`, severity: "warning" });
    }

    // Extract tier (XS tasks have relaxed validation — Speccer XS-fast path)
    const tierRaw = fieldValue(block, "Tier");
    const tier = tierRaw ? tierRaw.split(/\s/)[0].toUpperCase() : null;

    // Ready tasks: MUST have Files allowlist and prompt (schema requirement)
    if (status === "ready") {
      const hasFiles = fieldBlock(block, "Files") !== null;
      if (!hasFiles) {
        errors.push({
          path: `${taskPath}/files_touched`,
          message: "Ready task MUST have **Files:** allowlist (required by schema for status=ready)",
          severity: "error"
        });
      }

      // XS-fast / S-mini tier exceptions: Prompt + Critère de done relaxed
      // XS: Done >=1 binaire. S-mini: Done >=3 binaire (per tier-templates.md S-mini section).
      if (tier === "XS" || tier === "S") {
        // XS/S require only Goal + Files + binary Done checkboxes (XS:>=1, S:>=3)
        const goalText = fieldValue(block, "Goal") || "";
        if (!goalText || goalText.length < 20) {
          errors.push({
            path: `${taskPath}/goal`,
            message: `Tier=${tier} task MUST have **Goal:** with >=20 chars (found: ${goalText.length})`,
            severity: "error"
          });
        }

        // Lookups ORDONNÉS, pas d'alternation : une alternation regex est résolue
        // par POSITION dans le bloc (review T156 P2) — un `**Done:** one-liner`
        // avant `**Critère de done:**` volerait le bloc de critères.
        const doneBlock = fieldBlock(block, "Critère de done") ?? fieldBlock(block, "Done");
        // `^\s*` : en dialecte BULLET (`- **Done** :`), les cases sont INDENTÉES
        // sous leur puce parente — c'est la forme markdown normale. Compter en
        // exigeant la colonne 0 rendait le champ lisible mais son contenu
        // invisible : le validateur lisait le NOM du champ dans un dialecte
        // dont il refusait le CONTENU (T159).
        const doneLines = doneBlock ? (doneBlock.match(/^\s*- \[ \]/gm) || []) : [];
        const minDone = tier === "S" ? 3 : 1;
        if (doneLines.length < minDone) {
          errors.push({
            path: `${taskPath}/done`,
            message: `Tier=${tier} task MUST have at least ${minDone} **Done:** checkbox(es) (- [ ] ...) — found ${doneLines.length}`,
            severity: "error"
          });
        }

        // S-mini : Context obligatoire (>30 char) per tier-templates.md S-mini section
        if (tier === "S") {
          const contextText = (fieldBlock(block, "Context") || "").trim();
          if (!contextText || contextText.length < 30) {
            errors.push({
              path: `${taskPath}/context`,
              message: `Tier=S task MUST have **Context:** with >=30 chars (S-mini requires why/constraint) — found: ${contextText.length}`,
              severity: "error"
            });
          }
        }
      } else {
        // `fieldBlock` en dernier recours : sans lui, une task M parfaitement
        // valide écrite en dialecte bullet (`- **Prompt** : …`) sort en
        // « missing prompt » — le helper SAIT lire le champ, mais ce test
        // n'utilisait que les formes canoniques inline (review codex T159 P1).
        const hasPrompt =
          block.includes("**Prompt Claude Code:**") ||
          block.includes("**Prompt:**") ||
          /^#{3,4}\s+Prompt(\s+Claude\s+Code)?\s*:?\s*$/im.test(block) ||
          fieldBlock(block, "Prompt") !== null;
        if (!hasPrompt) {
          errors.push({
            path: `${taskPath}/prompt`,
            message: "Ready task MUST have prompt (required by schema for status=ready)",
            severity: "error"
          });
        }

        // Check for criteria (at least 2 required for ready tasks)
        const criteriaBlock = fieldBlock(block, "Critère de done") ?? fieldBlock(block, "Done");
        if (criteriaBlock === null) {
          errors.push({
            path: `${taskPath}/criteria`,
            message: "Ready task MUST have **Critère de done:** section (required by schema)",
            severity: "error"
          });
        } else {
          // Count lines starting with "- " (both "- text" and "- [ ] text"
          // formats). `^\s*` pour la même raison que les cases Done ci-dessus :
          // le dialecte bullet indente ses critères sous la puce du champ.
          const criteriaLines = criteriaBlock.match(/^\s*- /gm) || [];
          if (criteriaLines.length < 2) {
            errors.push({
              path: `${taskPath}/criteria`,
              message: `Ready task must have at least 2 criteria (found ${criteriaLines.length})`,
              severity: "error"
            });
          }
        }
      }
    }

    // Core/Integration tasks: MUST have success_metrics (schema requirement) — XS exempt
    if ((taskType === "core" || taskType === "integration") && tier !== "XS" && tier !== "S") {
      const hasMetrics = fieldBlock(block, "Success metrics") !== null;
      if (!hasMetrics) {
        errors.push({
          path: `${taskPath}/success_metrics`,
          message: `${taskType} task MUST have **Success metrics:** section (required by schema)`,
          severity: "error"
        });
      }
    }

    // Track dependencies for later validation
    const depsMatch = block.match(/\*\*Dépend de:\*\*\s*(.+)/i);
    if (depsMatch) {
      const depsText = depsMatch[1].trim();
      // Skip if "Rien" or "Nothing" or empty
      if (depsText.toLowerCase() !== "rien" &&
          depsText.toLowerCase() !== "nothing" &&
          depsText.length > 0) {
        // Parse "Task 17, Task 18" or "T17, T18" or "Task 24, Phase 2" patterns
        const deps = depsText
          .split(/,/)
          .map(d => d.trim())
          .filter(d => d.length > 0)
          .map(d => {
            // Normalize "Task 17", "T17", "T17 (with comment)" → "17"
            const taskMatch = d.match(/Task\s*(\d+[a-z]?)/i);
            if (taskMatch) return taskMatch[1];
            const tMatch = d.match(/^T(\d+[a-z]?)\b/i);
            if (tMatch) return tMatch[1];
            // Skip "Rien (jalon ...)" and "Phase X" patterns
            if (d.toLowerCase().startsWith("phase")) return null;
            if (d.toLowerCase().startsWith("rien")) return null;
            return d;
          })
          .filter((d): d is string => d !== null);
        if (deps.length > 0) {
          dependencies.set(taskId, deps);
        }
      }
    }
  }

  // 3. Validate dependencies reference existing tasks
  for (const [taskId, deps] of dependencies) {
    for (const dep of deps) {
      // taskIds holds T-prefixed ids (T1, T17b) — bring the dependency
      // ("17", "T17", "Task 17") into the same space before comparing.
      const normalizedDep = "T" + dep.replace(/^(Task\s*|T)/i, "").toUpperCase();
      if (!taskIds.has(normalizedDep) && !taskIds.has(dep)) {
        errors.push({
          path: `/tasks/${taskId}/dependsOn`,
          message: `Dependency "${dep}" references non-existent task`,
          severity: "error"
        });
      }
    }
  }

  return {
    valid: errors.filter(e => e.severity === "error").length === 0,
    errors,
  };
}

/**
 * Parse markdown SPEC.md and validate against schema rules
 */
function validateSpec(content: string): ValidationResult {
  const errors: ValidationError[] = [];

  // 1. Validate YAML header
  const headerMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!headerMatch) {
    errors.push({ path: "/header", message: "Missing YAML header", severity: "error" });
  } else {
    const header = headerMatch[1];
    if (!header.includes("schemaVersion:")) {
      errors.push({ path: "/header/schemaVersion", message: "Missing schemaVersion", severity: "error" });
    }
    if (!header.includes("project:")) {
      errors.push({ path: "/header/project", message: "Missing project name", severity: "error" });
    }
  }

  // 2. Check required sections (from schema: overview, stack, architecture required)
  const requiredSections: { pattern: RegExp; path: string; name: string }[] = [
    { pattern: /^##\s+(Objectif|Overview|Objective)/mi, path: "/overview", name: "Overview/Objectif" },
    { pattern: /^##\s+(Stack|Stack technique)/mi, path: "/stack", name: "Stack" },
    { pattern: /^##\s+(Architecture|Structure)/mi, path: "/architecture", name: "Architecture/Structure" },
  ];

  for (const section of requiredSections) {
    if (!section.pattern.test(content)) {
      errors.push({
        path: section.path,
        message: `Missing required section: ${section.name} (required by schema)`,
        severity: "error"
      });
    }
  }

  // 3. Optional but recommended sections
  const recommendedSections = [
    { pattern: /^##\s+(Conventions|Règles)/mi, name: "Conventions" },
    { pattern: /^##\s+(Fonctionnalités|Features)/mi, name: "Features" },
  ];

  for (const section of recommendedSections) {
    if (!section.pattern.test(content)) {
      errors.push({
        path: `/${section.name.toLowerCase()}`,
        message: `Recommended section missing: ${section.name}`,
        severity: "warning"
      });
    }
  }

  return {
    valid: errors.filter(e => e.severity === "error").length === 0,
    errors,
  };
}

function printResult(name: string, result: ValidationResult) {
  const errorCount = result.errors.filter(e => e.severity === "error").length;
  const warningCount = result.errors.filter(e => e.severity === "warning").length;
  const icon = result.valid ? "✅" : "❌";

  console.log(`\n${icon} ${name}`);

  // Group errors by path
  const byPath = new Map<string, ValidationError[]>();
  for (const error of result.errors) {
    const existing = byPath.get(error.path) || [];
    existing.push(error);
    byPath.set(error.path, existing);
  }

  for (const [path, pathErrors] of byPath) {
    for (const error of pathErrors) {
      const icon = error.severity === "error" ? "❌" : "⚠️";
      console.log(`   ${icon} ${path}: ${error.message}`);
    }
  }

  if (result.valid && warningCount === 0) {
    console.log("   All checks passed");
  } else {
    console.log(`   Summary: ${errorCount} error(s), ${warningCount} warning(s)`);
  }
}

// ── Résolution des artefacts ────────────────────────────────────────────────
// Le chemin en dur `join(rootDir, "TASKS.md")` rendait le gate AVEUGLE en
// modular monolith : « ⚠️ TASKS.md not found (skipping) » puis « ✅ PASSED »
// sans avoir lu une seule task de subprojects/*/TASKS.md (KONBINI, Ziggy,
// à chaque run depuis le 2026-07-27).
//
// Remonte l'arborescence depuis `start`, en cherchant à CHAQUE niveau le
// fichier direct ET `subprojects/*/<nom>`. Le premier niveau qui donne au moins
// un candidat gagne, et rend l'UNION des deux — plusieurs candidats sont tous
// validés, jamais un choix silencieux. La remontée s'arrête au dépôt (dossier
// portant `.git`) : sans cette borne, un SPEC.md égaré chez un ancêtre commun
// serait validé à la place du bon.
function resolveArtifact(name: string, start: string): string[] {
  let dir = resolve(start);
  for (;;) {
    const found: string[] = [];
    const direct = join(dir, name);
    if (existsSync(direct)) found.push(direct);

    const subRoot = join(dir, "subprojects");
    if (existsSync(subRoot)) {
      for (const entry of readdirSync(subRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const candidate = join(subRoot, entry.name, name);
        if (existsSync(candidate)) found.push(candidate);
      }
    }

    if (found.length > 0) return found;
    if (existsSync(join(dir, ".git"))) return []; // borne dépôt
    const parent = dirname(dir);
    if (parent === dir) return [];
    dir = parent;
  }
}

/** Valeurs d'un flag, formes `--flag valeur` et `--flag=valeur`. */
function flagValues(args: string[], flag: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && i + 1 < args.length && !args[i + 1].startsWith("--")) {
      out.push(args[i + 1]);
    } else if (args[i].startsWith(`${flag}=`)) {
      out.push(args[i].slice(flag.length + 1));
    }
  }
  return out;
}

// Main
const args = process.argv.slice(2);

// DÉFAUT 1 — un chemin POSITIONNEL était avalé : `validate.ts chemin/TASKS.md`
// donnait args.length===1 → validateAll=false → l'argument ne matchait aucun
// flag → AUCUN bloc exécuté → exit 0 + « ✅ Validation PASSED ». Le gate
// n'avait rien lu. Il est désormais résolu comme --tasks-file (ou --spec-file
// selon son nom de fichier).
const KNOWN_FLAGS = new Set(["--all", "--tasks", "--spec"]);
const flagWithValue = new Set(["--tasks-file", "--spec-file"]);
const positionals: string[] = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (flagWithValue.has(a)) { i++; continue; }        // sa valeur, pas un positionnel
  if (a.startsWith("--")) continue;
  positionals.push(a);
}
// Ancré en DÉBUT de nom de fichier : un `/spec/i` en sous-chaîne routait
// `tasks-proSPECtion.md` vers validateSpec (review codex T159 P2), qui le
// rejetait pour « Overview/Stack/Architecture manquants » alors que le MÊME
// fichier passait via --tasks-file. En cas de doute, --spec-file tranche.
const isSpecLike = (p: string) => /^spec\b/i.test(basename(p));

const explicitTasks = [...flagValues(args, "--tasks-file"), ...positionals.filter((p) => !isSpecLike(p))];
const explicitSpecs = [...flagValues(args, "--spec-file"), ...positionals.filter(isSpecLike)];

const unknownFlags = args.filter((a) => a.startsWith("--") && !KNOWN_FLAGS.has(a) && !flagWithValue.has(a) && !a.startsWith("--tasks-file=") && !a.startsWith("--spec-file="));

const validateAll = args.includes("--all") || args.length === 0;
const validateTasksFlag = validateAll || args.includes("--tasks") || explicitTasks.length > 0;
const validateSpecFlag = validateAll || args.includes("--spec") || explicitSpecs.length > 0;

let hasErrors = false;
// DÉFAUT 3 — INVARIANT CENTRAL : ce compteur, et non les chemins d'entrée, est
// ce qui autorise un « PASSED ». Même si un 4e chemin d'entrée apparaît un jour,
// l'invariant tient : 0 fichier réellement lu et validé ⇒ exit 1.
let validatedCount = 0;

console.log("🔍 Validating artifacts (schema version 1)...");
console.log(`   Rules: hardcoded v1\n`);

for (const f of unknownFlags) {
  console.log(`⚠️  Flag inconnu ignoré : ${f}`);
}

function label(path: string): string {
  const rel = relative(rootDir, path);
  return rel && !rel.startsWith("..") ? rel : path;
}

function runOne(kind: "tasks" | "spec", path: string) {
  if (!existsSync(path)) {
    console.log(`\n❌ Fichier introuvable : ${path}`);
    hasErrors = true;
    return;
  }
  const content = readFileSync(path, "utf-8");
  const result = kind === "tasks" ? validateTasks(content) : validateSpec(content);
  printResult(label(path), result);
  validatedCount++;
  if (!result.valid) hasErrors = true;
}

function runKind(kind: "tasks" | "spec", explicit: string[], name: string) {
  const files = explicit.length > 0 ? explicit : resolveArtifact(name, rootDir);
  if (files.length === 0) {
    console.log(`⚠️  ${name} introuvable (ni ici, ni chez un parent du dépôt, ni dans subprojects/*)`);
    return;
  }
  if (files.length > 1) {
    console.log(`ℹ️  ${files.length} ${name} trouvés — TOUS validés :`);
    for (const f of files) console.log(`     • ${label(f)}`);
  }
  for (const f of files) runOne(kind, f);
}

if (validateTasksFlag) runKind("tasks", explicitTasks, "TASKS.md");
if (validateSpecFlag) runKind("spec", explicitSpecs, "SPEC.md");

console.log("");

if (validatedCount === 0) {
  console.log("❌ Gate n'a validé AUCUN fichier — préciser --tasks-file <chemin> (ou passer le chemin en argument)");
  process.exit(1);
}

if (hasErrors) {
  console.log(`❌ Validation FAILED (${validatedCount} fichier(s) lu(s)) - fix errors before running`);
  process.exit(1);
} else {
  console.log(`✅ Validation PASSED (${validatedCount} fichier(s) validé(s))`);
  process.exit(0);
}
