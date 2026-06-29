/**
 * شهادة جائزة الجولة — تصميم فاخر A4 للطباعة / PDF
 */
import {
  PLATFORM_NAME,
  PLATFORM_NAME_EN,
  PLATFORM_SITE_URL,
  SUPPORT_EMAIL,
  SUPPORT_WHATSAPP,
} from './constants';
import { LEGAL_ORG_SUBTITLE, LEGAL_CR_NUMBER, LEGAL_ADDRESS } from './legalContent';
import { reportPlatformLogoHtml } from '../shared/reportBrandAssets';

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function gameLabel(type) {
  if (type === 'fameeri') return { icon: '🦅', label: 'القميري' };
  if (type === 'hesbah' || type === 'sniper') return { icon: '🎯', label: 'الحسبة' };
  if (type === 'titles') return { icon: '🎭', label: 'الألقاب' };
  return { icon: '🎮', label: type || '—' };
}

function certificateStyles() {
  return `
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Cairo', 'Tajawal', sans-serif;
      background: #ece8e0;
      color: #1a1228;
    }
    .print-bar {
      text-align: center;
      padding: 14px;
      background: linear-gradient(90deg, #2a1538, #4a1f3d);
    }
    .print-btn {
      background: linear-gradient(135deg, #c97f1a, #e8a832);
      color: #fff;
      border: none;
      padding: 12px 28px;
      border-radius: 10px;
      font-family: inherit;
      font-weight: 900;
      font-size: 14px;
      cursor: pointer;
      margin: 0 6px;
      box-shadow: 0 4px 16px rgba(201,127,26,.35);
    }
    .print-btn--ghost { background: rgba(255,255,255,.12); box-shadow: none; }
    .cert-outer {
      max-width: 720px;
      margin: 20px auto;
      padding: 10px;
      background: linear-gradient(145deg, #c97f1a, #8b1a3d, #2a1538);
      border-radius: 4px;
      box-shadow: 0 20px 60px rgba(26,18,40,.25);
    }
    .cert-inner {
      background: linear-gradient(180deg, #fffdf8 0%, #fff 40%, #fdf9f2 100%);
      border: 2px solid rgba(201,127,26,.45);
      padding: 0;
      position: relative;
      overflow: hidden;
    }
    .cert-inner::before,
    .cert-inner::after {
      content: '';
      position: absolute;
      width: 120px;
      height: 120px;
      border: 2px solid rgba(201,127,26,.2);
      border-radius: 50%;
      pointer-events: none;
    }
    .cert-inner::before { top: -40px; left: -40px; }
    .cert-inner::after { bottom: -40px; right: -40px; }
    .cert-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 28px 36px 20px;
      border-bottom: 2px double rgba(201,127,26,.5);
      background: linear-gradient(180deg, rgba(201,127,26,.06), transparent);
    }
    .cert-logo-col {
      flex: 1;
      text-align: center;
      min-width: 0;
    }
    .cert-logo-col img { max-height: 64px; max-width: 200px; object-fit: contain; }
    .cert-logo-col__name {
      font-size: 13px;
      font-weight: 900;
      color: #5c3d10;
      margin-top: 6px;
    }
    .cert-divider {
      width: 2px;
      height: 72px;
      background: linear-gradient(180deg, transparent, #c97f1a, transparent);
      flex-shrink: 0;
    }
    .cert-title-block {
      text-align: center;
      padding: 28px 36px 8px;
    }
    .cert-ribbon {
      display: inline-block;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .12em;
      color: #8b1a3d;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .cert-title {
      font-size: 30px;
      font-weight: 900;
      margin: 0;
      background: linear-gradient(135deg, #8b1a3d, #c97f1a);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .cert-sub {
      font-size: 13px;
      color: #5c5678;
      line-height: 1.75;
      margin: 10px 36px 0;
      text-align: center;
    }
    .winner-plaque {
      margin: 28px 48px;
      padding: 28px 24px;
      text-align: center;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(201,127,26,.14), rgba(139,26,61,.08));
      border: 2px solid rgba(201,127,26,.4);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.8);
    }
    .winner-plaque__crown { font-size: 36px; line-height: 1; margin-bottom: 6px; }
    .winner-plaque__label {
      font-size: 12px;
      font-weight: 800;
      color: #7a6a50;
      letter-spacing: .06em;
    }
    .winner-plaque__name {
      font-size: 36px;
      font-weight: 900;
      color: #2a1538;
      margin: 8px 0 0;
      line-height: 1.2;
    }
    .prize-block {
      margin: 0 48px 28px;
      padding: 20px 24px;
      border-radius: 14px;
      background: linear-gradient(135deg, #fff9ee, #fff3d6);
      border: 2px dashed #c97f1a;
      text-align: center;
    }
    .prize-block__title {
      font-size: 14px;
      font-weight: 900;
      color: #8b5a10;
      margin-bottom: 8px;
    }
    .prize-block__offer { font-size: 13px; color: #5c5678; margin-bottom: 12px; line-height: 1.6; }
    .prize-block__code {
      display: inline-block;
      font-family: 'Courier New', monospace;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: .14em;
      color: #8b1a3d;
      padding: 10px 24px;
      background: #fff;
      border-radius: 10px;
      border: 2px solid #c97f1a;
    }
    .meta-table {
      margin: 0 48px 28px;
      width: calc(100% - 96px);
      border-collapse: collapse;
      font-size: 12px;
    }
    .meta-table th {
      text-align: right;
      padding: 10px 14px;
      background: rgba(42,21,56,.06);
      color: #5c3d10;
      font-weight: 900;
      width: 28%;
      border: 1px solid rgba(201,127,26,.2);
    }
    .meta-table td {
      padding: 10px 14px;
      border: 1px solid rgba(201,127,26,.15);
      font-weight: 700;
      color: #1a1228;
    }
    .cert-footer {
      padding: 20px 36px 28px;
      border-top: 2px double rgba(201,127,26,.35);
      font-size: 10px;
      color: #5c5678;
      line-height: 1.8;
      text-align: center;
      background: rgba(42,21,56,.03);
    }
    .cert-id {
      display: inline-block;
      margin-top: 8px;
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(201,127,26,.12);
      font-weight: 900;
      color: #8b5a10;
      font-size: 11px;
    }
    @media print {
      .print-bar { display: none; }
      body { background: #fff; }
      .cert-outer { margin: 0; box-shadow: none; padding: 0; }
    }
  `;
}

