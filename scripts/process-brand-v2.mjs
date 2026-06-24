import sharp from 'sharp';
import path from 'node:path';

const brandDir = path.resolve('public/brand');

const sources = {
  icon: path.join(brandDir, 'la3ibz-icon-source.png'),
  vertical: path.join(brandDir, 'la3ibz-logo-vertical-source.png'),
  header: path.join(brandDir, 'la3ibz-logo-header-source.png'),
};

function isNearWhite(r, g, b, threshold = 238) {
  return r >= threshold && g >= threshold && b >= threshold;
}

function stripWhiteBackground(data, width, height) {
  const out = Buffer.from(data);
  const visited = new Uint8Array(width * height);
  const queue = [];

  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    const i = idx * 4;
    if (!isNearWhite(out[i], out[i + 1], out[i + 2])) return;
    visited[idx] = 1;
    queue.push(idx);
  };

  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }

  while (queue.length) {
    const idx = queue.pop();
    const i = idx * 4;
    out[i + 3] = 0;
    const x = idx % width;
    const y = Math.floor(idx / width);
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }

  return out;
}

async function loadRgba(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function processImage(file, outFile, maxWidth) {
  const { data, width, height } = await loadRgba(file);
  const cleaned = stripWhiteBackground(data, width, height);
  await sharp(cleaned, { raw: { width, height, channels: 4 } })
    .resize(maxWidth, null, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toFile(outFile);
}

await processImage(sources.vertical, path.join(brandDir, 'la3ibz-logo-vertical.png'), 840);
await processImage(sources.header, path.join(brandDir, 'la3ibz-logo-header.png'), 920);

const { data, width, height } = await loadRgba(sources.icon);
const cleanedIcon = stripWhiteBackground(data, width, height);
const icon512 = await sharp(cleanedIcon, { raw: { width, height, channels: 4 } })
  .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

await sharp(icon512).toFile(path.join(brandDir, 'la3ibz-icon-mark.png'));
await sharp(icon512).resize(192, 192).toFile(path.join(brandDir, 'la3ibz-favicon.png'));
await sharp(icon512).resize(256, 256).toFile(path.join(brandDir, 'la3ibz-icon-footer.png'));

console.log('Brand assets updated (HQ sources)');
