import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const brandDir = path.join(root, 'public', 'brand');
const sourcesDir = path.join(root, 'brand-sources');
const source = path.join(sourcesDir, 'la3ibz-source.png');

const meta = await sharp(source).metadata();
const { width = 0, height = 0 } = meta;

const iconTop = Math.round(height * 0.06);
const iconHeight = Math.round(height * 0.52);
const iconLeft = Math.round(width * 0.14);
const iconWidth = Math.round(width * 0.72);

const iconBuffer = await sharp(source)
  .extract({ left: iconLeft, top: iconTop, width: iconWidth, height: iconHeight })
  .trim({ threshold: 18 })
  .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

await sharp(iconBuffer).toFile(path.join(brandDir, 'la3ibz-icon-mark.png'));

console.log('Brand assets processed', { width, height });
