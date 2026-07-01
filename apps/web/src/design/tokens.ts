/**
 * PHOSPHOR — the single source of truth for the whole look.
 *
 * Everything visual derives from this file:
 *  - tailwind.config.ts imports `palette` for its color scale + builds glow shadows
 *  - layout.tsx injects `cssVars()` so raw CSS and SVG/canvas share the same values
 *  - the viz files (HabitSpiral, Heatmap, charts, DeadlineCard) import the scales/rgb
 *    below instead of hardcoding hex
 *
 * Retro-terminal, green-on-black. Green is the brand/interactive/glow color; the
 * other semantic hues (red = danger, amber = late, purple = Tregua) stay distinct
 * so status still reads at a glance. Tune hexes here and the whole app follows.
 */

export const palette = {
  // Surfaces — near-black with a faint green tint, like phosphor at rest.
  bg: '#04110b',
  card: '#0a1811',
  well: '#07130d',
  edge: '#16351f',

  // Text — green-white body (readable, not full-green), dim green-gray for labels.
  ink: '#d6f5e0',
  sub: '#5f8f74',

  // Brand / interactive / glow.
  accent: '#4dffa0',

  // Semantic status — each keeps its own hue, tuned to glow on black.
  good: '#3ddc84',
  bad: '#ff5c57',
  warn: '#ffc233',
  tregua: '#b06cff',

  // Selected / pop marker (replaces the stray #ec4899).
  marker: '#22d3ee',

  // Dim state-card backgrounds (a whisper of the hue over black).
  'good-dim': '#0d2117',
  'bad-dim': '#250f10',
  'warn-dim': '#241c07',
  'tregua-dim': '#180d29',
} as const;

export type PaletteKey = keyof typeof palette;

/**
 * Ordered ramps for the visualizations. Low intensity → high intensity.
 * Lengths intentionally match the arrays these replace so indexing is unchanged.
 */
export const scales = {
  // Habit spiral "done" cells (was GREEN_SCALE, 3 steps).
  green: ['#1c7a4c', '#2fb56f', '#4dffa0'],
  // Habit spiral "late" cells (was AMBER_SCALE, 3 steps).
  amber: ['#5a4410', '#d19a1a', '#ffc233'],
  // GitHub-style heatmap buckets, empty → full (was SCALE, 4 steps).
  heat: ['#07130d', '#134430', '#1f8a56', '#4dffa0'],
} as const;

/** RGB tuples for numeric interpolation (DeadlineCard lerps sub → bad). */
export const rgb = {
  sub: [95, 143, 116] as [number, number, number],
  bad: [255, 92, 87] as [number, number, number],
} as const;

/** Effect constants — subtle, kiosk-safe (no heavy motion). */
export const effects = {
  scanlineOpacity: 0.05,
  scanlineHeight: '3px',
  glowAlpha: '55', // 2-digit hex alpha appended to a hue for shadows
} as const;

/** Font stacks. `--font-mono` is provided by next/font in layout.tsx. */
export const fonts = {
  mono: "var(--font-mono), ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as const;

/** A glow shadow in a given hue (used by tailwind boxShadow + .glow utilities). */
export function glow(hex: string): string {
  return `0 0 8px ${hex}${effects.glowAlpha}, 0 0 2px ${hex}${effects.glowAlpha}`;
}

/** Append a 2-digit hex alpha to a hue, e.g. alpha(palette.accent, '14'). */
export function alpha(hex: string, hexAlpha: string): string {
  return `${hex}${hexAlpha}`;
}

/**
 * The `:root { --token: value }` block. Injected once in layout.tsx so plain CSS
 * (globals.css effects) and JS can read the exact same palette as Tailwind.
 */
export function cssVars(): string {
  const vars = Object.entries(palette)
    .map(([k, v]) => `--${k}: ${v};`)
    .join(' ');
  return `:root { ${vars} --scanline-opacity: ${effects.scanlineOpacity}; --scanline-height: ${effects.scanlineHeight}; }`;
}
