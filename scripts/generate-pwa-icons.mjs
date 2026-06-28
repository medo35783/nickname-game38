/**
 * يولّد أيقونات PWA بمنطقة أمان كافية — الشعار كامل وواضح على الشاشة الرئيسية.
 * المصدر: la3ibz-icon-source.png (خلفية بيضاء + الشعار كاملاً).
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const brandDir = path.join(root, 'public', 'brand')
const source = path.join(brandDir, 'la3ibz-icon-source.png')

/** يطابق theme_color في manifest */
const BG = { r: 238, g: 243, b: 249, alpha: 1 }

async function composeIcon(size, logoRatio) {
  const logoSize = Math.round(size * logoRatio)
  const offset = Math.round((size - logoSize) / 2)

  const logo = await sharp(source)
    .resize(logoSize, logoSize, {
      kernel: sharp.kernel.lanczos3,
      fit: 'contain',
      background: BG,
    })
    .png()
    .toBuffer()

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: logo, left: offset, top: offset }])
    .png({ compressionLevel: 6, adaptiveFiltering: true })
}

const outputs = [
  { file: 'la3ibz-pwa-192.png', size: 192, ratio: 0.82 },
  { file: 'la3ibz-pwa-512.png', size: 512, ratio: 0.82 },
  { file: 'la3ibz-pwa-maskable-192.png', size: 192, ratio: 0.58 },
  { file: 'la3ibz-pwa-maskable-512.png', size: 512, ratio: 0.58 },
]

for (const { file, size, ratio } of outputs) {
  const outPath = path.join(brandDir, file)
  await composeIcon(size, ratio).then((img) => img.toFile(outPath))
  console.log('Wrote', outPath)
}
