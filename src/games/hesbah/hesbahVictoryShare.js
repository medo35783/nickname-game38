import { sortedHesbahPlayers, formatHesbahDateTime, HESBAH_BRAND } from './hesbahHelpers';

const CARD_W = 1080;
const CARD_H = 1440;

async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load('900 52px Cairo'),
      document.fonts.load('800 28px Cairo'),
      document.fonts.load('700 22px Cairo'),
      document.fonts.load('600 18px Cairo'),
    ]);
  } catch {
    /* fallback sans-serif */
  }
}

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

function truncate(text, max = 22) {
  const s = String(text || '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function drawBg(ctx) {
  const g = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  g.addColorStop(0, '#0a1628');
  g.addColorStop(0.45, '#121f38');
  g.addColorStop(1, '#1a0f08');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#e65100';
  ctx.beginPath();
  ctx.arc(CARD_W * 0.85, CARD_H * 0.12, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1565c0';
  ctx.beginPath();
  ctx.arc(CARD_W * 0.12, CARD_H * 0.88, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const frame = ctx.createLinearGradient(0, 0, CARD_W, 0);
  frame.addColorStop(0, '#ff8f00');
  frame.addColorStop(0.5, '#f9a825');
  frame.addColorStop(1, '#42a5f5');
  ctx.strokeStyle = frame;
  ctx.lineWidth = 6;
  roundRect(ctx, 28, 28, CARD_W - 56, CARD_H - 56, 28);
  ctx.stroke();
}

/**
 * بطاقة PNG عالية الدقة للمشاركة (واتساب / حفظ).
 */
export async function buildHesbahVictoryCanvas({
  players,
  roomCode,
  game,
  earlyEnd = false,
} = {}) {
  await ensureFonts();

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  const list = sortedHesbahPlayers(players);
  const winner = list[0];
  const top3 = list.slice(0, 3);
  const currentQ = game?.currentQ || 0;
  const totalQ = game?.totalQ || 0;

  drawBg(ctx);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '600 22px Cairo, Tajawal, sans-serif';
  ctx.fillText(HESBAH_BRAND.arena, CARD_W / 2, 88);

  ctx.fillStyle = '#ffab00';
  ctx.font = '900 56px Cairo, Tajawal, sans-serif';
  ctx.fillText(`${HESBAH_BRAND.emoji} ${HESBAH_BRAND.title}`, CARD_W / 2, 156);

  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = '600 20px Cairo, Tajawal, sans-serif';
  ctx.fillText(HESBAH_BRAND.tagline, CARD_W / 2, 192);

  if (earlyEnd) {
    ctx.fillStyle = 'rgba(230,81,0,0.22)';
    roundRect(ctx, CARD_W / 2 - 150, 210, 300, 40, 20);
    ctx.fill();
    ctx.fillStyle = '#ffb74d';
    ctx.font = '700 18px Cairo, Tajawal, sans-serif';
    ctx.fillText('إنهاء مبكر — تتويج', CARD_W / 2, 238);
  }

  ctx.font = '900 42px Cairo, Tajawal, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🏆 تتويج الفائز', CARD_W / 2, earlyEnd ? 300 : 268);

  if (winner) {
    const wg = ctx.createLinearGradient(CARD_W / 2 - 280, 320, CARD_W / 2 + 280, 480);
    wg.addColorStop(0, 'rgba(249,168,37,0.35)');
    wg.addColorStop(1, 'rgba(230,81,0,0.2)');
    ctx.fillStyle = wg;
    roundRect(ctx, 120, 330, CARD_W - 240, 150, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(249,168,37,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffd54f';
    ctx.font = '900 48px Cairo, Tajawal, sans-serif';
    ctx.fillText(`👑 ${truncate(winner.name, 18)}`, CARD_W / 2, 410);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 32px Cairo, Tajawal, sans-serif';
    ctx.fillText(`${winner.totalScore || 0} نقطة`, CARD_W / 2, 458);
  }

  const podiumY = 520;
  const slotW = (CARD_W - 200) / 3;
  const podiumOrder = [1, 0, 2];
  const medals = ['🥈', '🥇', '🥉'];
  const heights = [100, 130, 82];

  podiumOrder.forEach((idx, col) => {
    const p = top3[idx];
    if (!p) return;
    const x = 100 + col * slotW + slotW * 0.08;
    const w = slotW * 0.84;
    const barH = heights[idx];

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 28px Cairo, Tajawal, sans-serif';
    ctx.fillText(medals[idx], x + w / 2, podiumY);

    ctx.font = '700 22px Cairo, Tajawal, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(truncate(p.name, 14), x + w / 2, podiumY + 36);

    if (idx === 0) {
      const lg = ctx.createLinearGradient(x, podiumY + 50, x, podiumY + 50 + barH);
      lg.addColorStop(0, '#ffd54f');
      lg.addColorStop(1, '#e65100');
      ctx.fillStyle = lg;
    } else {
      ctx.fillStyle = idx === 1 ? 'rgba(192,192,192,0.4)' : 'rgba(205,127,50,0.4)';
    }
    roundRect(ctx, x, podiumY + 50, w, barH, 12);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = '900 26px Cairo, Tajawal, sans-serif';
    ctx.fillText(String(p.totalScore || 0), x + w / 2, podiumY + 50 + barH / 2 + 9);
  });

  let rowY = 720;
  ctx.textAlign = 'right';
  list.forEach((p, i) => {
    if (rowY > CARD_H - 200) return;
    const isWinner = i === 0;
    ctx.fillStyle = isWinner ? 'rgba(249,168,37,0.12)' : 'rgba(255,255,255,0.04)';
    roundRect(ctx, 80, rowY, CARD_W - 160, 52, 12);
    ctx.fill();

    ctx.fillStyle = isWinner ? '#ffd54f' : 'rgba(255,255,255,0.45)';
    ctx.font = '800 20px Cairo, Tajawal, sans-serif';
    ctx.fillText(String(i + 1), CARD_W - 110, rowY + 34);

    ctx.fillStyle = '#ffffff';
    ctx.font = isWinner ? '800 22px Cairo, Tajawal, sans-serif' : '700 20px Cairo, Tajawal, sans-serif';
    ctx.fillText(truncate(p.name, 20), CARD_W - 150, rowY + 34);

    ctx.textAlign = 'left';
    ctx.fillStyle = isWinner ? '#ffb74d' : 'rgba(255,255,255,0.85)';
    ctx.font = '800 22px Cairo, Tajawal, sans-serif';
    ctx.fillText(String(p.totalScore || 0), 110, rowY + 34);
    ctx.textAlign = 'right';

    rowY += 58;
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '600 18px Cairo, Tajawal, sans-serif';
  const roundLine =
    currentQ > 0 && totalQ > 0
      ? `جولة ${currentQ} من ${totalQ}${earlyEnd ? ' · إنهاء مبكر' : ''}`
      : '';
  ctx.fillText(
    [roomCode && `غرفة ${roomCode}`, roundLine, formatHesbahDateTime()].filter(Boolean).join('  ·  '),
    CARD_W / 2,
    CARD_H - 118
  );

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '600 16px Cairo, Tajawal, sans-serif';
  ctx.fillText('ساحة الألعاب — nickname-game38.vercel.app', CARD_W / 2, CARD_H - 82);

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

export async function downloadHesbahVictoryImage(opts) {
  const canvas = await buildHesbahVictoryCanvas(opts);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1));
  if (!blob) throw new Error('export failed');
  const code = opts.roomCode || 'hesbah';
  downloadBlob(blob, `hesbah-${code}-results.png`);
  return true;
}

export async function shareHesbahVictoryImage(opts) {
  const canvas = await buildHesbahVictoryCanvas(opts);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1));
  if (!blob) throw new Error('export failed');

  const code = opts.roomCode || '';
  const winner = sortedHesbahPlayers(opts.players)[0];
  const text = [
    `🏆 نتائج ${HESBAH_BRAND.title}`,
    winner ? `👑 ${winner.name} — ${winner.totalScore || 0} نقطة` : '',
    code ? `رمز الغرفة: ${code}` : '',
    'ساحة الألعاب',
  ]
    .filter(Boolean)
    .join('\n');

  const file = new File([blob], `hesbah-${code || 'win'}.png`, { type: 'image/png' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title: `${HESBAH_BRAND.title} — النتائج`, text, files: [file] });
    return 'share';
  }

  downloadBlob(blob, file.name);
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n\n📎 أرفق صورة النتائج من معرض الصور`)}`;
  window.open(wa, '_blank', 'noopener,noreferrer');
  return 'whatsapp';
}
