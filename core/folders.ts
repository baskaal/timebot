import path from 'node:path';

export function expandHome(folder: string, home: string): string {
  if (folder === '~') return home;
  if (folder.startsWith('~/') || folder.startsWith('~\\')) return path.join(home, folder.slice(2));
  return folder;
}

export function rejectWatchFolder(folder: string, home: string): string | null {
  const resolved = path.resolve(expandHome(folder, home));
  const root = path.parse(resolved).root;
  if (resolved === root) return 'That folder is too broad.';
  if (resolved === path.resolve(home)) return 'Pick a project or documents folder, not your whole home folder.';
  const library = path.resolve(home, 'Library');
  if (resolved === library || resolved.startsWith(library + path.sep)) return 'Timebot skips Library folders.';
  const appData = path.resolve(home, 'AppData');
  if (resolved.toLowerCase() === appData.toLowerCase() || resolved.toLowerCase().startsWith(appData.toLowerCase() + path.sep)) {
    return 'Timebot skips AppData.';
  }
  return null;
}

export function normalizeWatchFolders(folders: string[], home: string): { folders: string[]; error: string | null } {
  if (folders.length > 12) return { folders: [], error: 'Watch at most 12 folders.' };
  const seen = new Set<string>();
  const next: string[] = [];
  for (const folder of folders) {
    const trimmed = folder.trim();
    if (!trimmed) continue;
    const error = rejectWatchFolder(trimmed, home);
    if (error) return { folders: [], error };
    const resolved = path.resolve(expandHome(trimmed, home));
    const key = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(resolved);
  }
  return { folders: next, error: null };
}
