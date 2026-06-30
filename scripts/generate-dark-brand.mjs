import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const brandDir = path.join(root, 'public', 'brand');

/** يفتح البكسلات الداكنة (نص الشعار) للوضع الليلي */
function adaptForDarkTheme(data) {
  const out = Buffer.from(data);

  for (let i = 0; i < out.length; i += 4) {
    const a = out[i + 3];
    if (a < 10) continue;

    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));

    if (lum < 95) {
      const t = Math.min(1, (95 - lum) / 95);
      const targetR = 210;
      const targetG = 228;
      const targetB = 248;
      out[i] = Math.round(r + (targetR - r) * t * 0.92);
      out[i + 1] = Math.round(g + (targetG - g) * t * 0.92);
      out[i + 2] = Math.round(b + (targetB - b) * t * 0.95);
    } else if (lum < 140 && maxDiff < 40) {
      const t = Math.min(1, (140 - lum) / 140) * 0.35;
      out[i] = Math.round(r + (220 - r) * t);
      out[i + 1] = Math.round(g + (235 - g) * t);
      out[i + 2] = Math.round(b + (250 - b) * t);
    }
  }

  return out;
}

async function makeDarkVariant(input, output) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const adapted = adaptForDarkTheme(data);
  await sharp(adapted, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(output);
}

await makeDarkVariant(path.join(brandDir, 'la3ibz-logo-vertical.png'), path.join(brandDir, 'la3ibz-logo-vertical-dark.png'));
await makeDarkVariant(path.join(brandDir, 'la3ibz-logo-header.png'), path.join(brandDir, 'la3ibz-logo-header-dark.png'));
await makeDarkVariant(path.join(brandDir, 'la3ibz-icon-mark.png'), path.join(brandDir, 'la3ibz-icon-mark-dark.png'));

console.log('Dark brand assets generated');
