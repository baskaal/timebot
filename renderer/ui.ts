import type { ActivityCategory } from '../core/apps.ts';

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export const btn =
  'cursor-pointer rounded-full border border-line bg-card px-3.5 py-2 disabled:cursor-default disabled:opacity-45';

export const btnPrimary =
  'cursor-pointer rounded-full border border-transparent bg-copper px-3.5 py-2 text-[#fff8f2] disabled:cursor-default disabled:opacity-45';

export const btnText = 'cursor-pointer border-0 bg-transparent p-0 text-copper';

export const btnDanger = 'cursor-pointer rounded-full border border-line bg-card px-3.5 py-2 text-del';

export const card = 'rounded-[18px] border border-line bg-card px-[18px] pb-[18px] pt-4 shadow-card';

export const heading = 'font-serif text-2xl font-medium';

export const fine = 'text-muted';

export const banner = 'mb-3.5 rounded-[14px] border border-line bg-card px-3.5 py-3';

export const blockTone: Record<ActivityCategory, string> = {
  code: 'border-0 bg-copper text-[#fff8f2]',
  web: 'border-0 bg-teal text-[#fff8f2]',
  comms: 'border-0 bg-plum text-[#fff8f2]',
  other: 'border border-line bg-card text-ink',
};
