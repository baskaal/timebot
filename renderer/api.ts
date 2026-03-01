import type { TimebotApi } from '../core/types.ts';
import { createDemoApi } from './demo.ts';

declare global {
  interface Window {
    timebot?: TimebotApi;
  }
}

let demo: TimebotApi | null = null;

export function client(): TimebotApi {
  if (typeof window !== 'undefined' && window.timebot) return window.timebot;
  demo ??= createDemoApi();
  return demo;
}

export function isPreview(): boolean {
  return typeof window === 'undefined' || !window.timebot;
}
