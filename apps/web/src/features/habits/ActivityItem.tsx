'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatTimeMx } from '@/lib/time';

// One habit row: the toggle card with an in-card ⋯ menu (Add a note / Declare
// Tregua), plus the note or Tregua panel it reveals below. One-shot goals (e.g.
// wake-up) lock after the first press and show their press time. A note panel
// auto-opens, loud, when the activity is missed and its window has closed.
export default function ActivityItem({
  goalId,
  label,
  logDate,
  done,
  late,
  tregua,
  count,
  countLabel,
  streak,
  oneShot = false,
  doneAt = null,
  noteRequired,
  note: initialNote,
}: {
  goalId: string;
  label: string;
  logDate: string;
  done: boolean;
  late: boolean;
  tregua: boolean;
  count: number;
  countLabel: string;
  streak: number;
  oneShot?: boolean;
  doneAt?: string | null;
  noteRequired: boolean;
  note: string; // existing note / Tregua reason
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<'none' | 'note' | 'tregua'>('none');
  const [noteText, setNoteText] = useState(initialNote);
  const [treguaText, setTreguaText] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  const isDone = optimistic ?? done;
  const locked = oneShot && isDone;
  const isLate = isDone && late;
  const isTregua = tregua && !isDone;

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  async function put(body: Record<string, unknown>): Promise<Response> {
    const res = await fetch('/api/log', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_date: logDate, goal_id: goalId, ...body }),
    });
    startTransition(() => router.refresh());
    return res;
  }

  async function toggle() {
    if (locked) return;
    const next = !isDone;
    setOptimistic(next);
    const res = await put({ done: next });
    if (!res.ok) setOptimistic(null);
  }

  async function saveNote() {
    if (noteText !== initialNote) {
      setBusy(true);
      const res = await put({ note: noteText });
      setBusy(false);
      setSaved(res.ok);
    }
    // collapse to a preview after editing, unless a required note is still empty
    if (!(noteRequired && noteText.trim() === '')) setPanel('none');
  }

  async function declareTregua() {
    if (treguaText.trim() === '' || busy) return;
    setBusy(true);
    await put({ tregua: true, note: treguaText.trim() });
    setBusy(false);
    setPanel('none');
  }

  async function undoTregua() {
    setBusy(true);
    await put({ tregua: false });
    setBusy(false);
  }

  const displayCount =
    count + (optimistic === null || optimistic === done ? 0 : optimistic ? 1 : -1);

  // A note exists once it's been saved (comes back as initialNote on refresh).
  const hasNote = initialNote.trim() !== '';
  const editing = panel === 'note';
  // Nag with the loud editor only while a required note is still empty.
  const mustNag = noteRequired && !hasNote;
  const noteLoud = noteRequired && noteText.trim() === '';
  // Full editor while actively editing or nagging; otherwise collapse a saved
  // note into a compact, read-only preview chip (tap or use ⋯ menu to edit).
  const showEditor = !isTregua && (editing || mustNag);
  const showPreview = !isTregua && !showEditor && hasNote;

  return (
    <div className={`relative flex flex-col gap-2 ${menuOpen ? 'z-20' : ''}`}>
      <div className="relative">
        <button
          onClick={toggle}
          disabled={locked}
          className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border py-3 pl-4 pr-9 text-left transition-colors ${
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
          {oneShot && isDone && doneAt && (
            <span className={`text-xs font-semibold tabular-nums ${isLate ? 'text-warn' : 'text-good'}`}>
              {formatTimeMx(doneAt)}
            </span>
          )}
          {isTregua && (
            <span className="rounded bg-tregua/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-tregua">
              Tregua
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

        {/* in-card overflow menu */}
        <div ref={menuRef} className="absolute right-1 top-1/2 -translate-y-1/2">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="More options"
            className="px-1.5 py-1 leading-none text-sub transition-colors hover:text-ink"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-edge bg-card p-1 shadow-lg">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setPanel('note');
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-well"
              >
                {hasNote ? '✎ Edit note' : '＋ Add a note'}
              </button>
              {!isDone && !isTregua && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setTreguaText('');
                    setPanel('tregua');
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-tregua transition-colors hover:bg-well"
                >
                  🟣 Declare Tregua
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* panel: active Tregua, Tregua reason, or note */}
      {isTregua ? (
        <div className="rounded-xl border border-tregua bg-tregua-dim px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-tregua">🟣 Tregua</span>
            <button onClick={undoTregua} disabled={busy} className="text-[10px] text-sub hover:text-ink">
              undo
            </button>
          </div>
          {initialNote && <p className="mt-1 text-sm text-sub">{initialNote}</p>}
        </div>
      ) : panel === 'tregua' ? (
        <div className="rounded-xl border border-tregua bg-tregua-dim px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-tregua">
            Reason for Tregua (required)
          </span>
          <textarea
            autoFocus
            value={treguaText}
            onChange={(e) => setTreguaText(e.target.value)}
            rows={2}
            placeholder="Why was this impossible? (external forces)"
            className="mt-1 w-full resize-none bg-transparent text-sm outline-none placeholder:text-sub/60"
          />
          <div className="mt-1 flex justify-end gap-2">
            <button onClick={() => setPanel('none')} className="text-[10px] text-sub hover:text-ink">
              cancel
            </button>
            <button
              onClick={declareTregua}
              disabled={treguaText.trim() === '' || busy}
              className="rounded bg-tregua/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-tregua disabled:opacity-40"
            >
              Confirm
            </button>
          </div>
        </div>
      ) : showEditor ? (
        <div
          className={`rounded-xl border px-3 py-2 ${
            noteLoud ? 'animate-pulsebad border-bad bg-bad-dim' : 'border-edge bg-well'
          }`}
        >
          <div className="mb-1 flex items-center justify-between">
            <span
              className={`text-[10px] font-bold uppercase tracking-wide ${noteLoud ? 'text-bad' : 'text-sub'}`}
            >
              {noteLoud ? '⚠ Why not done? (required)' : 'Note'}
            </span>
            {busy ? (
              <span className="text-[10px] text-sub">saving…</span>
            ) : saved ? (
              <span className="text-[10px] text-good">saved ✓</span>
            ) : null}
          </div>
          <textarea
            autoFocus={editing}
            value={noteText}
            onChange={(e) => {
              setNoteText(e.target.value);
              setSaved(false);
            }}
            onBlur={saveNote}
            rows={2}
            placeholder="A short reason, so future-you remembers…"
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-sub/60"
          />
        </div>
      ) : showPreview ? (
        <button
          onClick={() => {
            setSaved(false);
            setPanel('note');
          }}
          className="flex w-full items-start gap-2 rounded-xl border border-edge bg-well px-3 py-2 text-left transition-colors hover:border-sub"
        >
          <span className="mt-px text-[10px] leading-none">📝</span>
          <span className="flex-1 truncate text-sm text-sub">{initialNote}</span>
          <span className="text-[10px] text-sub/60">edit</span>
        </button>
      ) : null}
    </div>
  );
}
