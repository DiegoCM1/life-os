// Bottom-of-dashboard topic cards, one per area. Each is clickable and opens
// the in-depth /topic/<id> view with trend charts.

import Link from 'next/link';
import { APPLICATIONS_DAILY_TARGET, TOPICS } from '@/config/goals';
import type { MonthLog } from '@/lib/api';
import { habitStats } from './stats';

export default function TopicCards({ rangeLogs, today, appsCount }: {
  rangeLogs: MonthLog[]; // wider than the current month, for accurate streaks
  today: string;
  appsCount: number | null;
}) {
  return (
    <section>
      <h2 className="section-title">Deep dives</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TOPICS.map((topic) => {
          let big: string;
          let small: string;
          if (topic.kind === 'applications') {
            big = appsCount === null ? '–' : `${Math.round(appsCount)}/${APPLICATIONS_DAILY_TARGET}`;
            small = 'today';
          } else {
            const stats = habitStats(rangeLogs, topic.id, today, 84);
            big = String(stats.currentStreak);
            small = 'day streak';
          }
          return (
            <Link
              key={topic.id}
              href={`/topic/${topic.id}`}
              className="card block transition-colors hover:border-accent active:border-accent"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold">{topic.label}</span>
                <span aria-hidden className="text-sub">›</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="stat-num">{big}</span>
                <span className="stat-label">{small}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
