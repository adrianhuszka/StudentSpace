import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const targetFile = resolve('node_modules/@angular/ssr/fesm2022/ssr.mjs');

if (!existsSync(targetFile)) {
  console.log('[patch-angular-ssr] Skipped: target file not found.');
  process.exit(0);
}

const source = readFileSync(targetFile, 'utf8');

if (source.includes('const manifestAllowedHosts = Array.isArray(this.manifest.allowedHosts)')) {
  console.log('[patch-angular-ssr] Already applied.');
  process.exit(0);
}

const search =
  'const allowedHosts = new Set([...(options?.allowedHosts ?? []), ...this.manifest.allowedHosts]);';
const replacement = [
  'const manifestAllowedHosts = Array.isArray(this.manifest.allowedHosts)',
  '            ? this.manifest.allowedHosts',
  '            : [];',
  '        const allowedHosts = new Set([...(options?.allowedHosts ?? []), ...manifestAllowedHosts]);',
].join('\n');

if (!source.includes(search)) {
  console.error('[patch-angular-ssr] Failed: expected code pattern was not found.');
  process.exit(1);
}

writeFileSync(targetFile, source.replace(search, replacement), 'utf8');
console.log('[patch-angular-ssr] Patch applied successfully.');
