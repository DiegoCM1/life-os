// ============================================================================
// THE ONE FILE TO EDIT for the 12 Week Year. Everything the vision card and
// (soon) the weekly-review screen render comes from here. Mirrors goals.ts.
//
// Two kinds of data live here, deliberately kept separate:
//   • PLAN   — vision, goals, targets, tactics, cycle dates. Static, you edit
//              it by hand. When you want in-app editing + history of past
//              cycles, this becomes the `cycle` table (shape maps 1:1).
//   • ACTUAL — `done` counts and `currentWeek`. MOCK for now; these become live
//              roll-ups from daily_log + Notion (done) and startDate+today
//              (currentWeek). Marked inline so the migration is obvious.
// ============================================================================

// ONE unified vision, stacked by horizon (12WY). The card shows `oneYear`; the
// longer horizons are context (surface them on the review screen later).
export const VISION = {
  lifetime: 'Financially free, building things that matter, strong for life.',
  fiveYear: 'Staff-level engineer or founder with a product people rely on.',
  threeYear: 'Senior engineer at a top company, healthy and out of debt.',
  oneYear:
    'Land a senior engineering role and ship Bluai to real users, training consistently.',
};

export type CycleGoal = {
  /** stable key — will map to daily_log/Notion roll-ups later */
  id: string;
  /** the measurable metric shown on the left of the bar */
  label: string;
  /** 12-week ceiling (the bar's maximum) */
  target: number;
  unit: string;
  /** the weekly tactics that drive this goal — same actions every week (12WY) */
  tactics: string[];
  /** ACTUAL (mock): cumulative progress. Live from daily_log + Notion later. */
  done: number;
};

export type Cycle = {
  /** Monday of week 1, ISO date, America/Mexico_City */
  startDate: string;
  lengthWeeks: number;
  /** ACTUAL (mock): which week we're in. Derived from startDate + today later. */
  currentWeek: number;
  /** 1–3 measurable 12-week goals derived from the 1-year vision */
  goals: CycleGoal[];
};

export type ReflectionPrompt = { id: string; q: string; hint?: string };

// The weekly-review questions (the WAM — Weekly Accountability Meeting). Config
// template, edit freely. The shame prompt's audience rotates each week.
export const REFLECTION_PROMPTS: ReflectionPrompt[] = [
  {
    id: 'shipped',
    q: 'What did I ship this week that has my name on it publicly?',
    hint: 'Only real artifacts: commits, posts, PRs, deploys, applications. If you can’t link it or screenshot it, it doesn’t count.',
  },
  {
    id: 'bullshit',
    q: 'Where did I bullshit myself this week?',
    hint: 'Where did I call something “deep work” when it wasn’t? Where did I dodge the hard task? Name it without filters.',
  },
  {
    id: 'leverage',
    q: 'Highest-leverage move and biggest waste of time?',
    hint: 'One of each. Specific. Did my best hours go to what moves the needle?',
  },
  {
    id: 'gap',
    q: 'How did I close the gap between perceived senior and actual senior?',
    hint: 'What skill or muscle did I level up? If the answer is “nothing”, that’s a red flag.',
  },
  {
    id: 'shame',
    q: 'What would I be embarrassed for someone to see?',
    hint: 'Rotate the audience each week: Daniel / a senior engineer / future self / Shany.',
  },
  {
    id: 'fix',
    q: 'Single best thing to fix and improve next week?',
    hint: 'One move.',
  },
  {
    id: 'exercise',
    q: 'Did I do strength training daily, all week? (the single most important thing)',
    hint: 'Yes or no. No light shit.',
  },
];

export const CYCLE: Cycle = {
  startDate: '2026-05-25',
  lengthWeeks: 12,
  currentWeek: 6,
  goals: [
    {
      id: 'applications',
      label: 'Applications sent',
      target: 400,
      unit: 'apps',
      tactics: ['6 targeted applications/day', '1 YC founder DM/day', 'Tailor CV per role'],
      done: 210,
    },
    {
      id: 'bluai',
      label: 'Features shipped',
      target: 5,
      unit: 'features',
      tactics: ['Ship ≥1 PR/day', 'Weekly demo of progress'],
      done: 3,
    },
    {
      id: 'training',
      label: 'Training days',
      target: 84,
      unit: 'days',
      tactics: ['Strength session daily (not light)', 'Log the session the same day'],
      done: 28,
    },
  ],
};
