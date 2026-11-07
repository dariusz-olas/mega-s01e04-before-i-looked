import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

function tempRuns(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(join(dir, name), body);
  }
  return {
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir: dir,
  };
}

const sampleLine = (job: string, status: string, owner: string | null = 'rook') =>
  JSON.stringify({ at: '2026-10-28T23:00:00+01:00', job, status, owner });

describe('digest routes', () => {
  it('GET /digest/:night returns 200 with rows', async () => {
    const config = tempRuns({
      '2026-10-28.jsonl': `${sampleLine('a/job', 'ok')}\n${sampleLine('b/job', 'fail', 'lane-07')}\n`,
    });
    const res = await createApp(config).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('a/job');
    expect(html).toContain('b/job');
  });

  it('GET /digest/:night returns 404 when the night file is missing', async () => {
    const config = tempRuns({});
    const res = await createApp(config).request('/digest/2099-01-01');
    expect(res.status).toBe(404);
  });

  it('empty night renders "nothing ran"', async () => {
    const config = tempRuns({ '2026-10-01.jsonl': '' });
    const res = await createApp(config).request('/digest/2026-10-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
  });

  it('night with a bad line still renders', async () => {
    const config = tempRuns({
      '2026-10-02.jsonl': `${sampleLine('ok/job', 'ok')}\nnot-json\n`,
    });
    const res = await createApp(config).request('/digest/2026-10-02');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('ok/job');
    expect(html).toContain('bad lines: 1');
  });

  it('GET /api/digest/:night matches page job order', async () => {
    const config = tempRuns({
      '2026-10-28.jsonl': `${sampleLine('z/job', 'ok')}\n${sampleLine('a/job', 'retry')}\n`,
    });
    const app = createApp(config);
    const page = await (await app.request('/digest/2026-10-28')).text();
    const json = (await (await app.request('/api/digest/2026-10-28')).json()) as { job: string }[];
    expect(json.map((r) => r.job)).toEqual(['a/job', 'z/job']);
    const aPos = page.indexOf('a/job');
    const zPos = page.indexOf('z/job');
    expect(aPos).toBeGreaterThan(-1);
    expect(zPos).toBeGreaterThan(aPos);
  });

  it('API returns 404 for a missing night', async () => {
    const config = tempRuns({});
    const res = await createApp(config).request('/api/digest/2099-01-01');
    expect(res.status).toBe(404);
  });
});

describe('board digest links', () => {
  it('links both nights on disk to their digests with counts', async () => {
    const config = tempRuns({
      '2026-10-27.jsonl': `${sampleLine('a/job', 'ok')}\n`,
      '2026-10-28.jsonl': `${sampleLine('b/job', 'fail')}\n${sampleLine('c/job', 'ok')}\n`,
    });
    const html = await (await createApp(config).request('/')).text();
    expect(html).toContain('href="/digest/2026-10-27"');
    expect(html).toContain('href="/digest/2026-10-28"');
    expect(html).toContain('ok 1');
    expect(html).toContain('fail 1');
  });
});
