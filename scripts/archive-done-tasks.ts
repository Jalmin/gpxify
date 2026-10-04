import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
// `.js` obligatoire : package `"type": "module"` → Node ESM refuse l'import
// sans extension sur le chemin compile-puis-node (AGENTS.md, sandbox Cowork).
import { isTaskBoundary, resolveTasksFile, findTaskHeaders, normalizeTaskId } from "./lib/task-dialect.js";

// Canonical status field is `**Statut:** done`; READ tolerance also accepts the
// un-bolded `Statut: done` emitted by the client dialect (KONBINI/pythia-lab).
// Optional leading bullet + colon inside OR outside the bold: covers the
// client dialect `- **status** : done` (KONBINI data-reliability 2026-07-27 —
// 53 done accumulées, « No done tasks found » à tort).
const DONE_PATTERN = /^(?:[-*]\s+)?(?:\*\*)?(Statut|Status)\s*:?\s*(?:\*\*)?\s*:?\s*(done|abandoned|abandonn[eé]e?s?|superseded)\b/im;
// Any-status variant (valeur libre, accents inclus) — le colon est OBLIGATOIRE
// (dedans ou dehors du bold) : sans lui, une phrase en prose commençant par
// « Statut » serait parsée comme un statut.
const STATUS_ANY_PATTERN = /^(?:[-*]\s+)?(?:\*\*)?(?:Statut|Status)(?:\s*:\s*(?:\*\*)?|\s*\*\*\s*:)\s*([a-zà-ÿ_-]+)\b/im;
// Valeurs terminales archivables — même liste que DONE_PATTERN.
const DONE_LIKE = /^(done|abandoned|abandonn[eé]e?s?|superseded)$/i;
// Champ statut EMBARQUÉ mi-ligne, dialecte compact `**Tier:** S | **Type:**
// cleanup | **Statut:** done` (kaliokool-v2 2026-08-16 : 7 done inline
// invisibles, comptées « sans-statut » — 4 retirées à la main dans le commit
// 88a95f73 de kaliokool). Sans l'ancre ^, c'est le BOLD qui distingue un champ
// d'une mention en prose : `**Statut:**` obligatoire, colon dedans ou dehors.
const STATUS_INLINE_PATTERN = /\*\*(?:Statut|Status)(?:\s*:\s*\*\*|\s*\*\*\s*:)\s*([a-zà-ÿ_-]+)\b/i;
// Heading-field dialect: `### Statut` on its own line, value on the next line.
const STATUS_HEADING = /^#{3,4}\s+(Statut|Status)\s*:?\s*$/i;
// Matches numeric (T1, 12) or alpha-prefixed (A1, PP1, AL-1, NOTE-MTR, TL-PROV-STUBS)
// task IDs, at heading level 2 (client dialect `## T2 —`) or 3 (canonical `### T2 —`).
// Alpha IDs are CASE-SENSITIVE and require a digit or dash, so that field
// headings of the client dialect (`### Statut`, `### Smoke`, `### TDD`) are
// never mistaken for task headers (the old /i alpha branch matched any word).
// Grammaire portée dans ./lib/task-dialect (source unique des 3 scripts).
// Niveau TOLÉRANT : ici on FERME des sections dans un script qui en SUPPRIME —
// rater une frontière ferait absorber une task par le bloc précédent.
const isTaskHeader = isTaskBoundary;
// Champ de DÉPENDANCE. Le motif est calqué sur STATUS_ANY_PATTERN (colon dedans
// OU dehors du bold, puce optionnelle) parce que le portefeuille porte le même
// éparpillement : 10 formes distinctes mesurées sur 260 occurrences réelles —
// `- **Depends:**` (38), `**DependsOn:**` (16), `- **Depends on** :` (11),
// `**Dépend de:**` (11), `**depends_on:**` (9), `**Dependances:**` (9),
// `**Dependencies:**` (8)… Un motif qui n'accepterait que le canonique
// protégerait moins d'un tiers des dépendances existantes. Le colon reste
// OBLIGATOIRE (dedans ou dehors du bold), comme pour STATUS_ANY_PATTERN :
// c'est lui qui distingue un CHAMP d'une mention en prose.
const DEPENDS_PATTERN =
  /^(?:[-*]\s+)?(?:\*\*)?(?:D[ée]pend(?:enc(?:y|ies)|ances?|s)?(?:[\s_]*(?:de|on))?)(?:\s*:\s*(?:\*\*)?|\s*\*\*\s*:)\s*(.+)$/im;
