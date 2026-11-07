import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('aggregates runs/2026-10-28.jsonl into 5 jobs and counts 1 bad line', () => {
    const digest = readNight('runs', '2026-10-28');
    expect(digest).not.toBeNull();
    expect(digest!.badLines).toBe(1);
    expect(digest!.rows).toHaveLength(5);
    expect(digest!.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);

    const refresh = digest!.rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(refresh.retries).toBe(3);
    expect(refresh.lastStatus).toBe('ok');

    const backup = digest!.rows.find((r) => r.job === 'notes/backup')!;
    expect(backup.lastStatus).toBe('fail');
    expect(backup.lastError).toBe('quota exceeded');

    const render = digest!.rows.find((r) => r.job === 'digest/render')!;
    expect(render.owner).toBeNull();
  });

  it('returns null when the night file is missing', () => {
    expect(readNight('runs', '2099-01-01')).toBeNull();
  });
});
