#!/usr/bin/env npx tsx
/**
 * proof-report.ts — rapport de preuve en conditions réelles (§d.0 du runner, T223).
 *
 * Le runner exerce chaque critère Done sur le livrable construit (navigateur,
 * requête, commande) et consigne, critère par critère, `prouvé` ou `non_prouvé`.
 * Ce script écrit ce rapport et vérifie qu'il couvre EXACTEMENT les critères
 * Done de la task. Il ne change aucun statut : la preuve est NON bloquante.
 *
 * Usage :
 *   npx tsx scripts/proof-report.ts --task <id> --write  [--root <dir>]            < items.json
 *   npx tsx scripts/proof-report.ts --task <id> --check  [--tasks-file <f>] [--root <dir>]
 *
 * Entrée de --write (stdin) :
 *   {"items":[{"index":1,"statut":"prouvé","moyen":"commande","geste":"…","constat":"…"},
 *             {"index":3,"statut":"non_prouvé","categorie":"secret_absent","raison":"…"}]}
 *
 * Codes de sortie : 0 rapport valide (--check imprime UNE ligne `preuve : …`) ;
 * 1 rapport absent, illisible, incomplet ou invalide (stderr nomme critère + champ).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { extractTaskSection, resolveTasksFile } from './lib/task-dialect.js';

export const CATEGORIES = [
  'secret_absent',
  'service_indisponible',
  'geste_humain',
  'irreversible',
  'delai',
  'non_applicable',
] as const;
const MOYENS = ['navigateur', 'requête', 'commande'];

export interface ProofItem {
  index: number;
  statut: 'prouvé' | 'non_prouvé';
  moyen?: string;
  geste?: string;
  constat?: string;
  categorie?: string;
  raison?: string;
}
export interface ProofReport {
  taskId: string;
  createdAt: string;
  items: ProofItem[];
}

/** Début du champ Done, dans les dialectes du portefeuille (gras, puce, heading). */
const DONE_START = /^(?:[-*]\s+)?(?:\*\*(?:Done|Crit[eè]res?(?: de)? done)\s*:?\s*\*\*\s*:?|#{3,4}\s+(?:Done|Crit[eè]res?(?: de)? done)\b)/i;
/** Un autre champ ferme le Done : `**Xxx:**`, `- **Xxx**:`, ou un heading. */
const FIELD_START = /^(?:[-*]\s+)?\*\*[^*]+\*\*|^#{2,4}\s/;
/** Case à cocher de premier niveau, cochée ou non : l'index suit l'ordre d'apparition. */
const CHECKBOX = /^ ?[-*]\s+\[[ xX]\]\s+(.*)$/;

/** Critères Done de la section, dans l'ordre. `[]` si la task n'a pas de champ Done. */
export function extractDoneCriteria(section: string): string[] {
  const lines = section.split('\n');
  const start = lines.findIndex((l) => DONE_START.test(l));
  if (start === -1) return [];
  const criteria: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const box = CHECKBOX.exec(line);
    if (box) {
      criteria.push(box[1].trim());
      continue;
    }
    if (FIELD_START.test(line)) break;
  }
  return criteria;
}

export function reportPath(root: string, taskId: string): string {
  return join(root, '.shikamaru', 'proof', taskId, 'report.json');
}

const nonVide = (v: unknown): boolean => typeof v === 'string' && v.trim() !== '';