// Jetons candidats dans la VALEUR du champ : `T182`, `182`, `EMAIL-1`, `A1`.
// Ils ne deviennent des bloqueurs que s'ils résolvent vers un header RÉEL du
// fichier — c'est ce filtre qui rend inoffensif un ID inexistant (`T999`) comme
// un mot de prose (`aucune`), sans aucun crash.
// L'ancien motif exigeait un chiffre, ou 2+ lettres avant le tiret : `T-DONE`,
// pourtant un header VALIDE de la grammaire alpha (`[A-Z]+[0-9-][A-Z0-9-]*`),
// n'était pas extrait — la dépendance ne protégeait rien (review P1). On repère
// donc LARGEMENT et on filtre STRICTEMENT : seul un jeton qui résout vers un
// header réel du fichier devient un bloqueur, ce qui rend inoffensifs les mots
// de prose comme les IDs inexistants.
const DEP_ID_TOKEN = /\b[A-Za-z][A-Za-z0-9-]*\b|\b\d[A-Za-z0-9-]*\b/g;
// Numéros d'ANNOTATION (`PR #261`, `#10 merged`) : retirés avant extraction.
// Mesuré sur le portefeuille — `**Dépend de** : audit \`N8N-AUDIT-001\` (done,
// PR #261` — où `#261` serait pris pour une dépendance vers T261 si elle
// existait, et retiendrait une task sans aucun rapport (review P2).
const DEP_ANNOTATION = /#\d+/g;
// Champ de dépendance en HEADING (`### Depends` puis la valeur en dessous).
// `FIELD_HEADING` de task-dialect liste `Depends` : le dialecte est au contrat
// même s'il compte 0 occurrence sur le portefeuille aujourd'hui (review P1).
const DEPENDS_HEADING =
  /^#{3,4}\s+(?:D[ée]pend(?:enc(?:y|ies)|ances?|s)?(?:[\s_]*(?:de|on))?)\s*:?\s*$/i;

/** ID normalisé porté par une ligne de header, ou null. */
function idDeHeader(line: string): string | null {
  const m = line.match(
    // `[Tt][Aa][Ss][Kk]` et non `[Tt]ask` : c'est la casse qu'accepte
    // TASK_BOUNDARY_NUM. Avec le motif étroit, un `### TASK 5` était retiré par
    // la passe d'archivage mais absent de la collecte — sa dépendance ne
    // protégeait rien (review P1).
    /^#{2,3}\s+(?:[Tt][Aa][Ss][Kk]\s+)?([A-Za-z]*\d[A-Za-z0-9-]*|[A-Za-z]+[0-9-][A-Za-z0-9-]*)/
  );
  return m ? normalizeTaskId(m[1]) : null;
}

/**
 * Statut d'une section, à l'autorité PREMIER-TROUVÉ **en ordre source**.
 *
 * Les deux passes du script — collecte des dépendances et archivage — DOIVENT
 * lire le statut de la même façon. Une première version faisait un
 * `section.match(ANCRÉ) ?? section.match(INLINE)` : ça cherche la forme ancrée
 * dans TOUTE la section avant d'essayer l'inline, donc un `**Statut:** ready`
 * inline suivi plus bas d'une note ancrée classait la task terminale d'un côté
 * et vivante de l'autre — le script gardait le dépendant ET supprimait son
 * prérequis (review P1).
 */
