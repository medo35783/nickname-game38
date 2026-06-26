import {
  BRAND_LOGO_HEADER_SRC,
  BRAND_LOGO_HEADER_DARK_SRC,
  PLATFORM_NAME,
  PLATFORM_NAME_EN,
  PLATFORM_SITE_HOST,
} from '../core/constants';

const logoCache = new Map();

function resolveSrc(src) {
  if (typeof window === 'undefined') return src;
  try {
    return new URL(src, window.location.origin).href;
  } catch {
    return src;
  }
}

/** مسار شعار المنصة في التقارير — فاتح للخلفيات البيضاء، داكن للخلفيات الداكنة */
export function getReportBrandLogoSrc(theme = 'dark') {
  return theme === 'light' ? BRAND_LOGO_HEADER_SRC : BRAND_LOGO_HEADER_DARK_SRC;
}

export function loadReportBrandImage(theme = 'dark') {
  const src = resolveSrc(getReportBrandLogoSrc(theme));
  if (!logoCache.has(src)) {
    logoCache.set(
      src,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('brand logo load failed'));
        img.src = src;
      })
    );
  }
  return logoCache.get(src);
}

/**
 * يرسم شعار لعيب زون على canvas تقرير/مشاركة.
 * @returns {{ width: number, height: number, bottom: number }}
 */
export async function drawReportBrandLogo(
  ctx,
  { centerX, y = 44, maxWidth = 400, maxHeight = 64, theme = 'dark' } = {}
) {
  try {
    const img = await loadReportBrandImage(theme);
    const scale = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight, 1);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, centerX - w / 2, y, w, h);
    return { width: w, height: h, bottom: y + h };
  } catch {
    ctx.textAlign = 'center';
    ctx.fillStyle = theme === 'dark' ? 'rgba(255,255,255,0.6)' : '#5c5678';
    ctx.font = '700 22px Cairo, Tajawal, sans-serif';
    ctx.fillText(`${PLATFORM_NAME} — ${PLATFORM_NAME_EN}`, centerX, y + 36);
    return { width: maxWidth, height: 44, bottom: y + 44 };
  }
}

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** شعار HTML للتقارير المطبوعة */
export function reportPlatformLogoHtml({ theme = 'light', maxHeight = 40 } = {}) {
  const src = esc(getReportBrandLogoSrc(theme));
  const alt = esc(`${PLATFORM_NAME} — ${PLATFORM_NAME_EN}`);
  return `<img class="report-platform-logo" src="${src}" alt="${alt}" height="${maxHeight}" style="display:block;height:${maxHeight}px;width:auto;max-width:min(300px,70vw);object-fit:contain" draggable="false"/>`;
}

export function reportPlatformFooterLabel(gameName = '') {
  return [gameName, PLATFORM_NAME].filter(Boolean).join(' · ');
}

export function reportSiteHost() {
  return PLATFORM_SITE_HOST;
}
