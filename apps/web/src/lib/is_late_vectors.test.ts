import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { isLate } from '@/lib/time';

// Differential contract test: isLate (TS) and is_late (Python, apps/api) are
// hand-ported copies of the same rule, checked against the SAME golden file. If
// either drifts, its side goes red. Keep in sync with
// apps/api/tests/test_is_late_vectors.py.
type Vector = {
  name: string;
  log_date: string;
  done_at: string | null;
  hour: number | null;
  expected: boolean;
};

const here = dirname(fileURLToPath(import.meta.url));
const vectors: Vector[] = JSON.parse(
  readFileSync(resolve(here, '../../../../test-vectors/is_late.json'), 'utf8'),
);

describe('isLate golden vectors', () => {
  for (const c of vectors) {
    it(c.name, () => {
      expect(isLate(c.log_date, c.done_at, c.hour ?? undefined)).toBe(c.expected);
    });
  }
});
