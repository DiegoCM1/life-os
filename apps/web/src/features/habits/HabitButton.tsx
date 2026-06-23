'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

// Side button for one habit ring: tapping it marks today done and drops one
// green square into the spiral (toggling again removes it).
export default function HabitButton({ goalId, label, done, monthCount, streak }: {
  goalId: string;
  label: string;
  done: boolean;
  monthCount: number;
  streak: number;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [, startTransition] = useTransition();
  const isDone = optimistic ?? done;

  async function toggle() {
    const next = !isDone;
    setOptimistic(next);
    const res = await fetch('/api/log', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal_id: goalId, done: next }),
    });
    if (!res.ok) setOptimistic(null);
    startTransition(() => router.refresh());
  }

  // monthCount reflects the server's view of `done`; shift it while optimistic.
  const squares =
    monthCount + (optimistic === null || optimistic === done ? 0 : optimistic ? 1 : -1);

  return (
    <button
      onClick={toggle}
      className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
        isDone ? 'border-good bg-good-dim' : 'border-edge bg-well'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 flex-shrink-0 rounded-[3px] border-2 ${
          isDone ? 'border-good bg-good' : 'border-sub'
        }`}
      />
      <span className="flex-1">{label}</span>
      {streak > 0 && (
        <span className="text-xs font-semibold tabular-nums text-good" title={`${streak}-day streak`}>
          🔥 {streak}
        </span>
      )}
      <span className="text-xs tabular-nums text-sub">{Math.max(0, squares)} this month</span>
    </button>
  );
}
