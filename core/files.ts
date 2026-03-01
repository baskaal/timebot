import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { compactDiff, normalizeNewlines } from './diffText.ts';
import { redact } from './redact.ts';
import type { FileChange, FileEvent } from './types.ts';

const TEXT_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.mdx',
  '.css', '.scss', '.sass', '.less', '.html', '.htm', '.vue', '.svelte', '.astro',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.kts', '.swift', '.c', '.h', '.cpp',
  '.hpp', '.cc', '.cs', '.php', '.sh', '.zsh', '.bash', '.yml', '.yaml', '.toml',
  '.ini', '.txt', '.csv', '.sql', '.xml', '.graphql', '.gql', '.lua', '.ex', '.exs',
  '.hs', '.ml', '.prisma', '.tf', '.mod', '.sum', '.gradle', '.properties', '.envrc',
]);

const TEXT_NAMES = new Set([
  'makefile', 'dockerfile', 'license', 'readme', 'gemfile', 'procfile', 'rakefile',
]);

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'dist-electron', 'dist-tests', 'release', '.next',
  '.turbo', '.parcel-cache', 'coverage', 'vendor', '.cache', '__pycache__', '.venv',
  'venv', 'target', 'Pods', 'DerivedData', '.Trash',
]);

export function isSecretPath(filePath: string): boolean {
  const base = path.basename(filePath).toLowerCase();
  if (base === '.env' || base === 'env' || base.startsWith('.env.') || base.endsWith('.env')) return true;
  if (/\.(pem|key|p12|pfx|kdbx)$/.test(base)) return true;
  if (base.includes('id_rsa') || base.includes('id_ed25519') || base.includes('id_ecdsa')) return true;
  if (['credentials.json', 'secrets.json', 'service-account.json', '.npmrc', '.netrc'].includes(base)) return true;
  if (base.endsWith('.secret') || base.endsWith('.secrets')) return true;
  return false;
}

export function shouldIgnoreWatchPath(filePath: string, home?: string): boolean {
  if (home) {
    const library = path.join(home, 'Library');
    if (filePath === library || filePath.startsWith(library + path.sep)) return true;
    const appData = path.join(home, 'AppData');
    if (filePath.toLowerCase().startsWith(appData.toLowerCase() + path.sep) || filePath.toLowerCase() === appData.toLowerCase()) {
      return true;
    }
  }
  const parts = filePath.split(/[\\/]+/);
  if (parts.some((part) => IGNORE_DIRS.has(part))) return true;
  const base = parts[parts.length - 1] || '';
  if (base === '.DS_Store' || base === 'Thumbs.db' || base.endsWith('.swp') || base.startsWith('.#')) return true;
  return false;
}

export function shouldTrackFile(filePath: string, home?: string): boolean {
  if (shouldIgnoreWatchPath(filePath, home) || isSecretPath(filePath)) return false;
  const base = path.basename(filePath);
  if (TEXT_NAMES.has(base.toLowerCase())) return true;
  const ext = path.extname(base).toLowerCase();
  return TEXT_EXT.has(ext);
}

export function manyFilesEvent(ts: number): FileEvent {
  return {
    id: randomUUID(),
    ts,
    path: '',
    name: 'Many files',
    ext: '',
    change: 'change',
    added: 0,
    removed: 0,
    note: 'Lots of files changed at once (a build, sync, or checkout). Individual diffs were skipped.',
  };
}

export function interpretSave(input: {
  filePath: string;
  change: FileChange;
  previous: string | null;
  next: string | null;
  ts: number;
  tooBig?: boolean;
}): FileEvent | null {
  if (isSecretPath(input.filePath) || !shouldTrackFile(input.filePath)) return null;
  const name = path.basename(input.filePath);
  const ext = path.extname(name).toLowerCase();
  const base = {
    id: randomUUID(),
    ts: input.ts,
    path: input.filePath,
    name,
    ext,
  };

  if (input.tooBig) {
    return { ...base, change: input.change, added: 0, removed: 0, note: 'Saved a large file. The diff was skipped.' };
  }

  if (input.change === 'unlink') {
    const removed = input.previous ? normalizeNewlines(input.previous).split('\n').length : 0;
    return { ...base, change: 'unlink', added: 0, removed, note: 'Deleted' };
  }

  const next = input.next == null ? null : normalizeNewlines(input.next);
  if (next == null) return null;
  if (next.includes('\0')) return null;

  if (input.previous == null) {
    if (input.change === 'add') {
      const lines = next.split('\n').slice(0, 20).map((line) => `+ ${line.length > 200 ? `${line.slice(0, 200)}…` : line}`);
      return {
        ...base,
        change: 'add',
        added: next.split('\n').length,
        removed: 0,
        diff: redact(lines.join('\n')).slice(0, 8000),
        note: 'Created',
      };
    }
    return {
      ...base,
      change: 'change',
      added: 0,
      removed: 0,
      note: 'First save seen. The next save will include a diff.',
    };
  }

  const previous = normalizeNewlines(input.previous);
  if (previous === next) return null;
  const diff = compactDiff(previous, next);
  if (diff.added === 0 && diff.removed === 0) return null;
  return {
    ...base,
    change: 'change',
    added: diff.added,
    removed: diff.removed,
    diff: diff.text.slice(0, 8000),
  };
}
