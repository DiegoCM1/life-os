'use client';

import { useState } from 'react';

// The per-activity "why not done" note. Shown under an activity that was missed
// (unfulfilled and its window has closed). While required-and-empty it pulses
// red so it's impossible to ignore; once you've written something it calms down.
// Saved on blur to avoid re-rendering the page mid-keystroke.
export default function ActivityNote({ goalId, logDate, initialNote, required }: {
  goalId: string;
  logDate: string;
  initialNote: string;
  required: boolean;
}) {
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (note === initialNote) return;
    setSaving(true);
    const res = await fetch('/api/log', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal_id: goalId, note, log_date: logDate }),
    });
    setSaving(false);
    setSaved(res.ok);
  }

  const loud = required && note.trim() === '';

  return (
    <div
      className={`rounded-xl border px-3 py-2 ${
        loud ? 'animate-pulsebad border-bad bg-bad-dim' : 'border-edge bg-well'
      }`}
    >
      <div className="mb-1 flex items-center justify-between">
        <span
          className={`text-[10px] font-bold uppercase tracking-wide ${loud ? 'text-bad' : 'text-sub'}`}
        >
          {loud ? '⚠ Why not done? (required)' : 'Why not done?'}
        </span>
        {saving ? (
          <span className="text-[10px] text-sub">saving…</span>
        ) : saved ? (
          <span className="text-[10px] text-good">saved ✓</span>
        ) : null}
      </div>
      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setSaved(false);
        }}
        onBlur={save}
        rows={2}
        placeholder="A short reason, so future-you remembers…"
        className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-sub/60"
      />
    </div>
  );
}
