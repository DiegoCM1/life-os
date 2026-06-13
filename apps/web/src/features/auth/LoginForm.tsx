'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) router.replace('/');
    else setError(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form onSubmit={submit} className="card flex w-[min(320px,90vw)] flex-col gap-4 text-center">
        <h1 className="text-2xl font-bold">Life Dashboard</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(false); }}
          placeholder="Password"
          autoFocus
          className="rounded-xl border border-edge bg-well px-4 py-3 text-ink outline-none focus:border-accent"
        />
        {error && <p className="text-sm text-bad">Wrong password</p>}
        <button type="submit" className="rounded-xl bg-accent py-3 font-semibold">
          Enter
        </button>
      </form>
    </main>
  );
}
