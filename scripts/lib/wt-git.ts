/**
 * Gestes git des worktrees d'objectif : inventaire, propreté, activité, PR mergée.
 * Séparé de `shika-wt.ts` (1 fichier = 1 responsabilité) : ici on OBSERVE, là-bas on DÉCIDE.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

export function git(cwd: string, args: string[]): { ok: boolean; out: string; err: string } {
  // --no-optional-locks : `status` ne réécrit pas l'index, sinon il rajeunirait
  // l'horodatage qui mesure l'inactivité d'un worktree hérité.
  const r = spawnSync('git', ['--no-optional-locks', ...args], { cwd, encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
}

export const real = (p: string) => { try { return realpathSync(p); } catch { return p; } };

export interface Worktree { chemin: string; branche: string | null; gitdir: string | null }

/** `git worktree list --porcelain`, chemins canoniques, dépôt principal exclu. */
export function listWorktrees(main: string): Worktree[] {
  const r = git(main, ['worktree', 'list', '--porcelain']);
  const out: Worktree[] = [];
  for (const block of r.out.split(/\n\n+/)) {
    const path = /^worktree (.+)$/m.exec(block)?.[1];
    if (!path || real(path) === real(main)) continue;
    const br = /^branch refs\/heads\/(.+)$/m.exec(block)?.[1] ?? null;
    const chemin = real(path);
    const gd = existsSync(chemin) ? git(chemin, ['rev-parse', '--path-format=absolute', '--git-dir']) : null;
    out.push({ chemin, branche: br, gitdir: gd?.ok ? gd.out : null });
  }
  return out;
}

/** Préfixe des worktrees d'objectif ; tout autre dossier de `.claude/worktrees` appartient à l'app desktop. */
export const wtRoot = (main: string) => join(real(main), '.claude', 'worktrees');
export const isShika = (main: string, chemin: string) =>
  dirname(chemin) === wtRoot(main) && basename(chemin).startsWith('shika-');
export const isDesktop = (main: string, chemin: string) =>
  chemin.startsWith(wtRoot(main) + '/') && !isShika(main, chemin);

/**
 * Raison de NE PAS supprimer, `null` si propre. Propre = rien de modifié ni de
 * non suivi (hors preuves `.shikamaru/proof/`, copiées avant retrait) ET aucun
 * commit absent des remotes. `livre` = SHA livré par une PR mergée (tête de la PR,
 * ou HEAD noté par `mark --statut merged`) : un squash laisse des commits « non
 * poussés », mais seulement jusqu'à ce SHA — un commit ajouté après le merge
 * reste du travail à protéger.
 */
export function dirtyReason(chemin: string, livre: string | null): string | null {
  const st = git(chemin, ['status', '--porcelain', '--untracked-files=all']);
  if (!st.ok) return `illisible (${st.err.split('\n').pop()})`;
  const lines = st.out.split('\n').filter((l) => l && !l.startsWith('?? .shikamaru/proof/'));
  if (lines.length) return `sale (${lines.length} fichier${lines.length > 1 ? 's' : ''})`;
  const up = git(chemin, ['rev-list', '--count', 'HEAD', '--not', '--remotes']);
  const n = Number(up.out);
  if (up.ok && n === 0) return null;
  if (up.ok && livre && git(chemin, ['rev-parse', 'HEAD']).out === livre) return null;
  return `sale (${up.ok ? n : '?'} commit(s) non poussé(s))`;
}

/** Dernier signe d'activité : le plus récent de l'index du worktree et du commit HEAD. */
export function lastActivity(w: Worktree): number {
  let t = 0;
  if (w.gitdir && existsSync(join(w.gitdir, 'index'))) t = statSync(join(w.gitdir, 'index')).mtimeMs;
  const c = git(w.chemin, ['log', '-1', '--format=%ct']);
  if (c.ok && c.out) t = Math.max(t, Number(c.out) * 1000);
  return t;
}

/** Développe un glob simple (`*` / `?` dans le dernier segment) en DOSSIERS canoniques existants. */
export function expandGlob(pattern: string): string[] {
  const dir = dirname(pattern);
  const re = new RegExp('^' + basename(pattern).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => re.test(e.name) && (e.isDirectory() || (e.isSymbolicLink() && statSync(join(dir, e.name), { throwIfNoEntry: false })?.isDirectory())))
    .map((e) => real(join(dir, e.name)));
}

/**
 * PR mergée depuis `branche` — numéro et SHA de tête (couvre le squash, que
 * `git branch --merged` ne voit pas). `undefined` = gh indisponible ; `null` = aucune.
 */
export function mergedPr(main: string, branche: string): { number: number; head: string | null } | null | undefined {
  const gh = process.env.SHIKA_WT_GH || 'gh';
  const r = spawnSync(gh, ['pr', 'list', '--head', branche, '--state', 'merged', '--json', 'number,headRefOid', '--limit', '1'], { cwd: main, encoding: 'utf8' });
  if (r.error || r.status !== 0) return undefined;
  try {
    const arr = JSON.parse(r.stdout) as { number: number; headRefOid?: string }[];
    return arr[0] ? { number: arr[0].number, head: arr[0].headRefOid ?? null } : null;
  } catch {
    return undefined;
  }
}
