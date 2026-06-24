import sharp from 'sharp';
import path from 'node:path';

const brandDir = path.resolve('public/brand');
const verticalSource = path.join(brandDir, 'la3ibz-logo-vertical-source.png');

function stripCheckerboard(data, width, height) {
  const out = Buffer.from(data);

  const isBg = (r, g, b) => {
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    if (maxDiff > 14) return false;
    const avg = (r + g + b) / 3;
    return avg >= 188 && avg <= 255;
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = out[i];
      const g = out[i + 1];
      const b = out[i + 2];

      if (!isBg(r, g, b)) continue;

      const dist = Math.hypot(x - width * 0.5, y - height * 0.34);
      const inner = dist < Math.min(width, height) * 0.34;
      if (inner && r > 248 && g > 248 && b > 248) continue;

      out[i + 3] = 0;
    }
  }

  return out;
}

const { data, info } = await sharp(verticalSource).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const cleaned = stripCheckerboard(data, width, height);
const iconHeight = Math.round(height * 0.56);

const iconBuffer = await sharp(cleaned, { raw: { width, height, channels: 4 } })
  .extract({ left: 0, top: 0, width, height: iconHeight })
  .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

await sharp(iconBuffer).toFile(path.join(brandDir, 'la3ibz-icon-mark.png'));
await sharp(iconBuffer).resize(192, 192).toFile(path.join(brandDir, 'la3ibz-favicon.png'));

await sharp(cleaned, { raw: { width, height, channels: 4 } })
  .resize(640, null, { fit: 'inside' })
  .png()
  .toFile(path.join(brandDir, 'la3ibz-logo-vertical.png'));

console.log('Brand transparency fixed', { width, height, iconHeight });
