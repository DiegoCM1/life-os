'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Cursor, Input, Panel } from '@/components/ui';

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
    <main className="flex min-h-screen items-center justify-center p-5">
      <form onSubmit={submit} className="w-[min(360px,92vw)]">
        <Panel header="life-os // auth">
          <p className="mb-4 text-sm text-sub">
            <span className="text-accent text-glow">$</span> login --user diego
            <Cursor />
          </p>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-sub">
            password
          </label>
          <Input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            placeholder="••••••••"
            autoFocus
          />
          {error && (
            <p className="mt-2 text-sm text-bad text-glow-bad">✗ access denied — wrong password</p>
          )}
          <Button type="submit" variant="primary" className="mt-4 w-full py-3">
            Enter ▸
          </Button>
        </Panel>
      </form>
    </main>
  );
}
