'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

// A Tregua ("truce") declares an activity — or the whole day — excused by
// external forces. It pauses (bridges) the streak and demands a reason. Purple
// throughout. Used in two places: per-activity (writes /api/log) and whole-day
// (writes /api/day-meta, which excuses every activity that day).
export default function TreguaControl({ kind, goalId, logDate, active, reason }: {
  kind: 'activity' | 'day';
  goalId?: string;
  logDate: string;
  active: boolean;
  reason: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function send(tregua: boolean, note?: string) {
    setBusy(true);
    const endpoint = kind === 'activity' ? '/api/log' : '/api/day-meta';
    const body: Record<string, unknown> = { log_date: logDate, tregua };
    if (kind === 'activity') body.goal_id = goalId;
    if (note !== undefined) body.note = note;
    await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setBusy(false);
    setOpen(false);
    startTransition(() => router.refresh());
  }

  // Active: show the reason + an undo.
  if (active) {
    return (
      <div className="rounded-xl border border-tregua bg-tregua-dim px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-tregua">
            🟣 Tregua{kind === 'day' ? ' day' : ''}
          </span>
          <button
            onClick={() => send(false)}
            disabled={busy}
            className="text-[10px] text-sub hover:text-ink"
          >
            undo
          </button>
        </div>
        {reason && <p className="mt-1 text-sm text-sub">{reason}</p>}
      </div>
    );
  }

  // Collapsed: a small purple link to start a Tregua.
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="self-start text-xs text-tregua transition-opacity hover:opacity-80"
      >
        🟣 {kind === 'day' ? 'Declare Tregua day' : 'Tregua'}
      </button>
    );
  }

  // Open: mandatory reason before it takes effect.
  const canConfirm = text.trim() !== '' && !busy;
  return (
    <div className="rounded-xl border border-tregua bg-tregua-dim px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-wide text-tregua">
        Reason for Tregua (required)
      </span>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Why was this impossible? (external forces)"
        className="mt-1 w-full resize-none bg-transparent text-sm outline-none placeholder:text-sub/60"
      />
      <div className="mt-1 flex justify-end gap-2">
        <button onClick={() => setOpen(false)} className="text-[10px] text-sub hover:text-ink">
          cancel
        </button>
        <button
          onClick={() => canConfirm && send(true, text.trim())}
          disabled={!canConfirm}
          className="rounded bg-tregua/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-tregua disabled:opacity-40"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
