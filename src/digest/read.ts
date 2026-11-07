import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, JobStatus, NightDigest, ReadNight } from './types.js';

const STATUSES = new Set<JobStatus>(['ok', 'retry', 'fail']);

function parseLine(line: string): {
  at: string;
  job: string;
  status: JobStatus;
  owner: string | null;
  error: string | null;
} | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const o = parsed as Record<string, unknown>;
  if (typeof o.at !== 'string' || typeof o.job !== 'string') return null;
  if (typeof o.status !== 'string' || !STATUSES.has(o.status as JobStatus)) return null;
  const owner = o.owner === null || o.owner === undefined ? null : typeof o.owner === 'string' ? o.owner : null;
  const error = typeof o.error === 'string' ? o.error : null;
  return { at: o.at, job: o.job, status: o.status as JobStatus, owner, error };
}

export const readNight: ReadNight = (runsDir, night) => {
  const path = join(runsDir, `${night}.jsonl`);
  if (!existsSync(path)) return null;

  const text = readFileSync(path, 'utf8');
  const lines = text.length === 0 ? [] : text.split(/\r?\n/).filter((l) => l.length > 0);

  const byJob = new Map<string, DigestRow>();
  let badLines = 0;

  for (const line of lines) {
    const ev = parseLine(line);
    if (!ev) {
      badLines += 1;
      continue;
    }
    const existing = byJob.get(ev.job);
    if (!existing) {
      byJob.set(ev.job, {
        job: ev.job,
        owner: ev.owner,
        runs: 1,
        retries: ev.status === 'retry' ? 1 : 0,
        lastStatus: ev.status,
        lastError: ev.error,
        firstAt: ev.at,
        lastAt: ev.at,
      });
      continue;
    }
    existing.runs += 1;
    if (ev.status === 'retry') existing.retries += 1;
    existing.lastStatus = ev.status;
    existing.lastError = ev.error;
    existing.lastAt = ev.at;
    existing.owner = ev.owner;
  }

  const rows = [...byJob.values()].sort((a, b) => a.job.localeCompare(b.job));
  return { night, rows, badLines };
};

export function nightCounts(digest: NightDigest): { ok: number; retry: number; fail: number } {
  let ok = 0;
  let retry = 0;
  let fail = 0;
  for (const row of digest.rows) {
    if (row.lastStatus === 'ok') ok += 1;
    else if (row.lastStatus === 'retry') retry += 1;
    else fail += 1;
  }
  return { ok, retry, fail };
}
