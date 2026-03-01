const SEP = String.fromCharCode(31);
const REC = String.fromCharCode(30);

export function parseActive(stdout: string): { app: string; title: string; url: string; tabTitle: string } {
  const [app = '', title = '', url = '', tabTitle = ''] = stdout.trim().split(SEP);
  return { app: app.trim(), title: title.trim(), url: url.trim(), tabTitle: tabTitle.trim() };
}

export function parseTabs(stdout: string): Array<{ browser: string; url: string; title: string }> {
  const rows = stdout
    .split(REC)
    .map((row) => row.trim())
    .filter(Boolean);
  const tabs: Array<{ browser: string; url: string; title: string }> = [];
  for (const row of rows) {
    if (tabs.length >= 300) break;
    const [browser = '', url = '', title = ''] = row.split(SEP);
    if (!url.trim()) continue;
    tabs.push({ browser: browser.trim(), url: url.trim(), title: title.trim() });
  }
  return tabs;
}

export function permissionHint(stderr: string, platform: string): string | null {
  if (platform !== 'darwin') return null;
  if (/not authorized|(-1743)|1002|assistive access|accessibility|not permitted/i.test(stderr)) {
    return 'macOS is blocking app and window names. In System Settings → Privacy & Security → Accessibility, allow Electron while developing, or Timebot once it is installed. Then allow the Automation prompts for your browsers.';
  }
  return null;
}
