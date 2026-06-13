'use client';

import { useEffect, useState } from 'react';

// Types `text` out one character at a time, re-typing whenever `text` changes.
// Cheap: a single short string revealed on a ~35ms timer, then idle. Used only
// in the victory state, so it never runs during normal dashboard operation.
export default function Typewriter({ text, speed = 35 }: { text: string; speed?: number }) {
  const [shown, setShown] = useState('');

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i)); // async (in callback) — safe
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  // While `text` is mid-change, `shown` may hold the previous line; only render
  // it when it's still a prefix of the current text (avoids a stale flash).
  const display = text.startsWith(shown) ? shown : '';
  const done = display === text && text.length > 0;

  return (
    <span suppressHydrationWarning>
      {display}
      <span className={`text-good ${done ? 'animate-blink' : ''}`}>▌</span>
    </span>
  );
}
