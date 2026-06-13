import { DATED_GOAL, FITNESS_METRICS } from '@/config/goals';
import type { Fitness } from '@/lib/api';
import { daysUntil } from '@/lib/time';
import NumberStepper from '@/components/NumberStepper';

export default function FitnessGoalCard({ fitness }: { fitness: Fitness }) {
  return (
    <div className="card">
      <h2 className="section-title">{DATED_GOAL.label}</h2>
      <p className="mb-4 flex items-baseline gap-2">
        <span className="stat-num">{daysUntil(DATED_GOAL.date)}</span>
        <span className="stat-label">days left</span>
      </p>
      <div className="flex flex-wrap gap-3">
        {FITNESS_METRICS.map((m) => (
          <NumberStepper
            key={m.id}
            kind="fitness"
            id={m.id}
            label={m.label}
            unit={m.unit}
            step={m.step}
            target={m.goal}
            value={fitness.latest[m.id] ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