/** Erreurs de validation — vide = rapport conforme. Chaque erreur nomme le critère et le champ. */
export function validateReport(report: unknown, criteria: string[]): string[] {
  const items = (report as ProofReport | null)?.items;
  if (!Array.isArray(items)) return ['rapport invalide : champ `items` absent ou non tableau'];
  const errors: string[] = [];
  const seen = new Map<number, ProofItem>();
  for (const item of items as ProofItem[]) {
    const i = item?.index;
    if (!Number.isInteger(i) || i < 1 || i > criteria.length) {
      errors.push(`entrée hors critères : index ${JSON.stringify(i)} (la task a ${criteria.length} critère(s) Done)`);
      continue;
    }
    if (seen.has(i)) {
      errors.push(`critère ${i} : entrée en double`);
      continue;
    }
    seen.set(i, item);
  }
  criteria.forEach((texte, k) => {
    const i = k + 1;
    const item = seen.get(i);
    if (!item) {
      errors.push(`critère ${i} sans entrée : « ${texte} »`);
      return;
    }
    if (item.statut === 'prouvé') {
      if (!nonVide(item.geste)) errors.push(`critère ${i} : champ \`geste\` manquant pour un prouvé`);
      if (!nonVide(item.constat)) errors.push(`critère ${i} : champ \`constat\` manquant pour un prouvé`);
      if (item.moyen !== undefined && !MOYENS.includes(item.moyen)) {
        errors.push(`critère ${i} : champ \`moyen\` hors liste (${item.moyen}) — attendu ${MOYENS.join('|')}`);
      }
    } else if (item.statut === 'non_prouvé') {
      if (!(CATEGORIES as readonly string[]).includes(item.categorie ?? '')) {
        errors.push(`critère ${i} : champ \`categorie\` hors liste (${item.categorie ?? 'absent'}) — attendu ${CATEGORIES.join('|')}`);
      }
      if (!nonVide(item.raison)) errors.push(`critère ${i} : champ \`raison\` manquant pour un non_prouvé`);
    } else {
      errors.push(`critère ${i} : champ \`statut\` invalide (${JSON.stringify(item.statut)}) — attendu prouvé|non_prouvé`);
    }
  });
  return errors;
}

/** La ligne unique imprimée par --check. */
export function summarize(items: ProofItem[], total: number): string {
  if (total === 0) return 'preuve : sans critère Done';
  const sorted = [...items].sort((a, b) => a.index - b.index);
  const prouves = sorted.filter((it) => it.statut === 'prouvé').length;
  const non = sorted.filter((it) => it.statut === 'non_prouvé');
  let line = `preuve : ${prouves}/${total} prouvés`;
  if (non.length) {
    const cats = [...new Set(non.map((it) => it.categorie))].join(', ');
    line += ` · ${non.length} non prouvé${non.length > 1 ? 's' : ''} (${cats})`;
  }
  return line;
}

interface Args {
  task: string;
  mode: 'write' | 'check';
  tasksFile: string;
  root: string;
}

function gitRoot(): string {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  } catch {
    return process.cwd();
  }
}

export function parseArgs(argv: string[]): Args {
  const val = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
  };
  const task = val('--task');
  if (!task) throw new Error('--task <id> obligatoire');
  const write = argv.includes('--write');
  const check = argv.includes('--check');
  if (write === check) throw new Error('un mode et un seul : --write ou --check');
  const root = val('--root') ?? gitRoot();
  const tasksFile = argv.includes('--tasks-file') ? resolveTasksFile(argv) : join(root, 'TASKS.md');
  return { task, mode: write ? 'write' : 'check', tasksFile, root };
}

export function runWrite(a: Args, stdin: string): number {
  let parsed: { items?: unknown };
  try {
    parsed = JSON.parse(stdin);
  } catch {
    console.error('entrée illisible : JSON invalide sur stdin');
    return 1;
  }
  if (!Array.isArray(parsed?.items)) {
    console.error('entrée invalide : champ `items` absent ou non tableau');
    return 1;
  }
  const report: ProofReport = { taskId: a.task, createdAt: new Date().toISOString(), items: parsed.items as ProofItem[] };
  const path = reportPath(a.root, a.task);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(report, null, 2) + '\n');
  console.log(path);
  return 0;
}

export function runCheck(a: Args): number {
  if (!existsSync(a.tasksFile)) {
    console.error(`fichier de tasks introuvable : ${a.tasksFile}`);
    return 1;
  }
  const section = extractTaskSection(readFileSync(a.tasksFile, 'utf8'), a.task);
  if (section === null) {
    console.error(`task ${a.task} introuvable dans ${a.tasksFile}`);
    return 1;
  }
  const criteria = extractDoneCriteria(section);
  if (criteria.length === 0) {
    console.log(summarize([], 0));
    return 0;
  }
  const path = reportPath(a.root, a.task);
  if (!existsSync(path)) {
    console.error(`aucun rapport : ${path}`);
    return 1;
  }
  let report: unknown;
  try {
    report = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    console.error(`rapport illisible : ${path}`);
    return 1;
  }
  const errors = validateReport(report, criteria);
  if (errors.length) {
    for (const e of errors) console.error(e);
    return 1;
  }
  console.log(summarize((report as ProofReport).items, criteria.length));
  return 0;
}

function main(): number {
  let a: Args;
  try {
    a = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error((e as Error).message);
    return 1;
  }
  return a.mode === 'write' ? runWrite(a, readFileSync(0, 'utf8')) : runCheck(a);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
