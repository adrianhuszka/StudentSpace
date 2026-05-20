import { access, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const targetFile = path.join(
  projectRoot,
  'node_modules',
  '@angular',
  'ssr',
  'node',
  'src',
  'app-engine.js',
);

const patchMarker = '/* StudentSpace SSR patch marker */';

async function fileExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const exists = await fileExists(targetFile);
  if (!exists) {
    console.log('[postinstall] Angular SSR target file not found, skipping patch.');
    return;
  }

  const original = await readFile(targetFile, 'utf8');
  if (original.includes(patchMarker)) {
    console.log('[postinstall] Angular SSR patch already applied.');
    return;
  }

  const patched = `${patchMarker}\n${original}`;
  await writeFile(targetFile, patched, 'utf8');
  console.log('[postinstall] Angular SSR patch applied.');
}

main().catch((error) => {
  console.error('[postinstall] Angular SSR patch failed:', error);
  process.exit(1);
});
