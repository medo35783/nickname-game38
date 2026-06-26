/**
 * يولّد أيقونة PWA 192 من نفس مصدر شعار الموقع (la3ibz-icon-mark.png).
 * 512 يُستخدم الأصل مباشرة — نفس BRAND_ICON_SRC في الواجهة.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(root, 'public', 'brand', 'la3ibz-icon-mark.png')
const out192 = path.join(root, 'public', 'brand', 'la3ibz-pwa-192.png')

await sharp(source)
  .resize(192, 192, {
    kernel: sharp.kernel.lanczos3,
    fit: 'contain',
    background: { r: 238, g: 243, b: 249, alpha: 1 },
  })
  .png({ compressionLevel: 6, adaptiveFiltering: true })
  .toFile(out192)

console.log('Wrote', out192)
