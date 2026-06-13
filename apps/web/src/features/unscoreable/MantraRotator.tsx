'use client';

import { useEffect, useState } from 'react';
import { MANTRAS } from '@/config/goals';

export default function MantraRotator() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % MANTRAS.length), 45_000);
    return () => clearInterval(id);
  }, []);
  return <p className="italic text-sub">“{MANTRAS[index]}”</p>;
}