function lireStatut(lines: string[], depart: number): { statut: string | null; isDone: boolean } {
  for (let j = depart; j < lines.length; j++) {
    if (isTaskHeader(lines[j])) break;
    if (PHASE_HEADER.test(lines[j])) break;
    const st = lines[j].match(STATUS_ANY_PATTERN) ?? lines[j].match(STATUS_INLINE_PATTERN);
    if (st) {
      const v = st[1].toLowerCase();
      return { statut: v, isDone: DONE_LIKE.test(v) };
    }
    if (STATUS_HEADING.test(lines[j])) {
      let k = j + 1;
      while (k < lines.length && lines[k].trim() === "") k++;
      if (k < lines.length) {
        const v = lines[k].trim().split(/\s/)[0].toLowerCase();
        return { statut: v, isDone: DONE_LIKE.test(v) };
      }
      return { statut: null, isDone: false };
    }
    if (DONE_PATTERN.test(lines[j])) return { statut: null, isDone: true };
  }
  return { statut: null, isDone: false };
}

const SECTION_SEPARATOR = /^---\s*$/;
const PHASE_HEADER = /^## /;
const FRONTMATTER_FENCE = /^---\s*$/;


interface ArchiveResult {
  originalLines: number;
  cleanedLines: number;
  tasksRemoved: number;
  tokensEstimatedSaved: number;
  output: string;
  /** Anti-silence : nombre total de headers de task reconnus. */
  totalTasks: number;
  /** Anti-silence : répartition des statuts parsés (« sans-statut » si aucun trouvé). */
  statusCounts: Record<string, number>;
  /** Tasks terminales NON archivées parce qu'une task vivante en dépend. */
  exclusions: { id: string; bloqueurs: string[] }[];
}

/**
 * IDs de tasks qui doivent SURVIVRE à l'archivage parce qu'une task survivante
 * les cite en dépendance.
 *
 * Le script n'avait aucune notion de dépendance (`grep -i depend` = 0). Il
 * archivait une task `done` citée par une task `ready` ; le successeur gardait
 * une référence vers un ID qui ne résout plus, et le gate 0.1 du run suivant
 * démarrait ROUGE. 4+ occurrences, dont « 4 en un seul geste ».
 *
 * C'est une CLÔTURE, pas un simple balayage : une task terminale retenue est
 * elle-même une survivante, donc SES dépendances doivent survivre aussi. Sans
 * le point fixe, la chaîne `T10(done) ← T11(done) ← T12(ready)` retenait T11
 * mais archivait T10 — on gardait une référence pendante en croyant l'éviter
 * (review P1). On itère jusqu'à stabilité.
 *
 * Un dépendant MORT et NON retenu ne protège rien : sa dépendance est de
 * l'histoire, pas un lien à préserver.
 *
 * Les frontières de section sont celles de la passe d'archivage
 * (`isTaskHeader`, niveau TOLÉRANT) et non la grammaire stricte : les deux
 * passes doivent voir exactement les mêmes tasks, sinon une task gardée par
 * l'une est ignorée par l'autre (review P2).
 */
