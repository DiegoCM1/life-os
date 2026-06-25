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
  fail = false,
  tregua,
  count,
  countLabel,
  streak,
  oneShot = false,
  doneAt = null,
  noteRequired,
  note: initialNote,
  dayTregua = false,
}: {
  goalId: string;
  label: string;
  logDate: string;
  done: boolean;
  late: boolean;
  fail?: boolean; // done, but so late it counts as a failure (red) — e.g. wake-up after 10
  tregua: boolean;
  dayTregua?: boolean; // the whole day is a Tregua → this task is purple regardless of done
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
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  const isDone = optimistic ?? done;
  const locked = oneShot && isDone;
  // A failure (red) outranks merely late (yellow): done-but-too-late is red, not yellow.
  const isFail = isDone && fail;
  const isLate = isDone && late && !isFail;
  // Per-activity Tregua is mutually exclusive with done; a whole-day Tregua
  // paints everything purple, even already-done tasks (matches the spiral).
  const activityTregua = tregua && !isDone;
  const isTregua = dayTregua || activityTregua;

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  // Returns true on a confirmed save. On any failure (bad status, parse, or a
  // dead backend) it sets `error` so the UI can stop pretending it worked.
  async function put(body: Record<string, unknown>): Promise<boolean> {
    setError(null);
    let ok = false;
    try {
      const res = await fetch('/api/log', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_date: logDate, goal_id: goalId, ...body }),
      });
      ok = res.ok;
    } catch {
      ok = false;
    }
    if (!ok) setError('Couldn’t save — try again');
    startTransition(() => router.refresh());
    return ok;
  }

  async function toggle() {
    if (locked) return;
    const next = !isDone;
    setOptimistic(next);
    const ok = await put({ done: next });
    if (!ok) setOptimistic(null);
  }

  async function saveNote() {
    if (noteText !== initialNote) {
      setBusy(true);
      const ok = await put({ note: noteText });
      setBusy(false);
      setSaved(ok);
      if (!ok) return; // keep the editor open so the text isn't lost
    }
    // collapse to a preview after editing, unless a required note is still empty
    if (!(noteRequired && noteText.trim() === '')) setPanel('none');
  }

  // Inline editor uses explicit Okay/cancel instead of blur-to-save, so the card
  // only reverts when you say so.
  async function okNote() {
    if (noteText !== initialNote) {
      setBusy(true);
      const ok = await put({ note: noteText });
      setBusy(false);
      setSaved(ok);
      if (!ok) return; // failed — keep editing so nothing is lost
    }
    setPanel('none');
  }

  function cancelNote() {
    setNoteText(initialNote); // drop unsaved edits
    setSaved(false);
    setError(null);
    setPanel('none');
  }

  async function declareTregua() {
    if (treguaText.trim() === '' || busy) return;
    setBusy(true);
    const ok = await put({ tregua: true, note: treguaText.trim() });
    setBusy(false);
    if (ok) setPanel('none'); // on failure keep the form + reason visible
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
  // Editing takes over the card itself (one card, not two): the toggle row is
  // swapped for the editor until you hit Okay/cancel, then it reverts. For a
  // Tregua, the note field holds the reason, so this edits that too.
  const showInlineEditor = editing;
  // A still-empty required note nags as its own loud card beneath, so the toggle
  // stays usable. Once a note exists it lives only on the card's hover tooltip —
  // no extra card is ever shown.
  // A too-late day was technically done, so "why not done?" reads wrong there.
  const reasonPrompt = isFail ? 'Why so late?' : 'Why not done?';
  const mustNag = noteRequired && !hasNote;
  const noteLoud = noteRequired && noteText.trim() === '';
  const showNagCard = !isTregua && !editing && mustNag;

  return (
    <div className={`relative flex flex-col gap-2 ${menuOpen ? 'z-20' : ''}`}>
      {showInlineEditor ? (
        <div className="min-h-[56px] rounded-xl border border-edge bg-well px-3 py-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="truncate text-[10px] font-bold uppercase tracking-wide text-sub">
              {activityTregua ? 'Tregua reason' : noteRequired ? reasonPrompt : 'Note'} · {label}
            </span>
            {busy ? (
              <span className="text-[10px] text-sub">saving…</span>
            ) : saved ? (
              <span className="text-[10px] text-good">saved ✓</span>
            ) : null}
          </div>
          <textarea
            autoFocus
            value={noteText}
            onChange={(e) => {
              setNoteText(e.target.value);
              setSaved(false);
            }}
            onKeyDown={(e) => {
              // Enter saves & closes; Shift+Enter inserts a newline.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                okNote();
              }
            }}
            rows={2}
            placeholder="A short reason, so future-you remembers…"
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-sub/60"
          />
          <div className="mt-1 flex justify-end gap-2">
            <button onClick={cancelNote} className="text-[10px] text-sub hover:text-ink">
              cancel
            </button>
            <button
              onClick={okNote}
              disabled={busy}
              className="rounded bg-good/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-good disabled:opacity-40"
            >
              Okay
            </button>
          </div>
        </div>
      ) : panel === 'tregua' ? (
        <div className="min-h-[56px] rounded-xl border border-tregua bg-tregua-dim px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-tregua">
            Reason for Tregua (required)
          </span>
          <textarea
            autoFocus
            value={treguaText}
            onChange={(e) => setTreguaText(e.target.value)}
            onKeyDown={(e) => {
              // Enter confirms; Shift+Enter inserts a newline.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                declareTregua();
              }
            }}
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
      ) : (
      <div className="group relative">
        <button
          onClick={toggle}
          disabled={locked}
          className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border py-3 pl-4 pr-9 text-left transition-colors ${
            locked ? 'cursor-default' : ''
          } ${
            isTregua
              ? 'border-tregua bg-tregua-dim'
              : isFail
                ? 'border-bad bg-bad-dim'
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
                : isFail
                  ? 'border-bad bg-bad'
                  : isLate
                    ? 'border-warn bg-warn'
                    : isDone
                      ? 'border-good bg-good'
                      : 'border-sub'
            }`}
          />
          <span className="flex-1">{label}</span>
          {oneShot && isDone && doneAt && (
            <span
              className={`text-xs font-semibold tabular-nums ${
                isFail ? 'text-bad' : isLate ? 'text-warn' : 'text-good'
              }`}
            >
              {formatTimeMx(doneAt)}
            </span>
          )}
          {isTregua && (
            <span className="rounded bg-tregua/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-tregua">
              Tregua
            </span>
          )}
          {isFail && (
            <span className="rounded bg-bad/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-bad">
              Too late
            </span>
          )}
          {isLate && (
            <span className="rounded bg-warn/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warn">
              Late
            </span>
          )}
          {hasNote && <span className="text-[11px] leading-none" aria-label="has a note">📝</span>}
          {streak > 0 && (
            <span className="text-xs font-semibold tabular-nums text-good" title={`${streak}-day streak`}>
              🔥 {streak}
            </span>
          )}
          <span className="text-xs tabular-nums text-sub">{Math.max(0, displayCount)} {countLabel}</span>
        </button>

        {/* note revealed on hover (also visible on the spiral cell) */}
        {hasNote && !menuOpen && (
          <div className="pointer-events-none absolute bottom-full left-3 z-30 mb-1 hidden w-max max-w-[260px] rounded-lg border border-edge bg-card px-3 py-2 shadow-xl group-hover:block">
            <div className="text-[10px] font-bold uppercase tracking-wide text-sub">
              {isTregua ? 'Tregua' : 'Note'}
            </div>
            <div className="mt-1 whitespace-pre-wrap text-xs text-ink/90">{initialNote}</div>
          </div>
        )}

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
                {activityTregua ? '✎ Edit reason' : hasNote ? '✎ Edit note' : '＋ Add a note'}
              </button>
              {activityTregua ? (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    undoTregua();
                  }}
                  disabled={busy}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-tregua transition-colors hover:bg-well disabled:opacity-40"
                >
                  🟣 Undo Tregua
                </button>
              ) : dayTregua ? null : !isDone ? (
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
              ) : null}
            </div>
          )}
        </div>
      </div>
      )}

      {/* below the card: only the loud required-note nag — Tregua & notes live in the card itself */}
      {showNagCard ? (
        <div
          className={`rounded-xl border px-3 py-2 ${
            noteLoud ? 'animate-pulsebad border-bad bg-bad-dim' : 'border-edge bg-well'
          }`}
        >
          <div className="mb-1 flex items-center justify-between">
            <span
              className={`text-[10px] font-bold uppercase tracking-wide ${noteLoud ? 'text-bad' : 'text-sub'}`}
            >
              {noteLoud ? `⚠ ${reasonPrompt} (required)` : 'Note'}
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
      ) : null}

      {error && <p className="px-1 text-[10px] font-semibold text-bad">{error}</p>}
    </div>
  );
}
