import fs from 'node:fs';
import path from 'node:path';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  nativeTheme,
  shell,
  Tray,
} from 'electron';
import type { SettingsUpdate, TrackerStatus } from '../core/types.ts';
import { Engine } from './engine.ts';
import { summarizeDay } from './openai.ts';
import { SettingsStore } from './settings.ts';
import { Snapshots } from './snapshots.ts';
import { Store } from '../core/store.ts';

app.setName('timebot');
app.setAppUserModelId('app.timebot.desktop');

let windowRef: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;
let engine: Engine | null = null;
let settings: SettingsStore | null = null;

function tracker(): Engine {
  if (!engine) throw new Error('Timebot is still starting.');
  return engine;
}

function prefs(): SettingsStore {
  if (!settings) throw new Error('Timebot is still starting.');
  return settings;
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

function asset(name: string): string {
  return path.join(__dirname, '..', 'assets', name);
}

function showWindow(): void {
  if (!windowRef) {
    createWindow();
    return;
  }
  if (windowRef.isMinimized()) windowRef.restore();
  windowRef.show();
  windowRef.focus();
}

function createWindow(): void {
  const icon = fs.existsSync(asset('icon.png')) ? asset('icon.png') : undefined;
  const win = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 920,
    minHeight: 640,
    show: false,
    title: 'Timebot',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#141210' : '#efe6da',
    icon,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  windowRef = win;
  win.once('ready-to-show', () => win.show());
  win.on('close', (event) => {
    if (!quitting) {
      event.preventDefault();
      win.hide();
    }
  });
  win.on('closed', () => {
    windowRef = null;
  });

  if (process.env.TIMEBOT_DEV === '1') {
    void loadDev(win);
  } else {
    void win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

async function loadDev(win: BrowserWindow): Promise<void> {
  const url = 'http://127.0.0.1:5173';
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      await win.loadURL(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}

function trayImage() {
  if (process.platform === 'darwin') {
    const file = asset('trayTemplate.png');
    if (fs.existsSync(file)) {
      const image = nativeImage.createFromPath(file);
      image.setTemplateImage(true);
      return image;
    }
  }
  const icon = asset('icon.png');
  if (fs.existsSync(icon)) return nativeImage.createFromPath(icon).resize({ width: 18, height: 18 });
  return nativeImage.createEmpty();
}

function rebuildTray(status?: TrackerStatus): void {
  if (!tray || !engine) return;
  const current = status ?? engine.currentStatus();
  const paused = current.paused;
  tray.setToolTip(paused ? 'Timebot — paused' : current.lastSample ? `Timebot — ${current.lastSample.app}` : 'Timebot');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Timebot', click: () => showWindow() },
      {
        label: paused ? 'Resume tracking' : 'Pause tracking',
        click: () => tracker().setPaused(!paused),
      },
      { type: 'separator' },
      { label: 'Quit Timebot', click: () => app.quit() },
    ]),
  );
}

function createTray(): void {
  tray = new Tray(trayImage());
  tray.on('click', () => showWindow());
  rebuildTray();
}

function sendActivity(): void {
  const win = windowRef;
  if (!win || win.isDestroyed()) return;
  win.webContents.send('activity');
}

function isDay(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function asSettings(value: unknown): SettingsUpdate | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Partial<SettingsUpdate>;
  if (typeof input.openaiModel !== 'string' || !Array.isArray(input.watchFolders)) return null;
  if (!input.watchFolders.every((folder) => typeof folder === 'string')) return null;
  return {
    openaiModel: input.openaiModel,
    openaiApiKey: typeof input.openaiApiKey === 'string' ? input.openaiApiKey : undefined,
    replaceKey: Boolean(input.replaceKey),
    watchFolders: input.watchFolders,
    openAtLogin: Boolean(input.openAtLogin),
    paused: Boolean(input.paused),
  };
}

function installMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [];
  if (process.platform === 'darwin') {
    template.push({
      label: 'Timebot',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  } else {
    template.push({
      label: 'File',
      submenu: [{ label: 'Quit', click: () => app.quit() }],
    });
  }
  template.push({ role: 'editMenu' });
  if (process.env.TIMEBOT_DEV === '1') template.push({ role: 'viewMenu' });
  template.push({ role: 'windowMenu' });
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function registerIpc(): void {
  ipcMain.handle('overview:get', (_event, day: unknown) => {
    if (!isDay(day)) throw new Error('Invalid day');
    return tracker().overview(day);
  });
  ipcMain.handle('summary:create', async (_event, day: unknown) => {
    if (!isDay(day)) return { ok: false, error: 'Invalid day' };
    const overview = tracker().overview(day);
    const result = await summarizeDay({
      overview,
      apiKey: prefs().getKey(),
      model: prefs().get().openaiModel,
    });
    if (result.ok) tracker().saveSummary(result.summary);
    return result;
  });
  ipcMain.handle('settings:get', () => prefs().view());
  ipcMain.handle('settings:set', (_event, input: unknown) => {
    const update = asSettings(input);
    if (!update) return { ok: false, error: 'Settings were not valid.' };
    const result = prefs().apply(update);
    if (!result.ok) return result;
    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: result.settings.openAtLogin });
    tracker().applySettings();
    return result;
  });
  ipcMain.handle('folder:pick', async () => {
    const options = { properties: ['openDirectory'] as Array<'openDirectory'> };
    const result = windowRef
      ? await dialog.showOpenDialog(windowRef, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
  ipcMain.handle('tracking:set', (_event, paused: unknown) => {
    tracker().setPaused(Boolean(paused));
    return prefs().view();
  });
  ipcMain.handle('status:get', () => tracker().currentStatus());
  ipcMain.handle('data:show', async () => {
    const folder = app.getPath('userData');
    await shell.openPath(folder);
    return { path: folder };
  });
  ipcMain.handle('history:clear', () => {
    tracker().clearHistory();
  });
}

if (gotLock) {
  app.on('second-instance', () => showWindow());
  app.on('before-quit', () => {
    quitting = true;
    engine?.stop();
  });
  app.on('activate', () => showWindow());
  app.on('window-all-closed', () => {
    // Stay running in the tray.
  });

  app.whenReady().then(() => {
    const userData = app.getPath('userData');
    settings = new SettingsStore(userData, { dataPath: userData, packaged: app.isPackaged });
    const store = new Store(path.join(userData, 'data.json'));
    const snapshots = new Snapshots(path.join(userData, 'snapshots'));
    engine = new Engine(settings, store, snapshots, (status) => {
      rebuildTray(status);
      sendActivity();
    });
    if (app.isPackaged && settings.get().openAtLogin) {
      app.setLoginItemSettings({ openAtLogin: true });
    }
    installMenu();
    registerIpc();
    createWindow();
    createTray();
    engine.start();
    app.setAboutPanelOptions({
      applicationName: 'Timebot',
      applicationVersion: app.getVersion(),
    });
  });
}
