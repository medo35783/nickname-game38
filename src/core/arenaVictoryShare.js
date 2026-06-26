import { PLATFORM_NAME } from './constants';
import { drawReportBrandLogo, reportSiteHost } from '../shared/reportBrandAssets';

const CARD_W = 1080;
const CARD_H = 1350;

const GAME_LABELS = {
  titles: 'الألقاب',
  fameeri: 'القميري',
  hesbah: 'حَسْبة',
};

const TIER_COLORS = {
  bronze: ['#5c3d1e', '#cd7f32'],
  silver: ['#4a4a5a', '#c0c0d8'],
  gold: ['#5c4a10', '#d4920a'],
  legend: ['#3d1a2a', '#962438'],
};

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load('900 48px Cairo'),
      document.fonts.load('700 28px Cairo'),
      document.fonts.load('600 22px Cairo'),
    ]);
  } catch {
    /* ignore */
  }
}

/**
 * بطاقة مجد الساحة — للمشاركة بعد اللعبة
 */
export async function buildArenaVictoryCanvas({
  displayName = 'محارب الساحة',
  avatarIcon = '🎮',
  avatarFrame = 'bronze',
  tierLabel = 'برونزي',
  rank,
  arenaReward = 0,
  totalPoints = 0,
  winner,
  gameType,
  roomCode,
} = {}) {
  await ensureFonts();

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  const [c0, c1] = TIER_COLORS[avatarFrame] || TIER_COLORS.bronze;

  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, '#07071a');
  bg.addColorStop(0.5, c0);
  bg.addColorStop(1, '#0f0f22');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  ctx.strokeStyle = c1;
  ctx.lineWidth = 5;
  roundRect(ctx, 32, 32, CARD_W - 64, CARD_H - 64, 32);
  ctx.stroke();

  await drawReportBrandLogo(ctx, {
    centerX: CARD_W / 2,
    y: 52,
    maxWidth: 380,
    maxHeight: 56,
    theme: 'dark',
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#d4920a';
  ctx.font = '900 44px Cairo, Tajawal, sans-serif';
  ctx.fillText('🏟️ شارة الساحة', CARD_W / 2, 120);

  ctx.font = '900 120px Cairo, sans-serif';
  ctx.fillText(avatarIcon, CARD_W / 2, 300);

  ctx.fillStyle = '#fff';
  ctx.font = '900 52px Cairo, Tajawal, sans-serif';
  ctx.fillText(String(displayName).slice(0, 24), CARD_W / 2, 400);

  ctx.fillStyle = 'rgba(232,224,255,0.85)';
  ctx.font = '700 28px Cairo, Tajawal, sans-serif';
  ctx.fillText(`${tierLabel} · ${totalPoints.toLocaleString('ar-SA')} نقطة`, CARD_W / 2, 460);

  roundRect(ctx, 80, 520, CARD_W - 160, 340, 24);
  ctx.fillStyle = 'rgba(15,15,34,0.75)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(201,127,26,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const gameLabel = GAME_LABELS[gameType] || 'ساحة الألعاب';
  ctx.fillStyle = '#e8e0ff';
  ctx.font = '700 32px Cairo, Tajawal, sans-serif';
  ctx.fillText(gameLabel, CARD_W / 2, 590);

  if (rank != null) {
    ctx.fillStyle = '#d4920a';
    ctx.font = '900 72px Cairo, Tajawal, sans-serif';
    ctx.fillText(`المركز ${rank}`, CARD_W / 2, 680);
  }

  if (arenaReward > 0) {
    ctx.fillStyle = '#248f55';
    ctx.font = '800 40px Cairo, Tajawal, sans-serif';
    ctx.fillText(`+${arenaReward} نقطة ساحة`, CARD_W / 2, 760);
  }

  if (winner) {
    ctx.fillStyle = 'rgba(122,116,160,0.95)';
    ctx.font = '600 26px Cairo, Tajawal, sans-serif';
    ctx.fillText(`🏆 الفائز: ${String(winner).slice(0, 36)}`, CARD_W / 2, 920);
  }

  const meta = [roomCode && `غرفة ${roomCode}`, PLATFORM_NAME].filter(Boolean).join('  ·  ');
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '600 20px Cairo, Tajawal, sans-serif';
  ctx.fillText(meta, CARD_W / 2, CARD_H - 100);

  ctx.font = '600 16px Cairo, Tajawal, sans-serif';
  ctx.fillText(reportSiteHost(), CARD_W / 2, CARD_H - 64);

  return canvas;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadArenaVictoryImage(opts) {
  const canvas = await buildArenaVictoryCanvas(opts);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1));
  if (!blob) throw new Error('export failed');
  downloadBlob(blob, `arena-${opts.roomCode || 'glory'}.png`);
  return true;
}

export async function shareArenaVictoryImage(opts) {
  const canvas = await buildArenaVictoryCanvas(opts);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1));
  if (!blob) throw new Error('export failed');

  const text = [
    '🏟️ شارة الساحة',
    opts.displayName,
    opts.rank != null ? `المركز ${opts.rank}` : '',
    opts.arenaReward > 0 ? `+${opts.arenaReward} نقطة` : '',
    opts.winner ? `🏆 ${opts.winner}` : '',
    PLATFORM_NAME,
  ]
    .filter(Boolean)
    .join('\n');

  const file = new File([blob], `arena-${opts.roomCode || 'glory'}.png`, { type: 'image/png' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title: 'شارة الساحة — مجدي', text, files: [file] });
    return 'share';
  }

  downloadBlob(blob, file.name);
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n\n📎 أرفق بطاقة المجد من معرض الصور`)}`;
  window.open(wa, '_blank', 'noopener,noreferrer');
  return 'whatsapp';
}