function collectLiveDependencies(content: string): Map<string, string[]> {
  const lines = content.split("\n");
  type Tache = { id: string; isDone: boolean; deps: string[] };
  const taches: Tache[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!isTaskHeader(lines[i])) continue;
    const id = idDeHeader(lines[i]);
    if (!id) continue;

    const { isDone } = lireStatut(lines, i + 1);
    const deps: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      if (isTaskHeader(lines[j]) || PHASE_HEADER.test(lines[j])) break;
      let valeur: string | null = null;
      const dep = lines[j].match(DEPENDS_PATTERN);
      if (dep) {
        valeur = dep[1];
      } else if (DEPENDS_HEADING.test(lines[j])) {
        // Valeur sur la/les lignes suivantes, jusqu'à la première ligne vide.
        let k = j + 1;
        while (k < lines.length && lines[k].trim() === "") k++;
        const morceaux: string[] = [];
        while (k < lines.length && lines[k].trim() !== "" && !lines[k].startsWith("#")) {
          morceaux.push(lines[k]);
          k++;
        }
        valeur = morceaux.join(" ") || null;
      }
      if (!valeur) continue;
      for (const brut of valeur.replace(DEP_ANNOTATION, " ").match(DEP_ID_TOKEN) ?? [])
        deps.push(normalizeTaskId(brut));
    }
    taches.push({ id, isDone, deps });
  }

  const connus = new Set(taches.map((t) => t.id));
  // Amorce : tout ce qui n'est pas terminal survit de toute façon.
  const survivantes = new Set(taches.filter((t) => !t.isDone).map((t) => t.id));
  const protege = new Map<string, string[]>();

  let bouge = true;
  while (bouge) {
    bouge = false;
    for (const t of taches) {
      if (!survivantes.has(t.id)) continue;
      for (const d of t.deps) {
        // Inconnu du fichier ou auto-référence : ne bloque personne, et n'a
        // rien à faire dans un message d'exclusion.
        if (!connus.has(d) || d === t.id) continue;
        const liste = protege.get(d) ?? [];
        if (!liste.includes(t.id)) liste.push(t.id);
        protege.set(d, liste);
        if (!survivantes.has(d)) {
          survivantes.add(d);
          bouge = true;
        }
      }
    }
  }

  // Ne restent que les tasks TERMINALES retenues : une task vivante n'a pas
  // besoin d'être « protégée », elle n'était pas candidate à l'archivage.
  const terminales = new Set(taches.filter((t) => t.isDone).map((t) => t.id));
  for (const id of [...protege.keys()]) if (!terminales.has(id)) protege.delete(id);
  return protege;
}

