/**
 * شهادة جائزة الجولة — PDF للراعي / الفائز
 */
import {
  PLATFORM_NAME,
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
  if (type === 'fameeri') return '🦅 القميري';
  if (type === 'hesbah' || type === 'sniper') return '🎯 الحسبة';
  if (type === 'titles') return '🎭 الألقاب';
  return type || '—';
}

function buildCertificateHtml(award) {
  const dateLabel = award.sessionTs
    ? new Date(award.sessionTs).toLocaleString('ar-SA', { dateStyle: 'full', timeStyle: 'short' })
    : '—';
  const sponsorLogo = award.sponsorLogoUrl
    ? `<img src="${esc(award.sponsorLogoUrl)}" alt="" style="max-height:72px;max-width:220px;object-fit:contain"/>`
    : '';

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <title>شهادة جائزة — ${esc(PLATFORM_NAME)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 16mm; }
    body { margin:0; font-family:'Cairo',sans-serif; background:#f4f2ee; color:#1a1630; }
    .page { max-width:720px; margin:24px auto; background:#fff; border:2px solid #c97f1a; border-radius:8px; overflow:hidden; }
    .head { padding:28px 32px 20px; border-bottom:3px double #c97f1a; background:linear-gradient(180deg,#fffdf9,#fff); }
    .title { text-align:center; padding:28px 32px 8px; font-size:26px; font-weight:900; color:#c97f1a; }
    .sub { text-align:center; font-size:13px; color:#5c5678; margin:0 32px 24px; line-height:1.7; }
    .winner-box { margin:0 32px 24px; padding:24px; border-radius:12px; background:linear-gradient(135deg,rgba(201,127,26,.12),rgba(37,111,168,.08)); border:1px solid rgba(201,127,26,.35); text-align:center; }
    .winner-name { font-size:32px; font-weight:900; margin:8px 0; }
    .meta { margin:0 32px 24px; font-size:12px; line-height:1.9; }
    .meta dt { font-weight:800; color:#7a6a50; }
    .meta dd { margin:0 0 10px; }
    .prize { margin:0 32px 24px; padding:16px; border-radius:10px; background:#fff9ee; border:1px solid #e8d4a8; font-size:14px; font-weight:800; text-align:center; }
    .foot { padding:20px 32px; font-size:10px; color:#5c5678; border-top:1px solid #e4dfd4; line-height:1.7; }
    .print-bar { text-align:center; padding:12px; background:#1a1630; }
    .print-btn { background:#c97f1a; color:#fff; border:none; padding:10px 24px; border-radius:8px; font-family:inherit; font-weight:800; cursor:pointer; margin:0 6px; }
    @media print { .print-bar { display:none; } }
  </style>
</head>
<body>
  <div class="print-bar">
    <button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
  </div>
  <div class="page">
    <header class="head">
      ${reportPlatformLogoHtml({ theme: 'light', maxHeight: 52 })}
      <div style="font-size:11px;color:#7a6a50;margin-top:10px">${esc(LEGAL_ORG_SUBTITLE)} · ${esc(LEGAL_ADDRESS)} · س.ت ${esc(LEGAL_CR_NUMBER)}</div>
    </header>
    <h1 class="title">🏆 شهادة جائزة الجولة</h1>
    <p class="sub">وثيقة رسمية تُثبت فوز المتسابق في جلسة جماعية على منصة ${esc(PLATFORM_NAME)}</p>
    ${award.sponsorName ? `<div style="text-align:center;margin-bottom:16px"><div style="font-size:11px;color:#7a6a50">برعاية</div><div style="font-size:18px;font-weight:900">${esc(award.sponsorName)}</div>${sponsorLogo}</div>` : ''}
    <div class="winner-box">
      <div style="font-size:12px;font-weight:800;color:#7a6a50">الفائز / الفائزة</div>
      <div class="winner-name">${esc(award.winnerName || '—')}</div>
    </div>
    ${award.prizeOffer ? `<div class="prize">🎁 ${esc(award.prizeOffer)}</div>` : ''}
    <dl class="meta">
      <dt>الجلسة</dt><dd>${gameLabel(award.gameType)} · غرفة ${esc(award.roomCode)} · ${esc(dateLabel)}</dd>
      <dt>المشرف</dt><dd>${esc(award.adminName)}</dd>
      <dt>المشاركون</dt><dd>${esc(award.playerCount)} متسابق · ${esc(award.totalRounds)} جولة</dd>
      ${award.participantLabels?.length ? `<dt>الحضور</dt><dd style="font-size:11px">${esc(award.participantLabels.join(' · '))}</dd>` : ''}
      ${award.notes ? `<dt>ملاحظات</dt><dd>${esc(award.notes)}</dd>` : ''}
    </dl>
    <footer class="foot">
      ${esc(PLATFORM_NAME)} — ${esc(PLATFORM_SITE_URL)}<br/>
      للتواصل: ${esc(SUPPORT_EMAIL)} · واتساب ${esc(SUPPORT_WHATSAPP)}<br/>
      رقم الشهادة: PRZ-${esc(award.id || Date.now())}
    </footer>
  </div>
</body>
</html>`;
}

export function openPrizeCertificateReport(award) {
  if (!award?.winnerName?.trim()) return false;
  const html = buildCertificateHtml(award);
  const w = window.open('', '_blank', 'noopener,noreferrer,width=800,height=720');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
