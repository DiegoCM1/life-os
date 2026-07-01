'use client';

// The reflection half of the weekly review, laid out in two columns to cut the
// scroll. Editable for the current week (textareas / a Yes-No toggle + a mock
// Save); read-only for past weeks (renders saved answers). MOCK: Save just
// flips a local flag — no persistence until the week_review table + PUT route
// exist. The `exercise` prompt is yes/no, so it renders as a toggle, not a box.

import { useState } from 'react';
import type { ReflectionPrompt } from '@/config/cycle';

const YES_NO_ID = 'exercise';

export default function WeekReviewForm({ prompts, initial, editable, week }: {
  prompts: ReflectionPrompt[];
  initial: Record<string, string>;
  editable: boolean;
  week: number;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(initial);
  const [saved, setSaved] = useState(false);

  const set = (id: string, v: string) => {
    setAnswers((a) => ({ ...a, [id]: v }));
    setSaved(false);
  };

  return (
    <section className="card flex flex-col gap-4">
      <h2 className="section-title">
        Reflection — Week {week}
        {editable && ' (this week)'}
      </h2>

      <div className="grid grid-cols-1 items-start gap-x-6 gap-y-5 md:grid-cols-2">
        {prompts.map((p) => (
          <div key={p.id} className="flex flex-col gap-1">
            <div className="text-sm font-semibold">{p.q}</div>
            {editable && p.hint && <div className="text-xs text-sub">{p.hint}</div>}

            {!editable ? (
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink/80">
                {initial[p.id]?.trim() || '—'}
              </p>
            ) : p.id === YES_NO_ID ? (
              <div className="mt-1 flex gap-2">
                {['Yes', 'No'].map((opt) => {
                  const active = answers[p.id] === opt;
                  const on =
                    opt === 'Yes'
                      ? 'border-good bg-good-dim text-good'
                      : 'border-bad bg-bad-dim text-bad';
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => set(p.id, opt)}
                      className={`rounded-lg border px-4 py-1.5 text-sm font-semibold transition-colors ${
                        active ? on : 'border-edge text-sub hover:border-sub'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                className="mt-1 min-h-[84px] rounded-lg border border-edge bg-well p-2 text-sm outline-none focus:border-accent"
                value={answers[p.id] ?? ''}
                onChange={(e) => set(p.id, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      {editable && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSaved(true)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
          >
            Save week
          </button>
          {saved && <span className="text-sm text-good">Saved (mock) ✓</span>}
        </div>
      )}
    </section>
  );
}