function parseAndArchive(content: string): ArchiveResult {
  const protege = collectLiveDependencies(content);
  const exclusions: { id: string; bloqueurs: string[] }[] = [];
  const lines = content.split("\n");
  const kept: string[] = [];
  let tasksRemoved = 0;
  let totalTasks = 0;
  const statusCounts: Record<string, number> = Object.create(null);

  let inFrontmatter = false;
  let frontmatterDone = false;
  let inDoneTask = false;
  let i = 0;

  // Handle YAML frontmatter
  if (lines[0]?.trim() === "---") {
    inFrontmatter = true;
    kept.push(lines[0]);
    i = 1;
    while (i < lines.length) {
      kept.push(lines[i]);
      if (i > 0 && FRONTMATTER_FENCE.test(lines[i])) {
        inFrontmatter = false;
        frontmatterDone = true;
        i++;
        break;
      }
      i++;
    }
  }

  while (i < lines.length) {
    const line = lines[i];

    if (isTaskHeader(line)) {
      totalTasks++;
      // Look ahead: is this task done/abandoned? (+ statut parsé pour l'anti-silence)
      // Fenêtre NON bornée (review T158 P2 : offsets réels p99=4 mais max=21 —
      // T69 KONBINI raté derrière un bloc Progress) ; les break sur task/phase
      // header bornent déjà la section.
      // Autorité PREMIER-TROUVÉ en ordre source, partagée avec la passe de
      // collecte des dépendances (review P1 : deux lectures divergentes
      // gardaient le dépendant ET supprimaient son prérequis).
      // Fenêtre NON bornée (review T158 P2 : offsets réels p99=4 mais max=21 —
      // T69 KONBINI raté derrière un bloc Progress) ; les break sur task/phase
      // header bornent déjà la section.
      const { statut: parsedStatus, isDone } = lireStatut(lines, i + 1);
      const statusKey = parsedStatus ?? (isDone ? "done" : "sans-statut");
      statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1;

      // Une task terminale citée par une task VIVANTE reste en place : la
      // retirer fabriquerait la référence pendante qui rend le gate 0.1 rouge.
      const idCourant = idDeHeader(line);
      const bloqueurs = idCourant ? protege.get(idCourant) : undefined;
      if (isDone && bloqueurs && bloqueurs.length > 0) {
        exclusions.push({ id: idCourant!, bloqueurs });
        inDoneTask = false;
        kept.push(line);
        i++;
        continue;
      }

      if (isDone) {
        inDoneTask = true;
        tasksRemoved++;
        i++;
        continue;
      } else {
        inDoneTask = false;
        kept.push(line);
        i++;
        continue;
      }
    }

    if (inDoneTask) {
      // Skip lines until next task header, phase header, or end
      if (PHASE_HEADER.test(line)) {
        inDoneTask = false;
        kept.push(line);
      } else if (SECTION_SEPARATOR.test(line)) {
        // Check if next non-empty line is a task header or phase header
        let nextContentIdx = i + 1;
        while (nextContentIdx < lines.length && lines[nextContentIdx].trim() === "") {
          nextContentIdx++;
        }
        if (
          nextContentIdx < lines.length &&
          (isTaskHeader(lines[nextContentIdx]) || PHASE_HEADER.test(lines[nextContentIdx]))
        ) {
          // Skip the separator — it belonged to the done task
        } else if (nextContentIdx >= lines.length) {
          // End of file, skip trailing separator
        } else {
          kept.push(line);
        }
      }
      i++;
      continue;
    }

    kept.push(line);
    i++;
  }

  // Clean up: remove consecutive blank lines (max 2) and trailing separators for empty phases
  const cleaned: string[] = [];
  let blankCount = 0;
  for (const line of kept) {
    if (line.trim() === "") {
      blankCount++;
      if (blankCount <= 2) cleaned.push(line);
    } else {
      blankCount = 0;
      cleaned.push(line);
    }
  }

  // Remove trailing whitespace
  while (cleaned.length > 0 && cleaned[cleaned.length - 1].trim() === "") {
    cleaned.pop();
  }
  cleaned.push(""); // single trailing newline

  const output = cleaned.join("\n");
  const originalChars = content.length;
  const cleanedChars = output.length;
  const tokensSaved = Math.round((originalChars - cleanedChars) / 4);

  return {
    originalLines: lines.length,
    cleanedLines: cleaned.length,
    tasksRemoved,
    tokensEstimatedSaved: tokensSaved,
    output,
    totalTasks,
    statusCounts,
    exclusions,
  };
}

function addArchiveHeader(content: string, tasksRemoved: number): string {
  const date = new Date().toISOString().split("T")[0];
  const comment = `<!-- Archive: ${tasksRemoved} tasks done/abandoned supprimées le ${date}. Voir git history: git log -p -- TASKS.md -->`;

  // Insert after frontmatter if present, otherwise at top
  const lines = content.split("\n");
  if (lines[0]?.trim() === "---") {
    let endIdx = -1;
    for (let i = 1; i < lines.length; i++) {
      if (FRONTMATTER_FENCE.test(lines[i])) {
        endIdx = i;
        break;
      }
    }
    if (endIdx > 0) {
      lines.splice(endIdx + 1, 0, "", comment);
      return lines.join("\n");
    }
  }

  return comment + "\n\n" + content;
}

// --- CLI ---
const args = process.argv.slice(2);
const applyMode = args.includes("--apply");
// `--tasks-file <path>` OU un positionnel, indifféremment — même contrat que
// smoke.ts. Avant, `--tasks-file` tombait dans le `find(a => !a.startsWith("--"))`
// : le flag était ignoré et c'est le path SUIVANT qui était consommé, une
// coïncidence qui masquait l'asymétrie entre les deux scripts.
const filePath = resolveTasksFile(args, "./TASKS.md");

