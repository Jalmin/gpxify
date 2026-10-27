#!/usr/bin/env npx tsx
/**
 * synthesize-learnings.ts
 *
 * Generates active_learnings.md from learnings.jsonl with temporal compression.
 * - < 7 days: full content
 * - 7-30 days: 1-2 sentence summary
 * - > 30 days: grouped by tag
 *
 * Usage: npx tsx scripts/synthesize-learnings.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface Learning {
  id: string;
  timestamp: string;
  type: 'error' | 'workaround' | 'decision' | 'pattern' | 'observation';
  source: 'runner' | 'speccer' | 'manual' | 'reflection';
  title: string;
  body: string;
  tags: string[];
  relatedTasks: string[];
}

const TYPE_EMOJI: Record<string, string> = {
  error: '🔴',
  workaround: '🟡',
  decision: '🔵',
  pattern: '🟢',
  observation: '⚪',
};

// Parse JSONL file
function parseLearnings(filePath: string): Learning[] {
  if (!existsSync(filePath)) return [];

  const content = readFileSync(filePath, 'utf-8');
  const learnings: Learning[] = [];

  for (const line of content.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    try {
      const raw = JSON.parse(line);
      // Tolerate legacy/freeform entries ({ts, context, detail, action}, etc.)
      learnings.push({
        id: raw.id ?? '',
        timestamp: raw.timestamp ?? raw.ts ?? '',
        type: raw.type ?? 'observation',
        source: raw.source ?? 'manual',
        title: raw.title ?? raw.context ?? '(untitled)',
        body: raw.body ?? raw.detail ?? '',
        tags: Array.isArray(raw.tags) ? raw.tags : [],
        relatedTasks: Array.isArray(raw.relatedTasks) ? raw.relatedTasks : [],
      });
    } catch {
      // Skip invalid lines
    }
  }

  return learnings;
}

// Summarize body to 1-2 sentences
function summarize(body: string): string {
  // Extract first sentence or key point
  const lines = body.split('\n').filter(l => l.trim());

  // Find the most important line (usually starts with decision, solution, or rule)
  for (const line of lines) {
    if (line.includes('Décision') || line.includes('Solution') || line.includes('Règle')) {
      const clean = line.replace(/^-\s*\*\*[^:]+:\*\*\s*/, '').trim();
      return clean.length > 150 ? clean.substring(0, 147) + '...' : clean;
    }
  }

  // Fallback to first line
  const firstLine = lines[0]?.replace(/^-\s*\*\*[^:]+:\*\*\s*/, '').trim() || '';
  return firstLine.length > 150 ? firstLine.substring(0, 147) + '...' : firstLine;
}

