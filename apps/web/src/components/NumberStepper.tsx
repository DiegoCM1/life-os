'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

// One stepper for daily number goals (/api/log) — tap-only logging, no free
// text (brief §5).
export default function NumberStepper({ id, label, value, unit, step = 1, target }: {
  id: string;
  label: string;
  value: number;
  unit?: string;
  step?: number;
  target?: number;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const current = optimistic ?? value;

  async function change(delta: number) {
    const next = Math.max(0, Math.round((current + delta) * 100) / 100);
    setOptimistic(next);
    const res = await fetch('/api/log', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal_id: id, value: next }),
    });
    if (!res.ok) setOptimistic(null);
    startTransition(() => router.refresh());
  }

  const hit = target !== undefined && current >= target;
  return (
    <div
      className={`flex min-h-[56px] items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
        hit ? 'border-good bg-good-dim' : 'border-edge bg-well'
      }`}
    >
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => change(-step)}
          aria-label={`decrease ${label}`}
          className="h-9 w-9 rounded-lg bg-edge text-lg leading-none active:bg-accent"
        >
          −
        </button>
        <span className="min-w-14 text-center font-bold tabular-nums">
          {Math.round(current)}
          {target !== undefined && <span className="text-xs font-normal text-sub">/{target}</span>}
          {unit && <span className="ml-px text-xs font-normal text-sub">{unit}</span>}
        </span>
        <button
          onClick={() => change(step)}
          aria-label={`increase ${label}`}
          className="h-9 w-9 rounded-lg bg-edge text-lg leading-none active:bg-accent"
        >
          +
        </button>
      </div>
    </div>
  );
}
