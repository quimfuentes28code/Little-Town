import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = resolve(root, 'dist');
const output = process.argv[2] ? resolve(process.argv[2]) : resolve(dist, 'Little-Town.html');
let html = await readFile(resolve(dist, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)];
const styles = [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*>/g)];
if (scripts.length !== 1 || styles.length !== 1) {
  throw new Error('Expected one bundled script and stylesheet. Run npm run build first.');
}
for (const match of scripts) {
  const code = await readFile(resolve(dist, match[1].replace(/^\//, '')), 'utf8');
  html = html.replace(match[0], () => `<script type="module">${code.replace(/<\/script/gi, '<\\/script')}</script>`);
}
for (const match of styles) {
  const href = match[0].match(/\bhref="([^"]+)"/)?.[1];
  if (!href) throw new Error('Bundled stylesheet has no href.');
  const css = await readFile(resolve(dist, href.replace(/^\//, '')), 'utf8');
  html = html.replace(match[0], () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`);
}
await writeFile(output, html);
console.log(`Standalone game: ${output}`);
