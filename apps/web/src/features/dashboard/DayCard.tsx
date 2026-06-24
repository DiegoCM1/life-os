'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

// The day-level card: a slim card with an in-card ⋯ menu (Add/Edit note,
// Declare/Undo Tregua day). Editing happens inside this one card; a saved note
// or Tregua reason shows on hover. Turns loud-red and forces a note when the day
// is incomplete and closed; turns purple when the whole day is a Tregua.
export default function DayCard({ logDate, required, note: initialNote, tregua }: {
  logDate: string;
  required: boolean;
  note: string;
  tregua: boolean;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<'none' | 'note' | 'tregua'>('none');
  const [noteText, setNoteText] = useState(initialNote);
  const [treguaText, setTreguaText] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  // Returns true on a confirmed save; sets `error` on any failure so the UI
  // doesn't silently pretend it worked.
  async function put(body: Record<string, unknown>): Promise<boolean> {
    setError(null);
    let ok = false;
    try {
      const res = await fetch('/api/day-meta', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_date: logDate, ...body }),
      });
      ok = res.ok;
    } catch {
      ok = false;
    }
    if (!ok) setError('Couldn’t save — try again');
    startTransition(() => router.refresh());
    return ok;
  }

  // Inline editor: explicit Okay / cancel (and Enter) instead of blur-to-save.
  async function okNote() {
    if (noteText !== initialNote) {
      setBusy(true);
      const ok = await put({ note: noteText });
      setBusy(false);
      setSaved(ok);
      if (!ok) return; // keep editing so the text isn't lost
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

  const hasNote = initialNote.trim() !== '';
  const editing = panel === 'note';
  const declaring = panel === 'tregua';
  const noteLoud = !tregua && required && noteText.trim() === '';
  // A still-empty required note nags as an open editor; once filled it collapses
  // and the note lives on hover. Editing always wins over the nag.
  const mustNag = !tregua && !editing && required && !hasNote;

  return (
    <section
      className={`card group relative ${
        tregua
          ? 'border-tregua bg-tregua-dim'
          : noteLoud
            ? 'animate-pulsebad border-bad bg-bad-dim'
            : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-xs font-semibold uppercase tracking-widest ${
            tregua ? 'text-tregua' : noteLoud ? 'text-bad' : 'text-sub'
          }`}
        >
          {tregua
            ? '🟣 Tregua day'
            : noteLoud
              ? '⚠ Incomplete day — add a note (required)'
              : 'Day note'}
          {hasNote && !editing && !declaring && <span className="ml-1.5 text-[11px]">📝</span>}
        </span>
        <div className="flex items-center gap-2">
          {busy ? (
            <span className="text-[10px] text-sub">saving…</span>
          ) : saved ? (
            <span className="text-[10px] text-good">saved ✓</span>
          ) : null}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="More options"
              className="px-1.5 leading-none text-sub transition-colors hover:text-ink"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-edge bg-card p-1 shadow-lg">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setPanel('note');
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-well"
                >
                  {tregua ? '✎ Edit reason' : hasNote ? '✎ Edit note' : '＋ Add a note'}
                </button>
                {tregua ? (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      undoTregua();
                    }}
                    disabled={busy}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-tregua transition-colors hover:bg-well disabled:opacity-40"
                  >
                    🟣 Undo Tregua day
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setTreguaText('');
                      setPanel('tregua');
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-tregua transition-colors hover:bg-well"
                  >
                    🟣 Declare Tregua day
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* note / Tregua reason revealed on hover */}
      {hasNote && !menuOpen && !editing && !declaring && (
        <div className="pointer-events-none absolute bottom-full left-4 z-30 mb-1 hidden w-max max-w-[320px] rounded-lg border border-edge bg-card px-3 py-2 shadow-xl group-hover:block">
          <div className="text-[10px] font-bold uppercase tracking-wide text-sub">
            {tregua ? 'Tregua' : 'Note'}
          </div>
          <div className="mt-1 whitespace-pre-wrap text-xs text-ink/90">{initialNote}</div>
        </div>
      )}

      {/* inline editors (live in this same card) */}
      {declaring ? (
        <div className="mt-2">
          <textarea
            autoFocus
            value={treguaText}
            onChange={(e) => setTreguaText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                declareTregua();
              }
            }}
            rows={2}
            placeholder="Why was the whole day impossible? (external forces)"
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-sub/60"
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
      ) : editing || mustNag ? (
        <div className="mt-2">
          <textarea
            autoFocus={editing}
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
            onBlur={editing ? undefined : okNote}
            rows={2}
            placeholder="A line of context for this day, so future-you remembers…"
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-sub/60"
          />
          {editing && (
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
          )}
        </div>
      ) : null}

      {error && <p className="mt-1 text-[10px] font-semibold text-bad">{error}</p>}
    </section>
  );
}