// Format date for display
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Days since a date
function daysSince(isoString: string): number {
  const date = new Date(isoString);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// Generate markdown content
function generateMarkdown(learnings: Learning[]): string {
  const now = new Date();

  // Sort by timestamp descending
  learnings.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Categorize by age
  const recent: Learning[] = [];     // < 7 days
  const thisMonth: Learning[] = [];  // 7-30 days
  const older: Learning[] = [];      // > 30 days

  for (const l of learnings) {
    const days = daysSince(l.timestamp);
    if (days < 7) recent.push(l);
    else if (days < 30) thisMonth.push(l);
    else older.push(l);
  }

  // Group older by tags
  const tagGroups: Record<string, Learning[]> = {};
  for (const l of older) {
    const primaryTag = l.tags[0] || 'other';
    if (!tagGroups[primaryTag]) tagGroups[primaryTag] = [];
    tagGroups[primaryTag].push(l);
  }

  // Build markdown
  const lines: string[] = [
    '# Active Learnings',
    '',
    `> Auto-generated from \`memory/learnings.jsonl\` by \`scripts/synthesize-learnings.ts\``,
    `> Last synthesized: ${now.toISOString()}`,
    '',
    '---',
    '',
  ];

  // Recent section (full content)
  lines.push('## Recent (Last 7 Days)', '');
  if (recent.length === 0) {
    lines.push('_No recent learnings._', '');
  } else {
    for (const l of recent) {
      lines.push(`### ${TYPE_EMOJI[l.type]} ${l.title}`, '');
      lines.push(`📅 ${formatDate(l.timestamp)} | 🏷️ ${l.tags.join(', ') || 'none'} | 📦 ${l.source}`, '');
      lines.push(l.body, '');
    }
  }

  lines.push('---', '');

  // This month section (summaries)
  lines.push('## This Month (7-30 Days)', '');
  if (thisMonth.length === 0) {
    lines.push('_No learnings from this period._', '');
  } else {
    for (const l of thisMonth) {
      lines.push(`- ${TYPE_EMOJI[l.type]} **${l.title}** (${formatDate(l.timestamp)}): ${summarize(l.body)}`);
    }
    lines.push('');
  }

  lines.push('---', '');

  // Established patterns (grouped by tag)
  lines.push('## Established Patterns (30+ Days)', '');
  if (Object.keys(tagGroups).length === 0) {
    lines.push('_No established patterns yet._', '');
  } else {
    for (const [tag, group] of Object.entries(tagGroups).sort()) {
      lines.push(`### ${tag}`, '');
      for (const l of group.slice(0, 5)) { // Max 5 per tag
        lines.push(`- ${TYPE_EMOJI[l.type]} **${l.title}**: ${summarize(l.body)}`);
      }
      if (group.length > 5) {
        lines.push(`- _...and ${group.length - 5} more_`);
      }
      lines.push('');
    }
  }

  lines.push('---', '');

  // Stats
  const byType: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  for (const l of learnings) {
    byType[l.type] = (byType[l.type] || 0) + 1;
    bySource[l.source] = (bySource[l.source] || 0) + 1;
  }

  lines.push('## Stats', '');
  lines.push(`- **Total learnings:** ${learnings.length}`);
  lines.push(`- **By type:** ${Object.entries(byType).map(([t, c]) => `${t} (${c})`).join(', ')}`);
  lines.push(`- **By source:** ${Object.entries(bySource).map(([s, c]) => `${s} (${c})`).join(', ')}`);
  lines.push('');
  lines.push('---', '');
  lines.push('_Generated by Shikamaru Memory System_', '');

  return lines.join('\n');
}

// Main
function main() {
  // ALWAYS resolve from the TARGET project's cwd, never from this module's
  // location — invoked as `npx tsx ~/Projects/shikamaru/scripts/…` from a
  // client project, import.meta.url points at the shikamaru repo and the
  // synthesis lands in the wrong repo (KONBINI 2026-07-09, T155).
  const projectRoot = process.cwd();
  const learningsPath = resolve(projectRoot, 'memory/learnings.jsonl');
  const outputPath = resolve(projectRoot, 'memory/active_learnings.md');

  if (!existsSync(learningsPath)) {
    console.log(`⏭️  ${learningsPath} not found — nothing to synthesize (exit 0).`);
    return;
  }

  console.log('📖 Reading memory/learnings.jsonl...');
  const learnings = parseLearnings(learningsPath);

  console.log(`📊 Found ${learnings.length} learnings`);

  console.log('🔄 Generating synthesis with temporal compression...');
  const markdown = generateMarkdown(learnings);

  // Check line count
  const lineCount = markdown.split('\n').length;
  console.log(`📝 Generated ${lineCount} lines`);

  if (lineCount > 200) {
    console.log(`⚠️ Warning: output exceeds 200 lines (${lineCount}), consider more aggressive compression`);
  }

  console.log('💾 Writing memory/active_learnings.md...');
  writeFileSync(outputPath, markdown);

  console.log('\n✅ Synthesis complete!');
  console.log(`   Output: ${outputPath}`);
  console.log(`   Lines: ${lineCount}`);
}

main();
