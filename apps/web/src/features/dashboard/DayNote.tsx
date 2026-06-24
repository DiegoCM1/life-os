'use client';

import { useState } from 'react';

// The day-level note: a short bit of context about the whole day. Hidden behind
// a small "add a note" link when it's optional and empty, so a clean day stays
// uncluttered — but when the day is incomplete-and-closed it's required and
// pulses red until written (so a missed day always gets a reason). Saves on blur.
export default function DayNote({ logDate, initialNote, required }: {
  logDate: string;
  initialNote: string;
  required: boolean;
}) {
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Open by default only when it needs to be: required, or there's already a note.
  const [expanded, setExpanded] = useState(required || initialNote.trim() !== '');

  async function save() {
    if (note === initialNote) return;
    setSaving(true);
    const res = await fetch('/api/day-note', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_date: logDate, note }),
    });
    setSaving(false);
    setSaved(res.ok);
  }

  const loud = required && note.trim() === '';

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="self-start text-xs text-sub transition-colors hover:text-ink"
      >
        ＋ Add a note for this day
      </button>
    );
  }

  return (
    <section
      className={`card ${loud ? 'animate-pulsebad border-bad bg-bad-dim' : ''}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`text-xs font-semibold uppercase tracking-widest ${loud ? 'text-bad' : 'text-sub'}`}
        >
          {loud ? '⚠ Incomplete day — add a note (required)' : 'Day note'}
        </span>
        {saving ? (
          <span className="text-[10px] text-sub">saving…</span>
        ) : saved ? (
          <span className="text-[10px] text-good">saved ✓</span>
        ) : null}
      </div>
      <textarea
        // autofocus only when the user opened it via the link (i.e. it wasn't
        // open by default), so a required/existing note doesn't yank the page.
        autoFocus={!required && initialNote.trim() === ''}
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setSaved(false);
        }}
        onBlur={save}
        rows={2}
        placeholder="A line of context for this day, so future-you remembers…"
        className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-sub/60"
      />
    </section>
  );
}
