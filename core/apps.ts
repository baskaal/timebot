const DISPLAY_NAMES: Record<string, string> = {
  chrome: 'Google Chrome',
  googlechrome: 'Google Chrome',
  googlechromecanary: 'Google Chrome Canary',
  msedge: 'Microsoft Edge',
  microsoftedge: 'Microsoft Edge',
  firefox: 'Firefox',
  brave: 'Brave Browser',
  bravebrowser: 'Brave Browser',
  opera: 'Opera',
  vivaldi: 'Vivaldi',
  arc: 'Arc',
  safari: 'Safari',
  chromium: 'Chromium',
  orion: 'Orion',
  dia: 'Dia',
  zen: 'Zen Browser',
  zenbrowser: 'Zen Browser',
  code: 'Visual Studio Code',
  visualstudiocode: 'Visual Studio Code',
  cursor: 'Cursor',
  windowsterminal: 'Windows Terminal',
  cmd: 'Command Prompt',
  powershell: 'PowerShell',
  windowspowershell: 'Windows PowerShell',
  iterm2: 'iTerm2',
  slack: 'Slack',
  outlook: 'Outlook',
  electron: 'Electron',
};

const BROWSERS = new Set([
  'Google Chrome',
  'Google Chrome Canary',
  'Safari',
  'Firefox',
  'Microsoft Edge',
  'Brave Browser',
  'Arc',
  'Opera',
  'Vivaldi',
  'Chromium',
  'Orion',
  'Dia',
  'Zen Browser',
]);

const IDLE = new Set([
  'loginwindow',
  'lockapp',
  'screensaverengine',
  'screensaver',
  'lockscreen',
]);

export type ActivityCategory = 'code' | 'web' | 'comms' | 'other';

function compact(value: string): string {
  return value.toLowerCase().replace(/\.exe$/i, '').replace(/[^a-z0-9]/g, '');
}

export function normalizeApp(raw: string, title = ''): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const key = compact(trimmed);
  if ((key === 'applicationframehost' || key === 'explorer') && title.trim()) {
    return title.trim().slice(0, 80);
  }
  return DISPLAY_NAMES[key] || trimmed;
}

export function isBrowser(app: string): boolean {
  return BROWSERS.has(app);
}

export function isIdleApp(app: string): boolean {
  if (!app.trim()) return true;
  return IDLE.has(compact(app));
}

export function categoryFor(app: string, kind: 'app' | 'web'): ActivityCategory {
  if (kind === 'web' || isBrowser(app)) return 'web';
  const name = app.toLowerCase();
  if (
    /cursor|visual studio|vscode|xcode|intellij|webstorm|pycharm|goland|rider|terminal|iterm|warp|ghostty|alacritty|sublime|nova|android studio|vim|emacs|zed|windsurf/.test(
      name,
    )
  ) {
    return 'code';
  }
  if (/slack|discord|messages|mail|outlook|zoom|teams|telegram|whatsapp|signal|skype|messenger/.test(name)) {
    return 'comms';
  }
  return 'other';
}
