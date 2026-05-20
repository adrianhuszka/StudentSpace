import { access, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const targetFiles = [
  path.join(projectRoot, 'node_modules', '@angular', 'ssr', 'fesm2022', 'ssr.mjs'),
  path.join(projectRoot, 'node_modules', '@angular', 'ssr', 'node', 'src', 'app-engine.js'),
];

const patchMarker = '/* StudentSpace SSR patch marker */';
const originalSnippet = '...this.manifest.allowedHosts';
const patchedSnippet =
  '...(Array.isArray(this.manifest.allowedHosts) ? this.manifest.allowedHosts : [])';

async function fileExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  for (const targetFile of targetFiles) {
    const exists = await fileExists(targetFile);
    if (!exists) {
      continue;
    }

    const original = await readFile(targetFile, 'utf8');
    if (original.includes(patchMarker) || original.includes(patchedSnippet)) {
      console.log(
        `[postinstall] Angular SSR patch already applied: ${path.relative(projectRoot, targetFile)}`,
      );
      return;
    }

    if (!original.includes(originalSnippet)) {
      console.log(
        `[postinstall] Angular SSR target found but snippet missing: ${path.relative(projectRoot, targetFile)}`,
      );
      return;
    }

    const patchedBody = original.replaceAll(originalSnippet, patchedSnippet);
    const patched = `${patchMarker}\n${patchedBody}`;
    await writeFile(targetFile, patched, 'utf8');
    console.log(
      `[postinstall] Angular SSR patch applied: ${path.relative(projectRoot, targetFile)}`,
    );
    return;
  }

  console.log('[postinstall] Angular SSR target file not found, skipping patch.');
}

main().catch((error) => {
  console.error('[postinstall] Angular SSR patch failed:', error);
  process.exit(1);
});
