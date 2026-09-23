import { contextBridge, ipcRenderer } from 'electron';
import type { SettingsUpdate } from '../core/types.ts';

contextBridge.exposeInMainWorld('timebot', {
  platform: process.platform,
  eventDays: () => ipcRenderer.invoke('history:days'),
  getOverview: (day: string) => ipcRenderer.invoke('overview:get', day),
  summarize: (day: string) => ipcRenderer.invoke('summary:create', day),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (input: SettingsUpdate) => ipcRenderer.invoke('settings:set', input),
  pickFolder: () => ipcRenderer.invoke('folder:pick'),
  getStatus: () => ipcRenderer.invoke('status:get'),
  showDataFolder: () => ipcRenderer.invoke('data:show'),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  onActivity: (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on('activity', listener);
    return () => ipcRenderer.removeListener('activity', listener);
  },
});
