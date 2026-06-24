'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatTimeMx } from '@/lib/time';

// Side button for one habit ring: tapping it marks the day done and drops one
// green square into the spiral (toggling again removes it). One-shot goals (e.g.
// "Wake up early") lock after the first press and show the time they were
// pressed — there's no undo, and the press time is the whole point.
export default function HabitButton({
  goalId,
  label,
  done,
  late,
  tregua = false,
  count,
  countLabel,
  streak,
  logDate,
  oneShot = false,
  doneAt = null,
}: {
  goalId: string;
  label: string;
  done: boolean;
  late: boolean; // done, but after the deadline → render yellow
  tregua?: boolean; // excused for the day → render purple
  count: number; // done-days within the active spiral range
  countLabel: string; // 'this week' | 'this month' | 'this year'
  streak: number;
  logDate: string;
  oneShot?: boolean; // lock after first press, never untoggle
  doneAt?: string | null; // ISO press time, shown for one-shot goals
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [, startTransition] = useTransition();
  const isDone = optimistic ?? done;
  const locked = oneShot && isDone; // irreversible once done

  async function toggle() {
    if (locked) return;
    const next = !isDone;
    setOptimistic(next);
    const res = await fetch('/api/log', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal_id: goalId, done: next, log_date: logDate }),
    });
    if (!res.ok) setOptimistic(null);
    startTransition(() => router.refresh());
  }

  // count reflects the server's view of `done`; shift it while optimistic.
  const displayCount =
    count + (optimistic === null || optimistic === done ? 0 : optimistic ? 1 : -1);

  // `late` is server-derived (needs done_at), so a fresh tap shows green first
  // and settles to yellow on the next refresh once the server reports it late.
  const isLate = isDone && late;
  // tregua (excused) shows purple; it's mutually exclusive with done.
  const isTregua = tregua && !isDone;

  return (
    <button
      onClick={toggle}
      disabled={locked}
      className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
        locked ? 'cursor-default' : ''
      } ${
        isTregua
          ? 'border-tregua bg-tregua-dim'
          : isLate
            ? 'border-warn bg-warn-dim'
            : isDone
              ? 'border-good bg-good-dim'
              : 'border-edge bg-well'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 flex-shrink-0 rounded-[3px] border-2 ${
          isTregua
            ? 'border-tregua bg-tregua'
            : isLate
              ? 'border-warn bg-warn'
              : isDone
                ? 'border-good bg-good'
                : 'border-sub'
        }`}
      />
      <span className="flex-1">{label}</span>
      {isTregua && (
        <span className="rounded bg-tregua/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-tregua">
          Tregua
        </span>
      )}
      {oneShot && isDone && doneAt && (
        <span className={`text-xs font-semibold tabular-nums ${isLate ? 'text-warn' : 'text-good'}`}>
          {formatTimeMx(doneAt)}
        </span>
      )}
      {isLate && (
        <span className="rounded bg-warn/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warn">
          Late
        </span>
      )}
      {streak > 0 && (
        <span className="text-xs font-semibold tabular-nums text-good" title={`${streak}-day streak`}>
          🔥 {streak}
        </span>
      )}
      <span className="text-xs tabular-nums text-sub">{Math.max(0, displayCount)} {countLabel}</span>
    </button>
  );
}
