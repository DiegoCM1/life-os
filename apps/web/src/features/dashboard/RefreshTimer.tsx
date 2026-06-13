'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Ambient kiosk refresh: re-runs the server render every 90s (brief: 60–120s
// polling, no websockets). Server components refetch; client state is kept.
export default function RefreshTimer() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 90_000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
