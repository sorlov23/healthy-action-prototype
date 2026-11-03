// Run with Sharp available: node scripts/build-fit74-icons.mjs
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';

const sharp = createRequire(import.meta.url)('sharp');

const root = new URL('../fit74/', import.meta.url);
const svg = await readFile(new URL('icon.svg', root));
await mkdir(new URL('icons/', root), { recursive: true });
for (const [path, size] of [
  ['apple-touch-icon.png', 180],
  ['icons/icon-192-v17.png', 192],
  ['icons/icon-512-v17.png', 512],
  ['icons/favicon-32-v17.png', 32],
]) {
  const output = new URL(path, root);
  await sharp(svg).resize(size, size).flatten({ background: '#252c31' }).png().toFile(output.pathname);
  const metadata = await sharp(output.pathname).metadata();
  if (metadata.width !== size || metadata.height !== size || metadata.hasAlpha) {
    throw new Error(`Invalid opaque icon: ${path}`);
  }
  console.log(`${path}: ${size}×${size}, opaque`);
}
