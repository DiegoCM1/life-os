# PHOSPHOR — the design system

Retro-terminal, green-on-black, futuristic. This folder + `components/ui` is how
you build any new screen so it matches the rest of the app **without re-inventing
styles**.

## The one rule

**All visual values live in `tokens.ts`.** Never hardcode a hex anywhere else.
- Need a color in JSX? Use the Tailwind class (`text-accent`, `bg-bad-dim`,
  `border-warn`) — those are generated from `palette` in `tokens.ts`.
- Need a raw hex in SVG / canvas / Recharts? Import it: `import { palette, scales } from '@/design/tokens'`.
- Want to change the whole look? Edit `tokens.ts`. Tailwind, the injected CSS
  vars, and the viz files all follow.

## Palette (semantics)

| Token | Meaning |
|-------|---------|
| `bg` `card` `well` `edge` | surfaces (darkest → borders) |
| `ink` `sub` | body text / secondary text |
| `accent` | brand · interactive · glow (phosphor green) |
| `good` | success / done (green) |
| `bad` | danger / missed (red) |
| `warn` | late / warning (amber) |
| `tregua` | excused / paused (purple) |
| `marker` | selected / pop (cyan) |
| `*-dim` | faint state-card backgrounds |

Keep semantics: **red = danger, amber = late, green = done, purple = Tregua.**
Green is for chrome and data; loud hues are only for status.

## Building a screen

```tsx
import { Panel, Button, Badge, SectionTitle, Stat, Input, Textarea, Cursor } from '@/components/ui';

<Panel header="Today">
  <SectionTitle>Habits</SectionTitle>
  <Stat value={7} label="done" glow />
  <Badge variant="warn">Late</Badge>
  <Button variant="primary" size="md">Save</Button>
  <Button variant="ghost" size="sm">cancel</Button>
</Panel>
```

### Primitives (`@/components/ui`)
- **`Button`** — `variant: primary | ghost | danger | warn | tregua | good`, `size: sm | md`
- **`Panel`** — `variant: default | accent | good | bad | warn | tregua`, optional `header`
- **`Input` / `Textarea`** — unified field styling (radius, focus glow)
- **`Badge`** — status pills, same variants as the palette
- **`SegmentedControl`** — URL-driven tabs (server component)
- **`SectionTitle`** — terminal `›` section label
- **`Stat`** — big tabular number + label (`glow` for phosphor)
- **`Cursor`** — blinking `_`

### Effects (utilities in `globals.css`)
- `.glow` / `.text-glow` (+ `-bad` `-warn` `-tregua`) — phosphor shadow in a hue.
  Use sparingly: headers, live/active values, the primary action.
- `.scanlines` — the faint CRT overlay (already on `<body>`; don't re-apply).

### Do / Don't
- ✅ Reach for a primitive before writing a styled `<div>`/`<button>`.
- ✅ Use `tabular-nums` on any changing number (Stat already does).
- ✅ Glow the *one* important thing per view, not everything.
- ❌ No new hex outside `tokens.ts`.
- ❌ No animated scanlines / flicker (kiosk: burn-in + CPU).
