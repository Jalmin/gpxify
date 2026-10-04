/**
 * Registre des worktrees d'objectif — `<dépôt principal>/.shikamaru/objectifs.json`.
 *
 * Source unique pour `shika-wt.ts` (qui l'écrit) et `shika-update.ts` (qui le
 * lit pour ne pas propager en plein run). Trois choses vivent ici :
 *  - les chemins, résolus par `git rev-parse --git-common-dir` et JAMAIS par le
 *    cwd : depuis un worktree, le cwd désigne le worktree, pas le dépôt principal ;
 *  - le verrou unique `<git-common-dir>/shika-wt.lock`, qui couvre réservation du
 *    plafond, création et nettoyage — verrouiller le seul registre ne rendrait
 *    pas ces trois gestes atomiques (critique Codex du 04/10) ;
 *  - la vie d'un processus : pid ET heure de démarrage. Un pid seul ne prouve
 *    rien, le système le réattribue.
 */
import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export type Statut = 'preparing' | 'active' | 'prepare-failed' | 'merged' | 'unknown';
export const ACTIFS: readonly Statut[] = ['preparing', 'active'];

export interface Objectif {
  runId: string;
  chemin: string;
  branche: string;
  base: string;
  pid: number | null;
  startedAt: string | null;
  statut: Statut;
  createdAt: string;
  lastSeenAt: string;
  /** HEAD du worktree au `mark --statut merged` : seuls les commits jusqu'à lui sont livrés. */
  mergedHead?: string | null;
}

export interface Registre { version: 1; objectifs: Objectif[] }

export interface Depot { common: string; main: string }

/** Résout le dépôt principal et son git-common-dir depuis n'importe quel worktree. */
export function resolveDepot(cwd: string): Depot {
  const r = spawnSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`pas un dépôt git : ${cwd}`);
  const common = r.stdout.trim();
  return { common, main: dirname(common) };
}

export const registryPath = (d: Depot) => join(d.main, '.shikamaru', 'objectifs.json');

/** Lit le registre. Absent → vide ; illisible → `null` (l'appelant le reconstruit). */
export function readRegistre(path: string): Registre | null {
  if (!existsSync(path)) return { version: 1, objectifs: [] };
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    if (!raw || !Array.isArray(raw.objectifs)) return null;
    return { version: 1, objectifs: raw.objectifs as Objectif[] };
  } catch {
    return null;
  }
}

/** Écriture atomique (fichier temporaire + rename) : un crash ne laisse pas un registre tronqué. */
export function writeRegistre(path: string, reg: Registre): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(reg, null, 2) + '\n');
  renameSync(tmp, path);
}

/** Heure de démarrage d'un processus (`ps -o lstart`), `null` s'il n'existe pas. */
export function processStart(pid: number): string | null {
  if (!Number.isInteger(pid) || pid <= 0) return null;
  const r = spawnSync('ps', ['-o', 'lstart=', '-p', String(pid)], { encoding: 'utf8' });
  const s = r.status === 0 ? r.stdout.trim() : '';
  return s || null;
}

/** Vivant = le pid existe ET a démarré à l'heure enregistrée (sinon pid réattribué). */
export function isAlive(pid: number | null, startedAt: string | null): boolean {
  if (pid == null || !startedAt) return false;
  return processStart(pid) === startedAt;
}

/** Objectif actif dont la session tourne encore — la règle que lit `shika-update`. */
export const isRunning = (o: Objectif) => ACTIFS.includes(o.statut) && isAlive(o.pid, o.startedAt);

const readOr = (p: string): string | null => { try { return readFileSync(p, 'utf8'); } catch { return null; } };

/** Verrou périmé : détenteur mort, ou contenu vide/illisible depuis plus de 10 s (crash à l'écriture). */
function isStale(path: string, raw: string): boolean {
  try {
    const h = JSON.parse(raw) as { pid?: number; startedAt?: string | null };
    if (h.pid) return !isAlive(h.pid, h.startedAt ?? null);
  } catch { /* illisible */ }
  try { return Date.now() - statSync(path).mtimeMs > 10_000; } catch { return false; }
}

/**
 * Vol d'un verrou périmé, sérialisé par un second verrou `<lock>.steal` : sans lui,
 * deux voleurs lisant le même verrou mort supprimeraient tour à tour, le second
 * effaçant le verrou NEUF du premier (review T235 P1). Sous `.steal`, on relit et
 * on ne supprime que si le contenu est toujours celui jugé périmé.
 */
function stealIfUnchanged(path: string, raw: string): boolean {
  const steal = `${path}.steal`;
  try {
    closeSync(openSync(steal, 'wx'));
  } catch {
    // `.steal` n'est tenu que le temps d'une relecture : s'il traîne, son détenteur a
    // crashé dans cette fenêtre. Le reprendre automatiquement rouvrirait la même
    // course (review T235, confirmation) — on s'arrête et on le dit.
    let vieux = false;
    try { vieux = Date.now() - statSync(steal).mtimeMs > 10_000; } catch { /* retiré entre-temps */ }
    if (vieux) throw new Error(`${steal} abandonné par un processus mort — vérifier qu'aucun shika-wt ne tourne, puis le supprimer à la main`);
    return false;
  }
  try {
    if (readOr(path) === raw) unlinkSync(path);
    return true;
  } finally {
    try { unlinkSync(steal); } catch { /* déjà retiré */ }
  }
}

const sleep = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/**
 * Verrou exclusif par création `wx`. Un verrou dont le détenteur est mort
 * (pid + heure de démarrage) est volé ; sinon on attend jusqu'à `timeoutMs`.
 */
export function withLock<T>(d: Depot, fn: () => T, timeoutMs = 120_000): T {
  const path = join(d.common, 'shika-wt.lock');
  const me = JSON.stringify({ pid: process.pid, startedAt: processStart(process.pid) });
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const fd = openSync(path, 'wx');
      writeFileSync(fd, me);
      closeSync(fd);
      break;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
      const raw = readOr(path);
      if (raw !== null && isStale(path, raw) && stealIfUnchanged(path, raw)) continue;
      if (Date.now() > deadline) throw new Error(`verrou ${path} tenu (${raw ?? "?"})`);
      sleep(100);
    }
  }
  try {
    return fn();
  } finally {
    try { unlinkSync(path); } catch { /* déjà retiré */ }
  }
}
