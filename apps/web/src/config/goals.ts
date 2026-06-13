// ============================================================================
// THE ONE FILE TO EDIT. All goal/bet/book/mantra content lives here (v1 brief:
// goals are hardcoded, not user-editable). IDs are stable keys in daily_log /
// fitness_metric — renaming a label is free, changing an id orphans its history.
// ============================================================================

export const TIMEZONE = 'America/Mexico_City';

// Daily applications deadline (11:00 AM in TIMEZONE).
export const DEADLINE_HOUR = 11;

// How many applications must be in Notion (dated today) before the deadline.
export const APPLICATIONS_DAILY_TARGET = 5;

export type GoalDef = {
  id: string;
  label: string;
  type: 'toggle' | 'number';
  unit?: string;
  /** daily target for number goals */
  target?: number;
};

// Today's non-negotiables, logged by tapping in the web app.
// (Applications are NOT here — they come read-only from Notion.)
export const GOALS: GoalDef[] = [
  { id: 'posted', label: 'Posted', type: 'toggle' },
  { id: 'calisthenics', label: 'Calisthenics', type: 'toggle' },
  { id: 'reading', label: 'Read', type: 'toggle' },
  { id: 'deep_work_hours', label: 'Deep work', type: 'number', unit: 'h', target: 4 },
];

// Fitness metrics logged with steppers; latest values shown next to the dated goal.
export const FITNESS_METRICS = [
  { id: 'handstand_hold_seconds', label: 'Handstand hold', unit: 's', step: 5, goal: 60 },
  { id: 'strict_pullups', label: 'Strict pull-ups', unit: 'reps', step: 1, goal: 15 },
];

// Dated goal countdown.
export const DATED_GOAL = {
  label: 'End-of-July fitness target',
  date: '2026-07-31',
};

// The un-scoreable corner. Deliberately not graded.
export const CURRENT_BOOK = 'Set your current book in src/config/goals.ts';
export const MANTRAS = [
  'Control the inputs. Ignore the scoreboard.',
  'Done before 11.',
  'Show up, especially when it is small.',
  'You only log what you did, never what they decided.',
];
