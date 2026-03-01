import { formatDuration, formatTime } from './day.ts';
import { redact } from './redact.ts';
import type { Overview } from './types.ts';

export const SUMMARY_INSTRUCTIONS = [
  'You are Timebot, writing a private daily journal from computer activity captured on the user\'s own machine.',
  'Summarize what they actually did. Name projects, files, and sites when the log supports it.',
  'Do not invent meetings, people, or tasks that are not in the log.',
  'Write two short paragraphs, then a "Done" list of 3 to 6 bullets.',
  'If the log is thin, say so in one sentence.',
  'Plain prose, no preamble.',
].join(' ');

export function buildSummaryPrompt(overview: Overview): string {
  const lines: string[] = [`Day: ${overview.day}`, '', 'Foreground time blocks:'];
  const blocks = overview.blocks.slice(0, 60);
  if (blocks.length === 0) lines.push('- none');
  for (const block of blocks) {
    const where = block.domain ? ` · ${block.domain}` : '';
    lines.push(
      `- ${formatTime(block.start)}–${formatTime(block.end)} (${formatDuration(block.end - block.start)}) ${block.app}${where} — ${block.title}`,
    );
  }
  lines.push('', 'Websites:');
  const sites = overview.sites.slice(0, 40);
  if (sites.length === 0) lines.push('- none');
  for (const site of sites) {
    const open = site.open ? ', tab open' : '';
    lines.push(`- ${site.domain} (${formatDuration(site.activeMs)} active${open}) ${site.titles.slice(0, 3).join(' | ')}`);
  }
  lines.push('', 'Files saved:');
  const files = overview.files.slice(0, 25);
  if (files.length === 0) lines.push('- none');
  for (const file of files) {
    lines.push(`- ${formatTime(file.ts)} ${file.change} ${file.displayPath} +${file.added} -${file.removed}${file.note ? ` (${file.note})` : ''}`);
    if (file.diff) lines.push(file.diff.slice(0, 700));
  }
  let text = lines.join('\n');
  if (text.length > 24_000) text = `${text.slice(0, 24_000)}\n…`;
  return redact(text);
}
