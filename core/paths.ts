export function toDisplayPath(filePath: string, home: string): string {
  if (!filePath) return '';
  const norm = filePath.replace(/\\/g, '/');
  const homeNorm = home.replace(/\\/g, '/').replace(/\/$/, '');
  if (homeNorm && (norm === homeNorm || norm.startsWith(`${homeNorm}/`))) {
    return `~${norm.slice(homeNorm.length)}`;
  }
  return filePath;
}
