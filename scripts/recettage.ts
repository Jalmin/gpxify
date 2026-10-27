#!/usr/bin/env npx tsx
/**
 * Shikamaru Recettage - Automated UI Testing Script
 *
 * Executes Playwright-based test scenarios defined in TASKS.md
 * and generates a visual report with screenshots.
 *
 * Usage: npx tsx scripts/recettage.ts --task T78 [--tasks-file path | path] [--parse-seul]
 *
 * ## Pourquoi ce gate n'avait jamais rendu de verdict (T249)
 *
 * Mesuré le 2026-09-02 : `.shikamaru/recettage/` n'existait même pas, alors que
 * 10 tasks de production-tool portent un champ `**Recettage:**`. TROIS défauts
 * indépendants s'empilaient, et le script mourait sur le dernier avant d'avoir
 * pu buter sur les deux premiers :
 *
 *  1. `parseTasksFile` codait en dur `cwd/TASKS.md` — inexistant en monolithe
 *     modulaire, où les tasks vivent dans `subprojects/<module>/TASKS.md`.
 *  2. Sa regex maison cherchait `### Task 213:` quand les cinq TASKS.md du dépôt
 *     écrivent `### T213:` — zéro occurrence du premier dialecte, 24 du second
 *     sur le seul production-tool. Le gate n'aurait trouvé AUCUNE task, même
 *     dans un dépôt à plat.
 *  3. `import { chromium } from 'playwright'` en tête de fichier, alors que
 *     `playwright` n'est ni à la racine (il n'y a pas de package.json racine, et
 *     il ne doit pas y en avoir) ni dans `app/node_modules`.
 *
 * Le dialecte est désormais lu par `extractTaskSection`/`resolveTasksFile` du
 * module partagé — la MÊME définition que `smoke.ts` et `archive-done-tasks.ts`.
 * Trois copies avaient déjà divergé par le passé ; on n'en réintroduit pas une
 * quatrième ici.
 *
 * ## Ce que « rendre un verdict » veut dire
 *
 * Un gate qui ne peut pas MESURER sort en ≠ 0 et le dit. Il ne « skippe » pas.
 * Les deux sont distingués partout dans ce fichier :
 *   - skip (exit 0)   : la task existe, elle ne demande pas de recettage.
 *   - erreur (exit 1) : fichier introuvable, task inconnue, Playwright absent,
 *                       navigateur absent. Chacune porte son propre message.
 */

import { createRequire } from 'node:module';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { extractTaskSection, resolveTasksFile } from './lib/task-dialect.js';

/**
 * Surface de Playwright réellement employée ici, décrite en structurel.
 *
 * On ne l'importe PAS en `import type { Page } from 'playwright'` : le paquet
 * vit dans `subprojects/<module>/app/node_modules`, hors de portée d'une
 * résolution depuis la racine du dépôt. Un `import type` est pourtant effacé à
 * l'exécution — il ne coûterait rien à `tsx`, mais il ferait échouer tout
 * typecheck lancé depuis la racine, pour un type qu'on peut décrire en dix
 * lignes. Le chargement de VALEUR, lui, est paresseux et ancré sur le module.
 */
type PageLike = {
  goto(url: string, opts?: object): Promise<unknown>;
  screenshot(opts: { path: string; fullPage?: boolean }): Promise<unknown>;
  click(selector: string, opts?: object): Promise<unknown>;
  fill(selector: string, value: string, opts?: object): Promise<unknown>;
  waitForSelector(selector: string, opts?: object): Promise<unknown>;
  evaluate(fn: () => void): Promise<unknown>;
  locator(selector: string): { scrollIntoViewIfNeeded(): Promise<unknown> };
};
type BrowserLike = {
  newContext(opts?: object): Promise<{ newPage(): Promise<PageLike> }>;
  close(): Promise<unknown>;
};
type PlaywrightLike = { chromium: { launch(opts?: object): Promise<BrowserLike> } };

interface RecettageStep {
  action: 'goto' | 'screenshot' | 'click' | 'fill' | 'wait' | 'scroll';
  target?: string;
  value?: string;
}

interface RecettageConfig {
  base_url: string;
  start_cmd?: string;
  steps: RecettageStep[];
}