if (!existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  // Modular monolith : le TASKS.md vit dans les sous-projets — guider au lieu
  // d'échouer muettement sur le défaut ./TASKS.md.
  if (existsSync("subprojects")) {
    const candidates = readdirSync("subprojects", { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => `subprojects/${d.name}/TASKS.md`)
      .filter((p) => existsSync(p));
    if (candidates.length > 0) {
      console.error(`   Modular monolith détecté — passer le fichier explicitement :`);
      for (const c of candidates) console.error(`   npx tsx scripts/archive-done-tasks.ts ${c} [--apply]`);
    } else {
      console.error(`   subprojects/ présent mais aucun TASKS.md trouvé dedans — vérifier le chemin passé.`);
    }
  }
  process.exit(1);
}

const content = readFileSync(filePath, "utf-8");
const result = parseAndArchive(content);

// Les exclusions sont annoncées AVANT toute autre sortie, et dans les DEUX
// chemins : une task terminale retenue est une décision du script, pas un
// non-événement. Sans ça, un fichier dont toutes les done sont protégées
// afficherait « No done/abandoned tasks found » — le même message sec qu'un
// dialecte non reconnu, la confusion que l'anti-silence existe pour supprimer.
if (result.exclusions.length > 0) {
  console.error(`🔒 ${result.exclusions.length} task(s) terminale(s) NON archivée(s) — une task vivante en dépend :`);
  for (const e of result.exclusions) {
    console.error(`   ${e.id} ← cité par ${e.bloqueurs.join(", ")}`);
  }
  console.error(`   Archiver ${result.exclusions.map((e) => e.id).join("/")} laisserait une référence pendante, et le gate 0.1 du run suivant démarrerait rouge.`);
  console.error("");
}

if (result.tasksRemoved === 0) {
  // Anti-silence : dire ce qui a été VU, pas juste « rien trouvé » — un
  // dialecte non reconnu produirait exactement le même message sec (Ziggy
  // 2026-07-27 : 53 done invisibles, « No done tasks found » à tort).
  if (result.totalTasks === 0) {
    console.log("⚠️  No done/abandoned tasks found — et 0 header de task reconnu dans ce fichier.");
    console.log("   Si le fichier contient bien des tasks, leur dialecte n'est pas reconnu (vérifier headers/statuts).");
  } else {
    const breakdown = Object.entries(result.statusCounts)
      .map(([s, n]) => `${s}=${n}`)
      .join(", ");
    const suffixe =
      result.exclusions.length > 0
        ? ` — ${result.exclusions.length} retenue(s) par une dépendance vivante, voir ci-dessus`
        : "";
    console.log(`✅ No done/abandoned tasks found — nothing to archive${suffixe}. (${result.totalTasks} tasks vues ; statuts : ${breakdown})`);
  }
  process.exit(0);
}

console.log(`📊 Archive summary for ${filePath}:`);
console.log(`   Tasks to remove: ${result.tasksRemoved}`);
if (result.exclusions.length > 0) {
  console.log(`   Tasks retenues (dépendance vivante): ${result.exclusions.map((e) => `${e.id}←${e.bloqueurs.join("/")}`).join(", ")}`);
}
{
  // Anti-silence aussi dans le chemin succès (review T158 P2b) : sur le fichier
  // cible, 53 archivées s'affichaient mais le sans-statut=1 de T69 restait muet.
  const breakdown = Object.entries(result.statusCounts).map(([s, n]) => `${s}=${n}`).join(", ");
  console.log(`   Tasks vues: ${result.totalTasks} (${breakdown})`);
}
console.log(`   Lines: ${result.originalLines} → ${result.cleanedLines} (-${result.originalLines - result.cleanedLines})`);
console.log(`   Tokens saved: ~${result.tokensEstimatedSaved}`);
console.log("");

if (applyMode) {
  const finalOutput = addArchiveHeader(result.output, result.tasksRemoved);
  writeFileSync(filePath, finalOutput, "utf-8");
  console.log(`✅ Written to ${filePath}`);
} else {
  console.log("🔍 Dry-run mode — use --apply to write changes.");
}
