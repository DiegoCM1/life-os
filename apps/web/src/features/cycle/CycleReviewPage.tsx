// The weekly-review screen (the WAM), opened from the vision card. Layout: the
// 12-week strip nav across the top (each cell colored by that week's execution,
// tap to load it), then the focused week below — auto scorecard + the reflection
// form. Plan (goals/prompts) comes from config/cycle.ts; the per-week actuals
// here are MOCK and become the `week_review` table later.

import Link from 'next/link';
import { CYCLE, REFLECTION_PROMPTS, VISION } from '@/config/cycle';
import { getWeeks } from '@/lib/api';
import { isoAddDays } from '@/lib/time';
import RefreshTimer from '@/features/dashboard/RefreshTimer';
import WeekReviewForm from './WeekReviewForm';

// A week's calendar span, derived from the cycle start (week 1 = startDate).
function fmtShort(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
function weekRange(startDate: string, n: number): { start: string; end: string; label: string } {
  const start = isoAddDays(startDate, (n - 1) * 7);
  const end = isoAddDays(start, 6);
  return { start, end, label: `${fmtShort(start)} – ${fmtShort(end)}` };
}

type WeekColor = 'green' | 'yellow' | 'red';

// 12WY execution bands: 85%+ excellent, below the lower band the week failed.
const EXEC_GREEN = 85;
const EXEC_AMBER = 65;
function execColor(exec: number): WeekColor {
  if (exec >= EXEC_GREEN) return 'green';
  if (exec >= EXEC_AMBER) return 'yellow';
  return 'red';
}

const DIM: Record<WeekColor, string> = {
  green: 'bg-good-dim text-good',
  yellow: 'bg-warn-dim text-warn',
  red: 'bg-bad-dim text-bad',
};
const TEXT: Record<WeekColor, string> = {
  green: 'text-good',
  yellow: 'text-warn',
  red: 'text-bad',
};

type ScorecardMetric = { label: string; done: number; target: number };
type MockWeek = {
  exec: number;
  sleep: number;
  scorecard: ScorecardMetric[];
  answers: Record<string, string>;
  // AI analysis, generated at week-close from the scorecard + answers + prior
  // weeks. MOCK for now → stored on the week_review row later. Past weeks only.
  aiSummary?: string;
};

// MOCK weekly actuals → become the week_review table. Weeks 7–12 haven't
// happened yet (absent). Execution % drives each cell's color.
const MOCK_WEEKS: Record<number, MockWeek> = {
  1: {
    exec: 90,
    sleep: 8,
    scorecard: [
      { label: 'Applications', done: 35, target: 35 },
      { label: 'Posts', done: 7, target: 7 },
      { label: 'Training', done: 6, target: 7 },
    ],
    answers: { fix: 'Block social media hard.', exercise: 'Mostly.' },
    aiSummary:
      'Clean opening week — 90% execution, everything green except one training day. The engine is on. Watch the one crack (training 6/7) before it becomes the story of the cycle.',
  },
  2: {
    exec: 35,
    sleep: 6,
    scorecard: [
      { label: 'Applications', done: 10, target: 35 },
      { label: 'Posts', done: 1, target: 7 },
      { label: 'Training', done: 1, target: 7 },
    ],
    answers: { fix: 'Actually show up.', exercise: 'No.' },
    aiSummary:
      'The week you skipped the review, and the numbers show why: 35% execution, everything collapsed (apps 10/35, training 1/7, sleep 6h). A missed WAM is rarely a scheduling issue — it’s avoidance. First time "show up" appears as the fix. It will not be the last unless something structural changes.',
  },
  3: {
    exec: 88,
    sleep: 8,
    scorecard: [
      { label: 'Applications', done: 35, target: 35 },
      { label: 'Posts', done: 5, target: 7 },
      { label: 'Training', done: 5, target: 7 },
    ],
    answers: { fix: 'Block all social media, cap 15 min.', exercise: 'Yes.' },
    aiSummary:
      'Strong rebound after the week-2 hole — 88% and training back to 5/7. This is the proof you can reset fast. The recurring lever is clear now: social-media blocking shows up as the fix again, meaning it works when you actually do it and slips the moment you don’t.',
  },
  4: {
    exec: 82,
    sleep: 8,
    scorecard: [
      { label: 'Applications', done: 35, target: 35 },
      { label: 'Posts', done: 7, target: 7 },
      { label: 'Training', done: 4, target: 7 },
    ],
    answers: {
      shipped: 'Many PRs in Bluai; consistent all week except exercise.',
      leverage: 'Best: 1 YC DM/day. Waste: TV in the living room.',
      fix: 'Exercise every single day.',
      exercise: 'No.',
    },
    aiSummary:
      '82% and a lot of shipped PRs — a genuinely productive week. But notice the fix: "exercise every single day," for the second time. Training was 4/7 again. You are executing everything except the one thing you keep naming as most important. That is not a time problem, it is a priority problem you haven’t admitted yet.',
  },
  5: {
    exec: 40,
    sleep: 6,
    scorecard: [
      { label: 'Applications', done: 20, target: 35 },
      { label: 'Posts', done: 2, target: 7 },
      { label: 'Training', done: 2, target: 7 },
    ],
    answers: {
      shipped: 'Bluetooth + map features in Bluai; finished Meta deadline; created life-os.',
      bullshit: 'Barely trained; did easy-apply instead of YC; worried instead of shipping.',
      leverage: 'Best: built life-os. Waste: YouTube on the TV.',
      gap: 'Nothing — no interview prep or new learning.',
      shame: 'Didn’t apply to YC jobs like I said; posted no videos.',
      fix: 'Exercise every day; wake at the same time; respect blocks.',
      exercise: 'No.',
    },
    aiSummary:
      'You rated this "fine" and it was a 40% red. Real artifacts shipped (Bluetooth, map, life-os), but training 2/7, posts 2/7, sleep 6h, and you dodged YC for easy LinkedIn applies. "Exercise every day" is the fix again — make it the first block of the day, non-negotiable.',
  },
  6: {
    exec: 71,
    sleep: 8,
    scorecard: [
      { label: 'Applications', done: 30, target: 35 },
      { label: 'Posts', done: 5, target: 7 },
      { label: 'Training', done: 4, target: 7 },
    ],
    answers: {}, // current week — to fill
  },
};

// MOCK rolling cross-week synthesis for the "Cycle patterns" panel. Exactly ONE
// per cycle: regenerated at each week-close and REPLACING the prior one (never
// per week). Becomes a stored field on the cycle / latest week_review row later.
const CYCLE_PATTERNS: {
  headline: string;
  patterns: { tone: WeekColor; text: string }[];
  outlook: string;
} = {
  headline: '6 weeks in — this cycle is being decided by one keystone you keep dodging.',
  patterns: [
    {
      tone: 'red',
      text: 'Training is the defining failure: below target 4 of 6 weeks, and “exercise every day” has been your #1 fix in weeks 1, 4 and 5 without ever holding.',
    },
    {
      tone: 'yellow',
      text: 'Feeling ≠ reality: your worst weeks (2 at 35%, 5 at 40%) are the ones you rated “fine.” Trust the scoreboard, not the mood.',
    },
    {
      tone: 'green',
      text: 'You reset fast — 88% right after the week-2 collapse. Recovery isn’t the problem; keystone consistency is.',
    },
    {
      tone: 'yellow',
      text: 'Under pressure you swap the hard channel (YC DMs) for the easy one (LinkedIn easy-apply).',
    },
  ],
  outlook:
    'On pace for apps and Bluai, behind on training. The back half will be remembered by whether you fix the keystone.',
};

const DOT: Record<WeekColor, string> = {
  green: 'bg-good',
  yellow: 'bg-warn',
  red: 'bg-bad',
};

export default async function CycleReviewPage({ week }: { week?: string }) {
  const { currentWeek, lengthWeeks } = CYCLE;

  // Focused week: clamp to a real, already-happened week; default to current.
  const requested = Number(week);
  const focused =
    Number.isInteger(requested) && requested >= 1 && requested <= currentWeek
      ? requested
      : currentWeek;

  // Persisted reviews overlay the mock scaffold: user-authored answers/sleep and
  // (later) the AI note come from the DB; the scorecard numbers are still mock
  // until the daily_log + Notion roll-up lands.
  const { weeks } = await getWeeks();
  const dbByWeek = new Map(weeks.map((w) => [w.week_number, w]));
  const execOf = (n: number): number | null =>
    dbByWeek.get(n)?.exec_score ?? MOCK_WEEKS[n]?.exec ?? null;

  const mock = MOCK_WEEKS[focused];
  const db = dbByWeek.get(focused);
  const hasWeek = Boolean(mock) || Boolean(db);
  const execScore = execOf(focused);
  const color = execScore != null ? execColor(execScore) : null;
  const sleep = db?.sleep_avg ?? mock?.sleep ?? null;
  const scorecard = mock?.scorecard ?? null;
  const aiSummary = db?.ai_summary ?? mock?.aiSummary ?? null;
  const answers = db && Object.keys(db.answers).length > 0 ? db.answers : mock?.answers ?? {};
  const weekStart = weekRange(CYCLE.startDate, focused).start;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-5">
      <RefreshTimer />

      <header className="flex flex-wrap items-baseline gap-4">
        <Link href="/" className="text-sub hover:text-ink">← Today</Link>
        <h1 className="text-2xl font-bold">12-Week Review</h1>
      </header>
      <p className="-mt-2 text-sm italic text-sub">{VISION.oneYear}</p>

      {/* 12-week strip nav: each cell colored by that week's execution */}
      <section className="card">
        <h2 className="section-title">The cycle</h2>
        <div className="flex gap-1.5">
          {Array.from({ length: lengthWeeks }, (_, i) => i + 1).map((n) => {
            const e = execOf(n);
            const isFuture = n > currentWeek;
            const isSelected = n === focused;
            const range = weekRange(CYCLE.startDate, n);
            const cellColor = e != null ? DIM[execColor(e)] : 'bg-well text-sub/40';
            const ring = isSelected ? 'ring-2 ring-inset ring-ink' : '';
            const cls = `relative group/cell flex h-9 flex-1 items-center justify-center rounded-md text-xs font-bold ${cellColor} ${ring}`;
            const tip = (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max -translate-x-1/2 rounded-lg border border-edge bg-card px-3 py-2 text-left shadow-xl group-hover/cell:block">
                <div className="text-[10px] font-bold uppercase tracking-wide text-sub">Week {n}</div>
                <div className="mt-0.5 whitespace-nowrap text-xs text-ink/90">{range.label}</div>
                {isFuture && (
                  <div className="mt-1 whitespace-nowrap text-xs text-warn">
                    🔒 Unlocks {fmtShort(range.start)}
                  </div>
                )}
              </div>
            );
            return isFuture ? (
              <div key={n} className={cls}>
                {n}
                {tip}
              </div>
            ) : (
              <Link key={n} href={`/cycle?week=${n}`} className={cls}>
                {n}
                {tip}
              </Link>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-sub">
          Viewing week {focused} · you’re on week {currentWeek} of {lengthWeeks}. Tap a cell to review it.
        </p>
      </section>

      {/* cycle patterns: ONE rolling cross-week synthesis, always shown */}
      <section className="card border-accent/40">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
            ✦ Cycle patterns
          </span>
          <span className="text-xs text-sub">across weeks 1–{currentWeek}</span>
        </div>
        <p className="text-sm font-semibold text-ink">{CYCLE_PATTERNS.headline}</p>
        <ul className="mt-3 flex flex-col gap-2">
          {CYCLE_PATTERNS.patterns.map((p, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-ink/85">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[p.tone]}`} aria-hidden />
              <span>{p.text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-edge pt-3 text-sm italic text-sub">{CYCLE_PATTERNS.outlook}</p>
      </section>

      {/* focused week: scorecard */}
      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">
            Week {focused} / {lengthWeeks}
            {focused === currentWeek && <span className="ml-2 text-xs text-accent">this week</span>}
          </h2>
          {execScore != null && color && (
            <span className="text-sm text-sub">
              exec <span className={`font-semibold tabular-nums ${TEXT[color]}`}>{execScore}%</span>
            </span>
          )}
        </div>

        {scorecard ? (
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            {scorecard.map((m) => {
              const met = m.done >= m.target;
              return (
                <div key={m.label} className="flex flex-col">
                  <span className="stat-label">{m.label}</span>
                  <span className={`text-xl font-bold tabular-nums ${met ? 'text-good' : 'text-ink'}`}>
                    {m.done}
                    <span className="text-sub">/{m.target}</span>
                  </span>
                </div>
              );
            })}
            {sleep != null && (
              <div className="flex flex-col">
                <span className="stat-label">Sleep avg</span>
                <span className="text-xl font-bold tabular-nums text-ink">{sleep}h</span>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-sub">This week hasn’t happened yet.</p>
        )}
      </section>

      {/* AI analysis — completed weeks only, read-only, pattern-calling */}
      {aiSummary && focused !== currentWeek && (
        <section className="card border-accent/40">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
              ✦ AI analysis
            </span>
            <span className="text-xs text-sub">generated at week close</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/85">{aiSummary}</p>
        </section>
      )}

      {/* focused week: reflection */}
      {hasWeek && (
        <WeekReviewForm
          prompts={REFLECTION_PROMPTS}
          initial={answers}
          editable={focused === currentWeek}
          week={focused}
          weekStart={weekStart}
        />
      )}
    </main>
  );
}