function buildCertificateHtml(award) {
  const g = gameLabel(award.gameType);
  const dateLabel = award.sessionTs
    ? new Date(award.sessionTs).toLocaleString('ar-SA', { dateStyle: 'full', timeStyle: 'short' })
    : '—';
  const certId = `PRZ-${String(award.id || Date.now()).slice(-8).toUpperCase()}`;
  const showPrize = Boolean(award.couponCode?.trim());

  const sponsorCol = award.sponsorName
    ? `<div class="cert-logo-col">
        <div class="cert-logo-col__name">برعاية</div>
        ${
          award.sponsorLogoUrl
            ? `<img src="${esc(award.sponsorLogoUrl)}" alt="${esc(award.sponsorName)}"/>`
            : `<div class="cert-logo-col__name" style="font-size:18px;margin-top:12px">${esc(award.sponsorName)}</div>`
        }
        ${award.sponsorTagline ? `<div style="font-size:10px;color:#7a6a50;margin-top:4px">${esc(award.sponsorTagline)}</div>` : ''}
      </div>`
    : `<div class="cert-logo-col"><div class="cert-logo-col__name">${esc(PLATFORM_NAME)}</div></div>`;

  const prizeBlock = showPrize
    ? `<div class="prize-block">
        <div class="prize-block__title">🎁 جائزة الراعي</div>
        ${award.prizeOffer ? `<div class="prize-block__offer">${esc(award.prizeOffer)}</div>` : ''}
        <div class="prize-block__code">${esc(award.couponCode)}</div>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <title>شهادة فوز — ${esc(award.winnerName)} — ${esc(PLATFORM_NAME)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&family=Tajawal:wght@500;700&display=swap" rel="stylesheet">
  <style>${certificateStyles()}</style>
</head>
<body>
  <div class="print-bar no-print">
    <button type="button" class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
    <button type="button" class="print-btn print-btn--ghost" onclick="window.close()">إغلاق</button>
  </div>
  <div class="cert-outer">
    <div class="cert-inner">
      <header class="cert-header">
        <div class="cert-logo-col">${reportPlatformLogoHtml({ theme: 'light', maxHeight: 64 })}</div>
        ${award.sponsorName ? '<div class="cert-divider"></div>' : ''}
        ${sponsorCol}
      </header>

      <div class="cert-title-block">
        <div class="cert-ribbon">وثيقة رسمية · ${esc(PLATFORM_NAME_EN)}</div>
        <h1 class="cert-title">🏆 شهادة فوز</h1>
        <p class="cert-sub">
          تُمنَح هذه الشهادة تقديراً للفوز في جلسة جماعية على منصة ${esc(PLATFORM_NAME)} —
          ${esc(g.icon)} ${esc(g.label)}
        </p>
      </div>

      <div class="winner-plaque">
        <div class="winner-plaque__crown">👑</div>
        <div class="winner-plaque__label">الفائز / الفائزة</div>
        <div class="winner-plaque__name">${esc(award.winnerName || '—')}</div>
      </div>

      ${prizeBlock}

      <table class="meta-table">
        <tr><th>اللعبة</th><td>${esc(g.icon)} ${esc(g.label)}</td></tr>
        <tr><th>الغرفة</th><td>${esc(award.roomCode)}</td></tr>
        <tr><th>التاريخ</th><td>${esc(dateLabel)}</td></tr>
        <tr><th>المشرف</th><td>${esc(award.adminName || '—')}</td></tr>
        <tr><th>المشاركون</th><td>${esc(award.playerCount)} متسابق · ${esc(award.totalRounds)} جولة</td></tr>
        ${
          award.participantLabels?.length
            ? `<tr><th>الحضور</th><td style="font-size:11px;line-height:1.6">${esc(award.participantLabels.join(' · '))}</td></tr>`
            : ''
        }
        ${award.notes ? `<tr><th>ملاحظات</th><td>${esc(award.notes)}</td></tr>` : ''}
      </table>

      <footer class="cert-footer">
        ${esc(LEGAL_ORG_SUBTITLE)} · ${esc(LEGAL_ADDRESS)} · س.ت ${esc(LEGAL_CR_NUMBER)}<br/>
        ${esc(PLATFORM_NAME)} — ${esc(PLATFORM_SITE_URL)}<br/>
        للتواصل: ${esc(SUPPORT_EMAIL)} · واتساب ${esc(SUPPORT_WHATSAPP)}
        <div class="cert-id">رقم الشهادة: ${esc(certId)}</div>
      </footer>
    </div>
  </div>
</body>
</html>`;
}

export function openPrizeCertificateReport(award) {
  if (!award?.winnerName?.trim()) return false;
  const html = buildCertificateHtml(award);
  const w = window.open('', '_blank', 'noopener,noreferrer,width=860,height=760');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