interface StepResult {
  step: RecettageStep;
  success: boolean;
  error?: string;
  screenshot?: string;
  duration: number;
}

/** Verdict écrit dans `.shikamaru/recettage/{id}/report.json`. */
type Verdict = 'PASS' | 'FAIL' | 'skipped' | 'error' | 'parsed';

/**
 * Issue du parsing, TROIS branches et pas deux.
 *
 * L'ancien code rendait `null` aussi bien pour « cette task ne demande pas de
 * recettage » que pour « cette task n'existe pas », et `main` sortait en 1 dans
 * les deux cas. Un backlog où 90 % des tasks n'ont pas de champ `**Recettage:**`
 * rendait donc le gate rouge partout — c'est-à-dire inutilisable.
 */
type Resolution =
  | { genre: 'config'; config: RecettageConfig }
  | { genre: 'skip'; message: string }
  | { genre: 'erreur'; message: string };

// Parse command line arguments
function parseArgs(): { taskId: string; tasksFile: string; parseSeul: boolean } {
  const args = process.argv.slice(2);
  const taskIndex = args.indexOf('--task');

  if (taskIndex === -1 || !args[taskIndex + 1]) {
    console.error(
      'Usage: npx tsx scripts/recettage.ts --task T78 [--tasks-file path | path] [--parse-seul]',
    );
    process.exit(1);
  }

  // Même contrat que smoke.ts:221 — `--tasks-file path` OU un positionnel.
  const tasksFile = resolveTasksFile(args, path.join(process.cwd(), 'TASKS.md'));
  return { taskId: args[taskIndex + 1], tasksFile, parseSeul: args.includes('--parse-seul') };
}

