// The "vision container" — the always-visible 12 Week Year strip that sits on
// the dashboard below the spiral. This card is strictly the 3-MONTH (cycle)
// view. Weekly execution lives on the review screen, NOT here.
//
// Shows: which week of the cycle you're in, the 2–3 CYCLE goals with cumulative
// progress toward their 12-week targets, and one overall "on pace" signal (the
// header dot) derived from the goals — red if a goal is badly behind schedule.
//
// Each goal's bar = CUMULATIVE progress toward its 12-week target (out of the
// full-cycle maximum). Two signals per bar:
//   • fill width = how far through the 12-week goal you are
//   • fill color + pace tick = whether you're on pace for where this week
//     (weekNumber / cycleLength through the cycle) says you should be
// Layers (12 Week Year): ONE vision statement (the aspirational "why", static,
// shown as a quiet north-star line at the top) → 1–3 measurable 12-week goals
// (the operational layer, each a metric + target below). The goal labels are the
// measurable metric; the aspiration ("land a senior role") lives in the vision.
//
// All content is rendered from config/cycle.ts (the one file to edit). The
// mock `done`/`currentWeek` values there become live daily_log + Notion
// roll-ups later. The click target is a no-op until the /week route exists.

import { CYCLE, VISION } from '@/config/cycle';

type WeekColor = 'green' | 'yellow' | 'red';

const BG: Record<WeekColor, string> = {
  green: 'bg-good',
  yellow: 'bg-warn',
  red: 'bg-bad',
};

// A goal's pace: compare its progress fraction to how far through the cycle we
// are. On/ahead → green, slightly behind → amber, well behind → red.
function goalPace(fraction: number, elapsed: number): WeekColor {
  const ratio = elapsed === 0 ? 1 : fraction / elapsed;
  if (ratio >= 1) return 'green';
  if (ratio >= 0.75) return 'yellow';
  return 'red';
}

// Overall cycle health = the worst goal. One badly-behind goal is a real red
// flag, so it drags the whole signal — that's the point.
function worst(colors: WeekColor[]): WeekColor {
  if (colors.includes('red')) return 'red';
  if (colors.includes('yellow')) return 'yellow';
  return 'green';
}

export default function VisionCard() {
  const weekNumber = CYCLE.currentWeek;
  const cycleLength = CYCLE.lengthWeeks;
  const goals = CYCLE.goals;
  const elapsed = weekNumber / cycleLength; // where the pace tick sits

  const paced = goals.map((g) => ({
    ...g,
    fraction: Math.min(1, g.done / g.target),
    pace: goalPace(Math.min(1, g.done / g.target), elapsed),
  }));
  const overall = worst(paced.map((g) => g.pace));

  return (
    <section className="card cursor-pointer transition-colors hover:border-accent active:border-accent">
      {/* north star: the single aspirational vision, static, framing the goals */}
      <div className="mb-3 border-b border-edge pb-3">
        <div className="text-[10px] font-bold uppercase tracking-wide text-sub">1-Year Vision</div>
        <p className="mt-0.5 text-sm italic text-ink/80">{VISION.oneYear}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${BG[overall]}`} aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-widest text-sub">
            Week {weekNumber} / {cycleLength}
          </span>
        </div>
        <span className="text-xs text-sub">review ›</span>
      </div>

      <ul className="mt-4 flex flex-col gap-3.5">
        {paced.map((g) => {
          const pct = Math.round(g.fraction * 100);
          const tickPct = Math.round(elapsed * 100);
          const expected = Math.round(elapsed * g.target); // pace target for this week
          return (
            <li key={g.label} className="flex items-center gap-4">
              <span className="w-32 shrink-0 text-base sm:w-44">{g.label}</span>
              <div className="group/bar relative flex-1 cursor-help">
                <div className="h-2 overflow-hidden rounded-full bg-well">
                  <div
                    className={`h-full rounded-full ${BG[g.pace]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* pace marker: "you should be here" — line + downward triangle */}
                <span
                  className="pointer-events-none absolute top-1/2 z-10 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-ink"
                  style={{ left: `${tickPct}%` }}
                  aria-hidden
                />
                <span
                  className="pointer-events-none absolute z-10 -translate-x-1/2 border-x-[4px] border-t-[5px] border-x-transparent border-t-ink"
                  style={{ left: `${tickPct}%`, top: '-6px' }}
                  aria-hidden
                />

                {/* hover tooltip: explains the marker + what the bar means */}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-56 -translate-x-1/2 rounded-lg border border-edge bg-card px-3 py-2 shadow-xl group-hover/bar:block">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-sub">
                    You should be here
                  </div>
                  <div className="mt-1 text-xs leading-snug text-ink/90">
                    By week {weekNumber}/{cycleLength} you should be at ~{expected}/{g.target}{' '}
                    {g.unit}. The bar is your total progress toward the 12-week goal —
                    you&apos;re at {g.done} ({pct}%).
                  </div>
                </div>
              </div>
              <span className="w-20 shrink-0 text-right text-base font-semibold tabular-nums text-sub">
                {g.done}
                <span className="text-sub/60">/{g.target}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
