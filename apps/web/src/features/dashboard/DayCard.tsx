'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

// The day-level card: a slim "Day note" card with an in-card ⋯ menu (Add a note
// / Declare Tregua day). Turns loud-red and forces a note when the day is
// incomplete and closed; turns purple when the whole day is a Tregua.
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

  async function put(body: Record<string, unknown>): Promise<Response> {
    const res = await fetch('/api/day-meta', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_date: logDate, ...body }),
    });
    startTransition(() => router.refresh());
    return res;
  }

  async function saveNote() {
    if (noteText === initialNote) return;
    setBusy(true);
    const res = await put({ note: noteText });
    setBusy(false);
    setSaved(res.ok);
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

  const noteLoud = !tregua && required && noteText.trim() === '';
  const showNote = !tregua && (required || initialNote.trim() !== '' || panel === 'note');

  return (
    <section
      className={`card ${
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
        </span>
        <div className="flex items-center gap-2">
          {busy ? (
            <span className="text-[10px] text-sub">saving…</span>
          ) : saved ? (
            <span className="text-[10px] text-good">saved ✓</span>
          ) : null}
          {tregua ? (
            <button onClick={undoTregua} disabled={busy} className="text-[10px] text-sub hover:text-ink">
              undo
            </button>
          ) : (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="More options"
                className="px-1.5 leading-none text-sub transition-colors hover:text-ink"
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
                    ＋ Add a note
                  </button>
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
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {tregua ? (
        initialNote ? <p className="mt-2 text-sm text-sub">{initialNote}</p> : null
      ) : panel === 'tregua' ? (
        <div className="mt-2">
          <textarea
            autoFocus
            value={treguaText}
            onChange={(e) => setTreguaText(e.target.value)}
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
      ) : showNote ? (
        <textarea
          autoFocus={panel === 'note' && initialNote.trim() === ''}
          value={noteText}
          onChange={(e) => {
            setNoteText(e.target.value);
            setSaved(false);
          }}
          onBlur={saveNote}
          rows={2}
          placeholder="A line of context for this day, so future-you remembers…"
          className="mt-2 w-full resize-none bg-transparent text-sm outline-none placeholder:text-sub/60"
        />
      ) : null}
    </section>
  );
}
