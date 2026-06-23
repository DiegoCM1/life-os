// ============================================================================
// THE ONE FILE TO EDIT. All goal content lives here (v1 brief: goals are
// hardcoded, not user-editable). IDs are stable keys in daily_log — renaming
// a label is free, changing an id orphans its history.
// ============================================================================

export const TIMEZONE = 'America/Mexico_City';

// The day's two deadlines (hours in TIMEZONE, 24h clock). The top card walks
// through them in order: applications by 9:00, then post + prep by 19:00.
export const DEADLINES = {
  applications: { hour: 9, label: 'Applications' },
  evening: { hour: 19, label: 'Post + Interview Prep', goalIds: ['posted', 'interview_prep'] },
};

// How many applications must be in Notion (dated today) before the deadline.
export const APPLICATIONS_DAILY_TARGET = 6;

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
  'Gotta hand it to you, beast!',
  'You think you are a machine? I’m a machine, and I’m scared of you',
  'You didn’t just move the mountain, you charged it fucking rent.',
  'Your demons are sitting in the corner taking notes right now.',
  'You just raw-dogged the impossible and made it look like a warm-up.',
  'You put the "God" in "God damn, you actually pulled that shit off".',
  'You out-worked the simulation and broke the matrix.',
  'Gravity called. You told it to leave a message.',
  'You just unlocked the gold skin for surviving that absolute bloodbath.',
  'That was harder than explaining Wi-Fi to a Victorian child, but you secured the W.',
  'You could say it was luck, but your work ethic says otherwise.',
  'You just bent the space-time continuum. Who’s next?',
  'They said it couldn’t be done, so you did it twice just to piss them off.',
  'You are no longer accepting applications for your haters; the positions are filled and they are working overtime.',
  'You ran on 1% battery, spite, and pure adrenaline, but you fucking made it.',
  'You just pulled a rabbit out of a hat, and the hat was on fire, and you were in hell. But hey, look at the rabbit.',
  'You lost a piece of your soul doing that, but the payout was legendary.',
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

// Clickable topic cards at the bottom of the dashboard; each opens /topic/<id>
// with in-depth charts.
export type TopicDef = {
  id: string;
  label: string;
  kind: 'habit' | 'applications';
};

export const TOPICS: TopicDef[] = [
  { id: 'applications', label: 'Applications', kind: 'applications' },
  { id: 'posted', label: 'Posted', kind: 'habit' },
  { id: 'calisthenics', label: 'Calisthenics', kind: 'habit' },
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

