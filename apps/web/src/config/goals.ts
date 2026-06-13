// ============================================================================
// THE ONE FILE TO EDIT. All goal/bet/book/mantra content lives here (v1 brief:
// goals are hardcoded, not user-editable). IDs are stable keys in daily_log /
// fitness_metric — renaming a label is free, changing an id orphans its history.
// ============================================================================

export const TIMEZONE = 'America/Mexico_City';

// The day's two deadlines (hours in TIMEZONE, 24h clock). The top card walks
// through them in order: applications by 9:00, then post + prep by 19:00.
export const DEADLINES = {
  applications: { hour: 9, label: 'Applications' },
  evening: { hour: 19, label: 'Post + Interview Prep', goalIds: ['posted', 'interview_prep'] },
};

// How many applications must be in Notion (dated today) before the deadline.
export const APPLICATIONS_DAILY_TARGET = 5;

// Shown on the top card once BOTH deadlines are cleared. Rotates.
export const VICTORY_LINES = [
  // joe-rogan energy
  'Be the hero of your own movie.',
  'You did the work. Nobody can take that from you.',
  'Most people quit. You didn’t. That’s the whole game.',
  'The savage showed up today.',
  'Discipline today, freedom tomorrow.',
  'Comfort is a slow death. You picked the hard path — again.',
  'Tomorrow you do it again. That’s how legends get built.',
  'Kill the version of you that makes excuses.',
  // fun-victorious
  'Another day devoured. Burp.',
  'Scoreboard check: you, undefeated today.',
  'The to-do list never stood a chance.',
  'Day: defeated. Snacks: earned.',
  'Somewhere, your future self just fist-pumped.',
  'GG. No re. Touch grass.',
  'Achievement unlocked: Tuesday, but make it heroic.',
  'You vs the day. Final score: flawless victory.',
  'The couch waited all day. It can keep waiting — you earned it now.',
  'Boss defeated. Loot: a clear conscience.',
  'Plot twist: the main character actually did the side quests too.',
  'Certified W. Frame it.',
  'Your excuses filed for unemployment today.',
  'Dopamine, the honest way. Nicely done.',
  'Today you were the storm, not the forecast.',
  // fun victory quotes that still hit
  '“I came, I saw, I conquered.” You, basically. Today.',
  'Victory belongs to the most persevering. — Napoleon (and you, apparently)',
  'Fortune favors the bold. The bold also finished before 7 PM.',
  'Winners do daily what losers do occasionally.',
  'Hard choices, easy life. You chose right today.',
  // suspiciously philosophical
  'Victory is a thousand invisible mornings nobody clapped for.',
  'You don’t conquer the day. You conquer the self that didn’t want to.',
  'The obstacle was never the day. It was you — and you moved.',
  'Every empire is built one kept promise at a time.',
  'What you did today, time itself cannot undo.',
  'The war is won by whoever shows up to the most ordinary battles.',
];

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
  { id: 'interview_prep', label: 'Interview Prep + Studying', type: 'toggle' },
  { id: 'deep_work_hours', label: 'Deep work', type: 'number', unit: 'h', target: 4 },
];

// Fitness metrics logged with steppers; latest values shown next to the dated goal.
export const FITNESS_METRICS = [
  { id: 'handstand_hold_seconds', label: 'Handstand hold', unit: 's', step: 5, goal: 60 },
  { id: 'strict_pullups', label: 'Strict pull-ups', unit: 'reps', step: 1, goal: 15 },
];

// Clickable topic cards at the bottom of the dashboard; each opens /topic/<id>
// with in-depth charts. `metrics` adds fitness-metric trend charts to that page.
export type TopicDef = {
  id: string;
  label: string;
  kind: 'habit' | 'applications';
  metrics?: string[];
};

export const TOPICS: TopicDef[] = [
  { id: 'applications', label: 'Applications', kind: 'applications' },
  { id: 'posted', label: 'Posted', kind: 'habit' },
  {
    id: 'calisthenics',
    label: 'Calisthenics',
    kind: 'habit',
    metrics: ['handstand_hold_seconds', 'strict_pullups'],
  },
  { id: 'interview_prep', label: 'Interview Prep + Studying', kind: 'habit' },
];

// How the Notion Status options group into pipeline sections on the
// applications page. Statuses not listed here still render, under "Other".
export const APPLICATION_STATUS_GROUPS = [
  { label: 'Active', accent: '#4f8cff', statuses: ['Applied', 'Interviewing'] },
  { label: 'Offers', accent: '#3ddc84', statuses: ['Offer'] },
  {
    label: 'Dead',
    accent: '#ff5252',
    statuses: [
      'Dead - Application rejected',
      'Dead - After HR',
      'Dead - After technical interview',
    ],
  },
];

// Funnel/conversion math on the applications page (which statuses count as
// having reached each stage). Tune these to your Notion Status options.
export const APPLICATION_FUNNEL = {
  // got any human engagement past the initial application
  reachedInterview: [
    'Interviewing',
    'Offer',
    'Dead - After HR',
    'Dead - After technical interview',
  ],
  offers: ['Offer'],
};

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
