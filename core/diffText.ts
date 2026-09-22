import { diffLines } from 'diff';
import { redact } from './redact.ts';

export function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function clipLine(line: string): string {
  return line.length > 240 ? `${line.slice(0, 240)}…` : line;
}

export function compactDiff(
  before: string,
  after: string,
  maxLines = 60,
): { text: string; added: number; removed: number } {
  const parts = diffLines(normalizeNewlines(before), normalizeNewlines(after));
  let added = 0;
  let removed = 0;
  const lines: string[] = [];
  for (const part of parts) {
    const split = part.value.replace(/\n$/, '').split('\n');
    const meaningful = split.filter((line, index) => line.length > 0 || index < split.length - 1);
    const rows = part.value.endsWith('\n') ? split.slice(0, -1) : split;
    const count = rows.length === 1 && rows[0] === '' ? 0 : rows.length;
    if (part.added) added += count;
    else if (part.removed) removed += count;
    else continue;
    for (const line of meaningful) {
      if (lines.length >= maxLines) break;
      lines.push(`${part.added ? '+' : '-'} ${clipLine(line)}`);
    }
  }
  if (added + removed > lines.length) lines.push('…');
  return { text: redact(lines.join('\n')), added, removed };
}
