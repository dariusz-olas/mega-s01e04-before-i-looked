import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

const night = process.argv[2] ?? '2026-10-28';
const out = process.argv[3] ?? join('preview', `digest-${night}.html`);

const config = loadConfig();
const res = await createApp(config).request(`/digest/${night}`);
if (!res.ok) {
  console.error(`save-preview: ${res.status} for /digest/${night}`);
  process.exit(1);
}
const html = await res.text();
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(pathToFileURL(out).href);
console.log(`wrote ${out} (${html.length} bytes)`);
