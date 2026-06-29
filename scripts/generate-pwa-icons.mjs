/**
 * أيقونات PWA احترافية — شعار L3B كامل على خلفية بيضاء نقية.
 * المصدر: la3ibz-icon-mark.png (شفافية — يُدمَج على أبيض #FFFFFF).
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const brandDir = path.join(root, 'public', 'brand')
const source = path.join(brandDir, 'la3ibz-icon-mark.png')

/** أبيض نقي — يطابق خلفية أيقونات أندرويد */
const BG = { r: 255, g: 255, b: 255, alpha: 1 }

let logoBase = null

async function getLogoBase() {
  if (logoBase) return logoBase
  logoBase = await sharp(source)
    .flatten({ background: BG })
    .png()
    .toBuffer()
  return logoBase
}

async function composeIcon(size, logoRatio) {
  const base = await getLogoBase()
  const logoSize = Math.round(size * logoRatio)
  const offset = Math.round((size - logoSize) / 2)

  const logo = await sharp(base)
    .resize(logoSize, logoSize, {
      kernel: sharp.kernel.lanczos3,
      fit: 'contain',
      background: BG,
    })
    .sharpen({ sigma: 0.35, m1: 0.5, m2: 0.25 })
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
  { file: 'la3ibz-pwa-192.png', size: 192, ratio: 0.92 },
  { file: 'la3ibz-pwa-512.png', size: 512, ratio: 0.92 },
  { file: 'la3ibz-pwa-maskable-192.png', size: 192, ratio: 0.72 },
  { file: 'la3ibz-pwa-maskable-512.png', size: 512, ratio: 0.72 },
]

for (const { file, size, ratio } of outputs) {
  const outPath = path.join(brandDir, file)
  await composeIcon(size, ratio).then((img) => img.toFile(outPath))
  console.log('Wrote', outPath)
}
