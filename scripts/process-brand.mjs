import sharp from 'sharp';
import path from 'node:path';

const brandDir = path.resolve('public/brand');
const source = path.join(brandDir, 'la3ibz-source.png');
const wordmarkSource = path.join(brandDir, 'la3ibz-wordmark-en-source.png');

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
await sharp(iconBuffer).resize(192, 192).toFile(path.join(brandDir, 'la3ibz-favicon.png'));

const iconMeta = await sharp(iconBuffer).metadata();
const iw = iconMeta.width ?? 512;
const ih = iconMeta.height ?? 512;
const threeSize = Math.min(Math.round(iw * 0.42), iw, ih);
const threeLeft = Math.round((iw - threeSize) * 0.42);
const threeTop = Math.round((ih - threeSize) * 0.08);

await sharp(iconBuffer)
  .extract({ left: threeLeft, top: threeTop, width: threeSize, height: threeSize })
  .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(path.join(brandDir, 'la3ibz-three-mark.png'));

const fullTop = Math.round(height * 0.04);
const fullHeight = Math.round(height * 0.9);
await sharp(source)
  .extract({
    left: Math.round(width * 0.08),
    top: fullTop,
    width: Math.round(width * 0.84),
    height: fullHeight,
  })
  .trim({ threshold: 18 })
  .resize(1024, 1024, { fit: 'inside', withoutEnlargement: false })
  .png()
  .toFile(path.join(brandDir, 'la3ibz-logo-full.png'));

await sharp(wordmarkSource)
  .trim({ threshold: 24 })
  .resize(720, null, { fit: 'inside' })
  .png()
  .toFile(path.join(brandDir, 'la3ibz-wordmark-en.png'));

console.log('Brand assets processed', { width, height, iw, ih, threeLeft, threeTop, threeSize });