// Parse TASKS.md to extract recettage config for a task
function parseTasksFile(taskId: string, tasksFile: string): Resolution {
  if (!fs.existsSync(tasksFile)) {
    // Le chemin SONDÉ est nommé. L'ancien message (« TASKS.md not found ») ne
    // disait pas lequel : c'est le repli silencieux sur `cwd/TASKS.md` qui a
    // masqué ce défaut depuis la création du dépôt.
    return {
      genre: 'erreur',
      message:
        `TASKS.md introuvable : ${path.resolve(tasksFile)}\n` +
        '   En monolithe modulaire, passer --tasks-file subprojects/<module>/TASKS.md.',
    };
  }

  const content = fs.readFileSync(tasksFile, 'utf-8');

  // Dialecte PARTAGÉ (scripts/lib/task-dialect.ts), jamais une regex recopiée :
  // c'est la Boundary de la task. Cette fonction tolère le legacy `### Task 72:`
  // en LECTURE — tolérance délibérée, mesurée sur le corpus réel et documentée
  // dans task-dialect.ts. La refuser ici fabriquerait un SECOND dialecte, celui
  // que ce correctif existe précisément pour supprimer.
  const taskContent = extractTaskSection(content, taskId);

  if (taskContent === null) {
    return { genre: 'erreur', message: `Task ${taskId} not found in ${tasksFile}` };
  }

  // Le CHAMP d'abord, son contenu ensuite — les deux ne se confondent pas.
  //
  // Ancré en début de ligne, avec le marqueur de liste optionnel du dialecte :
  // une MENTION en prose (`… mentionne \`**Recettage:**\` dans cette phrase`)
  // n'est pas un champ, et ne doit rien déclencher.
  const champ = taskContent.match(/^(?:[-*]\s+)?\*\*Recettage:\*\*(.*)$/m);

  if (!champ) {
    // Champ réellement ABSENT : la task ne demande pas de recettage. C'est le
    // cas de 9 tasks sur 10, et le seul qui mérite un exit 0 silencieux.
    return { genre: 'skip', message: `No recettage config found for ${taskId}` };
  }

  const enLigne = champ[1].trim();
  if (enLigne) {
    // Champ PRÉSENT, non vide, mais écrit sur la même ligne : de la prose, pas
    // une config. C'est la forme des DIX champs `**Recettage:**` du backlog
    // (`**Recettage:** Playwright — le parcours du premier critère de Done.`).
    //
    // Le rendre en « No recettage config found » serait un MENSONGE — la task en
    // demande un — et surtout un exit 0 : une mesure jamais faite passerait pour
    // un skip légitime, et le critère de Done d'une task pourrait être coché sur
    // un rapport que personne n'a joué. La Boundary de T249 tranche : « un gate
    // qui ne peut pas mesurer sort ≠ 0 et le dit, il ne skippe pas ».
    return {
      genre: 'erreur',
      message:
        `Champ **Recettage:** NON EXÉCUTABLE pour ${taskId} — il est écrit en prose sur la même ligne :\n` +
        `   « ${enLigne.slice(0, 120)}${enLigne.length > 120 ? '…' : ''} »\n` +
        "   Cette task DEMANDE un recettage : la sortir en « skip » ferait passer une mesure jamais faite pour un succès.\n" +
        '   Forme attendue — le champ seul sur sa ligne, la config en dessous :\n' +
        '     **Recettage:**\n' +
        '     base_url: http://127.0.0.1:3000\n' +
        '     steps:\n' +
        '       - goto: /projets\n' +
        '       - screenshot: fiche',
    };
  }

  // Extract recettage block
  const recettageMatch = taskContent.match(/\*\*Recettage:\*\*\s*\n([\s\S]*?)(?=\n\*\*|\n---|\n###|$)/);

  if (!recettageMatch) {
    return {
      genre: 'skip',
      message: `Recettage config vide pour ${taskId} — le champ existe mais ne déclare aucune ligne.`,
    };
  }

  // Parse YAML-like config
  const configText = recettageMatch[1];
  const config: RecettageConfig = {
    base_url: '',
    steps: []
  };

  // Extract base_url
  const baseUrlMatch = configText.match(/base_url:\s*(.+)/);
  if (baseUrlMatch) {
    config.base_url = baseUrlMatch[1].trim();
  }

  // Extract start_cmd
  const startCmdMatch = configText.match(/start_cmd:\s*(.+)/);
  if (startCmdMatch) {
    config.start_cmd = startCmdMatch[1].trim();
  }

  // Extract steps
  const stepsMatch = configText.match(/steps:\s*\n([\s\S]*)/);
  if (stepsMatch) {
    const stepsText = stepsMatch[1];
    const stepLines = stepsText.split('\n').filter(line => line.trim().startsWith('-'));

    for (const line of stepLines) {
      const stepText = line.replace(/^\s*-\s*/, '').trim();

      // Parse step format: "action: target" or "action: target >> value"
      const colonIndex = stepText.indexOf(':');
      if (colonIndex === -1) continue;

      const action = stepText.substring(0, colonIndex).trim() as RecettageStep['action'];
      const rest = stepText.substring(colonIndex + 1).trim();

      const step: RecettageStep = { action };

      // Check for fill action with value (format: "selector >> value")
      if (rest.includes('>>')) {
        const [target, value] = rest.split('>>').map(s => s.trim());
        step.target = target;
        step.value = value;
      } else {
        step.target = rest;
      }

      config.steps.push(step);
    }
  }

  // Champ PRÉSENT mais sans rien d'exploitable — miroir du cas T904 de
  // `smoke-parse.md`. C'est un skip PROPRE avec son motif écrit, pas une config
  // vide passée à Playwright : lancer un navigateur pour zéro étape rendrait un
  // « 0/0 passed » que personne ne saurait relire.
  if (!config.base_url && config.steps.length === 0) {
    return {
      genre: 'skip',
      message:
        `Recettage config vide pour ${taskId} — le champ existe mais ne déclare ni base_url ni steps.`,
    };
  }

  return { genre: 'config', config };
}

/**
 * Charge Playwright PARESSEUSEMENT, ancré sur le module qui porte les tasks.
 *
 * Deux propriétés à tenir, et la première est la plus facile à perdre : une task
 * sans champ `**Recettage:**` doit sortir en skip **sans jamais charger
 * Playwright**. C'est pour ça que cette fonction n'est appelée qu'au moment où
 * un scénario doit réellement tourner, et jamais à l'import du module — l'import
 * statique d'origine faisait crasher le gate sur TOUTES les tasks, y compris
 * celles qui n'avaient rien à recetter.
 *
 * La trace « chargé depuis » est le témoin de cette propriété : c'est le SEUL
 * endroit du fichier qui touche `playwright`, et il annonce toujours. Le harnais
 * peut donc asserter l'ABSENCE de chargement, pas seulement la sortie.
 *
 * L'ancrage se déduit du TASKS.md résolu : `<module>/app/package.json`, repli
 * `<module>/package.json`. Un module sans front (reporting, en Python) n'a pas à
 * porter Playwright — il obtient une erreur NOMMÉE citant les deux sondes, pas
 * un skip silencieux qui se lirait comme un succès.
 */
function chargerPlaywright(tasksFile: string): PlaywrightLike {
  const moduleDir = path.dirname(path.resolve(tasksFile));
  const ancres = [
    path.join(moduleDir, 'app', 'package.json'),
    path.join(moduleDir, 'package.json'),
  ];
  const sondes: string[] = [];
  let derniereCause = '';

  for (const ancre of ancres) {
    sondes.push(ancre);
    if (!fs.existsSync(ancre)) continue;
    try {
      const pw = createRequire(ancre)('playwright') as PlaywrightLike;
      console.log(`🎭 Playwright chargé depuis ${ancre}`);
      return pw;
    } catch (error) {
      derniereCause = error instanceof Error ? error.message : String(error);
    }
  }

  // Repli du Fallback de la task : chemin EXPLICITE, pour le cas où un hoisting
  // npm inattendu (ou un store pnpm) mettrait le paquet hors de portée de la
  // résolution ancrée sur le manifeste.
  const cheminExplicite = path.join(moduleDir, 'app', 'node_modules', 'playwright', 'index.js');
  sondes.push(cheminExplicite);
  if (fs.existsSync(cheminExplicite)) {
    try {
      const pw = createRequire(cheminExplicite)(cheminExplicite) as PlaywrightLike;
      console.log(`🎭 Playwright chargé depuis ${cheminExplicite}`);
      return pw;
    } catch (error) {
      derniereCause = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(
    `Playwright introuvable depuis le module qui porte ${tasksFile}.\n` +
      sondes.map((s) => `   sondé : ${s}`).join('\n') +
      (derniereCause ? `\n   dernière cause : ${derniereCause}` : '') +
      `\n   Remède : npm i -D playwright --prefix ${path.join(moduleDir, 'app')}`,
  );
}

/**
 * Le paquet est là, mais aucun navigateur n'a été téléchargé.
 *
 * Distinct de « module manquant » à dessein : les deux remèdes ne sont pas les
 * mêmes (`npm i -D playwright` d'un côté, `npx playwright install` de l'autre),
 * et confondre les deux envoie chercher la panne au mauvais endroit.
 */
function estNavigateurManquant(message: string): boolean {
  return /Executable doesn't exist|please run the following command to download new browsers|browserType\.launch: .*install/i.test(
    message,
  );
}

/** Écrit le verdict, quel qu'il soit — y compris skip et erreur. */
function ecrireRapport(
  outputDir: string,
  taskId: string,
  verdict: Verdict,
  message: string,
  extra: Record<string, unknown> = {},
): void {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, 'report.json'),
    JSON.stringify({ taskId, verdict, message, ...extra }, null, 2),
  );
}

// Start the dev server if needed
async function startDevServer(cmd: string): Promise<ChildProcess> {
  console.log(`🚀 Starting dev server: ${cmd}`);

  // Validate command - only allow safe npm/pnpm/yarn commands
  const allowedPrefixes = ['npm ', 'pnpm ', 'yarn ', 'npx '];
  const isSafeCommand = allowedPrefixes.some(prefix => cmd.startsWith(prefix));

  if (!isSafeCommand) {
    throw new Error(`Unsafe start_cmd: "${cmd}". Only npm/pnpm/yarn/npx commands are allowed.`);
  }

  // Use shell: false with explicit command parsing for safety
  const child = spawn('sh', ['-c', cmd], {
    stdio: 'pipe',
    detached: true,
    env: { ...process.env }
  });

  // Wait for server to be ready (configurable via env, default 8 seconds)
  const waitMs = parseInt(process.env.RECETTAGE_SERVER_WAIT_MS || '8000', 10);
  console.log(`   Waiting ${waitMs}ms for server to start...`);
  await new Promise(resolve => setTimeout(resolve, waitMs));

  return child;
}

// Execute a single step
async function executeStep(page: PageLike, step: RecettageStep, baseUrl: string, screenshotDir: string, stepIndex: number): Promise<StepResult> {
  const startTime = Date.now();
  const result: StepResult = {
    step,
    success: false,
    duration: 0
  };

  try {
    switch (step.action) {
      case 'goto':
        const url = step.target?.startsWith('http') ? step.target : `${baseUrl}${step.target}`;
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        result.success = true;
        break;

      case 'screenshot':
        const screenshotName = step.target || `step-${stepIndex}`;
        const screenshotPath = path.join(screenshotDir, `${String(stepIndex).padStart(2, '0')}-${screenshotName}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        result.screenshot = screenshotPath;
        result.success = true;
        break;

      case 'click':
        if (!step.target) throw new Error('Click requires a target selector');
        await page.click(step.target, { timeout: 10000 });
        result.success = true;
        break;

      case 'fill':
        if (!step.target || !step.value) throw new Error('Fill requires target and value');
        await page.fill(step.target, step.value, { timeout: 10000 });
        result.success = true;
        break;

      case 'wait':
        if (!step.target) throw new Error('Wait requires a target');
        // Check if it's a duration (e.g., "500ms") or a selector
        const durationMatch = step.target.match(/^(\d+)(ms|s)?$/);
        if (durationMatch) {
          const ms = durationMatch[2] === 's'
            ? parseInt(durationMatch[1]) * 1000
            : parseInt(durationMatch[1]);
          await new Promise(resolve => setTimeout(resolve, ms));
        } else {
          await page.waitForSelector(step.target, { timeout: 30000 });
        }
        result.success = true;
        break;

      case 'scroll':
        if (!step.target) throw new Error('Scroll requires a target');
        if (step.target === 'top') {
          await page.evaluate(() => window.scrollTo(0, 0));
        } else if (step.target === 'bottom') {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        } else {
          await page.locator(step.target).scrollIntoViewIfNeeded();
        }
        result.success = true;
        break;

      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error.message : String(error);
  }

  result.duration = Date.now() - startTime;
  return result;
}

// Generate markdown report
function generateReport(taskId: string, results: StepResult[], outputDir: string): void {
  const reportPath = path.join(outputDir, 'report.md');
  const timestamp = new Date().toISOString();

  let report = `# Recettage Report: ${taskId}\n\n`;
  report += `**Generated:** ${timestamp}\n`;
  report += `**Total Steps:** ${results.length}\n`;
  report += `**Passed:** ${results.filter(r => r.success).length}\n`;
  report += `**Failed:** ${results.filter(r => !r.success).length}\n\n`;
  report += `---\n\n`;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const icon = r.success ? '✓' : '✗';
    const status = r.success ? 'PASS' : 'FAIL';

    report += `## Step ${i + 1}: ${r.step.action} ${icon}\n\n`;
    report += `- **Action:** \`${r.step.action}\`\n`;
    if (r.step.target) report += `- **Target:** \`${r.step.target}\`\n`;
    if (r.step.value) report += `- **Value:** \`${r.step.value}\`\n`;
    report += `- **Status:** ${status}\n`;
    report += `- **Duration:** ${r.duration}ms\n`;

    if (r.error) {
      report += `- **Error:** ${r.error}\n`;
    }

    if (r.screenshot) {
      const relativePath = path.basename(r.screenshot);
      report += `\n![${r.step.target || 'screenshot'}](./${relativePath})\n`;
    }

    report += `\n`;
  }

  fs.writeFileSync(reportPath, report);
  console.log(`📄 Report generated: ${reportPath}`);
}

// Main execution
async function main(): Promise<void> {
  const { taskId, tasksFile, parseSeul } = parseArgs();

  console.log(`\n🎯 Recettage for ${taskId}`);
  console.log('━'.repeat(40));

  // Le répertoire de sortie est connu AVANT le parsing : un verdict s'écrit même
  // quand il n'y a rien à jouer. `.shikamaru/recettage/` est resté vide depuis la
  // création du dépôt précisément parce que seul un scénario exécuté produisait
  // une trace — un gate qui ne laisse rien derrière lui quand il s'abstient est
  // indistinguable d'un gate qui n'a pas tourné.
  const outputDir = path.join(process.cwd(), '.shikamaru', 'recettage', taskId);

  // Parse config
  const resolution = parseTasksFile(taskId, tasksFile);

  if (resolution.genre === 'erreur') {
    console.error(`❌ ${resolution.message}`);
    ecrireRapport(outputDir, taskId, 'error', resolution.message);
    process.exit(1);
  }

  if (resolution.genre === 'skip') {
    // Sortie sur STDOUT et exit 0 : cette task existe, elle ne demande
    // simplement pas de recettage. C'est le cas de 9 tasks sur 10.
    console.log(resolution.message);
    ecrireRapport(outputDir, taskId, 'skipped', resolution.message);
    process.exit(0);
  }

  const { config } = resolution;

  if (!config.base_url) {
    const message = `base_url manquant dans le champ **Recettage:** de ${taskId}`;
    console.error(`❌ ${message}`);
    ecrireRapport(outputDir, taskId, 'error', message);
    process.exit(1);
  }

  if (config.steps.length === 0) {
    const message = `aucune étape déclarée dans le champ **Recettage:** de ${taskId}`;
    console.error(`❌ ${message}`);
    ecrireRapport(outputDir, taskId, 'error', message);
    process.exit(1);
  }

  console.log(`📍 Base URL: ${config.base_url}`);
  console.log(`📋 Steps: ${config.steps.length}`);

  // `--parse-seul` s'arrête ici, AVANT le chargement de Playwright et avant tout
  // navigateur. C'est ce qui rend le harnais de parsing jouable partout — sur un
  // poste sans navigateur téléchargé comme en CI — sans jamais confondre « la
  // config a été lue » avec « le scénario est passé » : le verdict s'appelle
  // `parsed`, il ne réutilise pas `PASS`.
  if (parseSeul) {
    console.log('🧪 --parse-seul : la config est lue, aucun navigateur ne sera lancé.');
    ecrireRapport(outputDir, taskId, 'parsed', `config lue pour ${taskId}`, {
      base_url: config.base_url,
      start_cmd: config.start_cmd ?? null,
      steps: config.steps,
    });
    process.exit(0);
  }

  // Playwright n'est chargé qu'ICI — une fois qu'un scénario est certain de
  // devoir tourner. Toutes les sorties ci-dessus s'en passent.
  const playwright: PlaywrightLike = (() => {
    try {
      return chargerPlaywright(tasksFile);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ ${message}`);
      ecrireRapport(outputDir, taskId, 'error', message);
      process.exit(1);
    }
  })();

  fs.mkdirSync(outputDir, { recursive: true });

  // Start dev server if needed
  let serverProcess: ChildProcess | null = null;
  if (config.start_cmd) {
    try {
      serverProcess = await startDevServer(config.start_cmd);
    } catch (error) {
      console.error(`❌ Failed to start dev server: ${error}`);
      process.exit(1);
    }
  }

  // Launch browser
  let browser: BrowserLike | null = null;
  const results: StepResult[] = [];
  /**
   * Panne qui a INTERROMPU le run du navigateur.
   *
   * Tant qu'elle est posée, aucun verdict PASS/FAIL ne peut être écrit : un
   * `results` vide rend `failed === 0`, donc PASS — un scénario que personne
   * n'a joué serait certifié vert. C'est le mode de panne que ce gate existe
   * pour supprimer, atteint par l'autre bout.
   */
  let echecNavigateur: string | null = null;

  try {
    try {
      browser = await playwright.chromium.launch({ headless: true });
    } catch (error) {
      // Le paquet est là, le NAVIGATEUR ne l'est pas : deux pannes distinctes,
      // deux remèdes. Les confondre envoie réinstaller un paquet déjà présent.
      const brut = error instanceof Error ? error.message : String(error);
      if (estNavigateurManquant(brut)) {
        // Le remède est donné sous une forme EXÉCUTABLE. `npx playwright
        // install chromium --prefix <app>` ne marche pas : `--prefix` est une
        // option de npm/npx, et Playwright la reçoit puis la refuse. On lance
        // donc la commande DEPUIS le répertoire de l'app.
        const appDir = path.join(path.dirname(path.resolve(tasksFile)), 'app');
        echecNavigateur =
          'Playwright est installé mais son navigateur Chromium est absent.\n' +
          `   Remède : (cd ${appDir} && npx playwright install chromium)\n` +
          `   (message d'origine : ${brut.split('\n')[0]})`;
      }
      // On NE sort PAS ici : le serveur de dev a peut-être déjà été démarré, et
      // un `process.exit` à cet endroit sauterait son arrêt — le port resterait
      // occupé par un processus orphelin, et le run suivant échouerait pour une
      // raison sans rapport. La sortie se fait après le bloc de nettoyage.
      throw error;
    }
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    // Execute steps
    for (let i = 0; i < config.steps.length; i++) {
      const step = config.steps[i];
      console.log(`\n⏳ Step ${i + 1}/${config.steps.length}: ${step.action} ${step.target || ''}`);

      const result = await executeStep(page, step, config.base_url, outputDir, i + 1);
      results.push(result);

      if (result.success) {
        console.log(`   ✅ OK (${result.duration}ms)`);
      } else {
        console.log(`   ❌ FAIL: ${result.error}`);
      }
    }

    await browser.close();
  } catch (error) {
    // `chromium.launch` inconnu, `newContext`/`newPage` en échec, ou une panne
    // en cours de scénario : dans tous les cas le run est INTERROMPU. La cause
    // est retenue — sans elle, la suite écrirait PASS sur un `results` vide.
    echecNavigateur = echecNavigateur ?? (error instanceof Error ? error.message : String(error));
    console.error(`❌ Browser error: ${echecNavigateur}`);
    if (browser) await browser.close().catch(() => undefined);
  }

  // Kill dev server
  if (serverProcess) {
    console.log('\n🛑 Stopping dev server...');
    try {
      if (serverProcess.pid) {
        // Kill the process group (negative pid)
        process.kill(-serverProcess.pid, 'SIGTERM');
      } else {
        serverProcess.kill('SIGTERM');
      }
    } catch (err) {
      console.warn(`   Warning: Could not kill server cleanly: ${err}`);
      try {
        serverProcess.kill('SIGKILL');
      } catch {
        // Best effort cleanup
      }
    }
  }

  // Generate report
  generateReport(taskId, results, outputDir);

  // Le run interrompu se conclut ICI, APRÈS l'arrêt du serveur de dev et après
  // la trace lisible — mais AVANT tout calcul de verdict. `error` dit « on n'a
  // pas pu mesurer » ; il ne se confond ni avec FAIL (une mesure qui a conclu
  // à l'échec) ni, surtout, avec PASS.
  if (echecNavigateur) {
    ecrireRapport(outputDir, taskId, 'error', echecNavigateur, {
      etapesJouees: results.length,
      etapesDeclarees: config.steps.length,
    });
    console.error(
      `\n❌ Scénario INTERROMPU — ${results.length}/${config.steps.length} étape(s) jouée(s), aucun verdict.`,
    );
    process.exit(1);
  }

  // Summary
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n' + '━'.repeat(40));
  console.log(`📊 Results: ${passed}/${results.length} passed`);

  // Le rapport lisible (report.md, avec ses captures) ET le verdict machine
  // (report.json) — le second est ce qu'un harnais ou une CI peut asserter.
  const verdict: Verdict = failed > 0 ? 'FAIL' : 'PASS';
  ecrireRapport(outputDir, taskId, verdict, `${passed}/${results.length} étape(s) passée(s)`, {
    steps: results.map((r) => ({
      action: r.step.action,
      target: r.step.target ?? null,
      success: r.success,
      error: r.error ?? null,
      duration: r.duration,
    })),
  });

  if (failed > 0) {
    console.log(`❌ ${failed} step(s) failed`);
    process.exit(1);
  } else {
    console.log('✅ All steps passed');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
