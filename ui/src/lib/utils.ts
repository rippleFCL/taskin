import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { TaskStatus } from '../types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Map a target status (the status that will be set if clicked) to Tailwind classes.
// We stick with accent colors aligned to semantic meaning while preserving outline variant structure.
export const statusButtonClasses: Record<TaskStatus, string> = {
  incomplete: 'border-slate-400 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800',
  'in-progress': 'border-blue-400 text-blue-600 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-800',
  complete: 'border-green-500 text-green-600 hover:bg-green-100 dark:border-green-600 dark:text-green-300 dark:hover:bg-green-800',
  skipped: 'border-orange-500 text-orange-600 hover:bg-orange-100 dark:border-orange-600 dark:text-orange-300 dark:hover:bg-orange-800',
};

// When a button represents the current status (active), give it filled style.
export const activeStatusButtonClasses: Record<TaskStatus, string> = {
  incomplete: 'bg-slate-600 text-white hover:bg-slate-700 dark:bg-slate-500 dark:hover:bg-slate-600',
  'in-progress': 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
  complete: 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600',
  skipped: 'bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600',
};

// Status badge colors (background/text/border) used for compact status chips
export const statusBadgeClasses: Record<TaskStatus, string> = {
  incomplete: 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600',
  'in-progress': 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
  complete: 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
  skipped: 'bg-orange-100 text-orange-700 border border-orange-300 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700',
};

// Hash a string to a deterministic integer
function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Get HSL string from hue with given lightness/saturation
// Convert HSL to HEX for Mermaid compatibility in classDef (hsl() can cause parse errors)
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (v: number) => {
    const n = Math.round((v + m) * 255);
    return n.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Generate paired colors for a category name: bright for category node, muted/dark for todo nodes
export function generateCategoryColors(name: string) {
  const seed = hashString(name || 'Uncategorised');
  // Distribute hue around the wheel while avoiding near-red clustering; use golden ratio
  const hue = (seed * 137.508) % 360;
  // Bright category chip (hex)
  // Make category fill less saturated and a bit lighter to improve text readability
  const categoryFill = hslToHex(hue, 50, 62);
  const categoryStroke = hslToHex(hue, 45, 40);
  const categoryText = '#0b0b0b';
  // Muted/dark todo chip from same hue
  const todoFill = hslToHex(hue, 28, 18);
  const todoStroke = hslToHex(hue, 28, 28);
  const todoText = '#e5e7eb';
  return {
    category: { fill: categoryFill, stroke: categoryStroke, text: categoryText },
    todo: { fill: todoFill, stroke: todoStroke, text: todoText },
  } as const;
}

// Expose base hue for a name (deterministic)
export function baseHueForName(name: string): number {
  const seed = hashString(name || 'Uncategorised');
  return (seed * 137.508) % 360;
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// Find a hue near baseHue that is at least minDelta degrees away from usedHues
export function pickDistinctHue(baseHue: number, usedHues: number[], minDelta = 26, maxTries = 24): number {
  if (!usedHues || usedHues.length === 0) return baseHue;
  let hue = baseHue;
  // Try stepping by golden-angle increments deterministically
  const step = 137.508;
  for (let k = 0; k < maxTries; k++) {
    hue = (baseHue + k * step) % 360;
    const ok = usedHues.every(h => hueDistance(h, hue) >= minDelta);
    if (ok) return hue;
  }
  // Fallback: return base even if colliding
  return baseHue;
}

export function generateCategoryColorsUnique(name: string, usedHues: number[], minDelta = 26) {
  const base = baseHueForName(name);
  const hue = pickDistinctHue(base, usedHues, minDelta);
  const categoryFill = hslToHex(hue, 50, 62);
  const categoryStroke = hslToHex(hue, 45, 40);
  const categoryText = '#0b0b0b';
  const todoFill = hslToHex(hue, 28, 18);
  const todoStroke = hslToHex(hue, 28, 28);
  const todoText = '#e5e7eb';
  return {
    hue,
    category: { fill: categoryFill, stroke: categoryStroke, text: categoryText },
    todo: { fill: todoFill, stroke: todoStroke, text: todoText },
  } as const;
}
