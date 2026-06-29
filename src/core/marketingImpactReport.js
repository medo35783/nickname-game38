/**
 * تقرير تأثير تسويقي رسمي — HTML للطباعة / حفظ PDF
 * يعتمد على أرقام sessionStats الحقيقية من Firebase
 */
import {
  PLATFORM_NAME,
  PLATFORM_NAME_EN,
  PLATFORM_SITE_URL,
  PLATFORM_SITE_HOST,
  PLATFORM_SLOGAN,
  SUPPORT_EMAIL,
  SUPPORT_WHATSAPP,
} from './constants';
import { LEGAL_ORG_SUBTITLE, LEGAL_CR_NUMBER, LEGAL_ADDRESS } from './legalContent';
import { SUBSCRIPTION_PLATFORM_FEATURES, SUBSCRIPTION_PACKAGES, getEffectivePrice } from './subscriptionPackages';
import { buildMarketingReportModel } from './marketingStatsHelpers';
import { reportPlatformLogoHtml } from '../shared/reportBrandAssets';

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const nf = (n) => new Intl.NumberFormat('ar-SA').format(Math.round(Number(n) || 0));

function reportStyles() {
  return `
    @page { size: A4; margin: 14mm 12mm 16mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Cairo', 'Tajawal', sans-serif;
      background: #f4f2ee;
      color: #1a1630;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .wrap { max-width: 820px; margin: 0 auto; }
    .page {
      background: #fff;
      border: 1px solid #e4dfd4;
      border-radius: 4px;
      padding: 0;
      margin-bottom: 18px;
      overflow: hidden;
      box-shadow: 0 2px 24px rgba(26,22,48,.06);
    }
    .letterhead {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      padding: 22px 28px 18px;
      border-bottom: 3px double #c97f1a;
      background: linear-gradient(180deg, #fffdf9 0%, #fff 100%);
    }
    .letterhead__brand { flex: 1; min-width: 0; }
    .letterhead__org {
      font-size: 11px;
      font-weight: 800;
      color: #7a6a50;
      margin-top: 8px;
      line-height: 1.5;
    }
    .letterhead__meta {
      text-align: left;
      font-size: 10px;
      color: #5c5678;
      line-height: 1.65;
      min-width: 168px;
    }
    .letterhead__meta strong { color: #1a1630; display: block; font-size: 11px; }
    .doc-title {
      margin: 0;
      padding: 20px 28px 6px;
      font-size: 22px;
      font-weight: 900;
      color: #1a1630;
      letter-spacing: -0.02em;
    }
    .doc-sub {
      margin: 0 28px 18px;
      font-size: 13px;
      color: #5c5678;
      font-weight: 700;
      line-height: 1.6;
    }
    .recipient-box {
      margin: 0 28px 20px;
      padding: 14px 16px;
      border-radius: 10px;
      border: 1px solid #e8e0d0;
      background: linear-gradient(135deg, #fffaf2, #fff);
    }
    .recipient-box__label {
      font-size: 10px;
      font-weight: 800;
      color: #9a7a40;
      text-transform: uppercase;
      letter-spacing: .04em;
      margin-bottom: 4px;
    }
    .recipient-box__name {
      font-size: 18px;
      font-weight: 900;
      color: #1a1630;
    }
    .recipient-box__type { font-size: 12px; color: #5c5678; margin-top: 4px; font-weight: 700; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      padding: 0 28px 22px;
    }
    .kpi {
      border-radius: 12px;
      padding: 14px 10px;
      text-align: center;
      border: 1px solid #ebe6dc;
      background: #faf8f5;
    }
    .kpi--gold { border-color: #e8d4a8; background: linear-gradient(160deg, #fff9ee, #fff); }
    .kpi--blue { border-color: #c5d9ee; background: linear-gradient(160deg, #f3f8fd, #fff); }
    .kpi--green { border-color: #b8e0c8; background: linear-gradient(160deg, #f0faf4, #fff); }
    .kpi--purple { border-color: #d4c8e8; background: linear-gradient(160deg, #f8f4fc, #fff); }
    .kpi__val {
      font-size: 22px;
      font-weight: 900;
      font-variant-numeric: tabular-nums;
      line-height: 1.1;
      color: #1a1630;
    }
    .kpi__lbl {
      font-size: 10px;
      font-weight: 800;
      color: #5c5678;
      margin-top: 6px;
      line-height: 1.35;
    }
    .sec {
      padding: 0 28px 22px;
    }
    .sec-title {
      font-size: 15px;
      font-weight: 900;
      color: #1a1630;
      margin: 0 0 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #f0ebe3;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sec-lead {
      font-size: 12px;
      color: #5c5678;
      line-height: 1.75;
      margin: 0 0 14px;
      font-weight: 600;
    }
    .games-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .game-card {
      border-radius: 14px;
      border: 1px solid #ebe6dc;
      overflow: hidden;
      background: #fff;
    }
    .game-card__head {
      padding: 12px 14px;
      font-weight: 900;
      font-size: 14px;
      border-bottom: 1px solid rgba(0,0,0,.06);
    }
    .game-card__tag {
      font-size: 10px;
      font-weight: 700;
      opacity: .85;
      margin-top: 4px;
      line-height: 1.4;
    }
    .game-card__body { padding: 10px 14px 14px; }
    .game-metric {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 11px;
      padding: 5px 0;
      border-bottom: 1px dashed #f0ebe3;
      font-weight: 700;
    }
    .game-metric:last-child { border-bottom: none; }
    .game-metric span:first-child { color: #5c5678; }
    .game-metric span:last-child { color: #1a1630; font-variant-numeric: tabular-nums; }
    table.data {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    table.data th, table.data td {
      padding: 9px 10px;
      text-align: right;
      border-bottom: 1px solid #ebe6dc;
    }
    table.data th {
      background: #faf8f5;
      color: #5c5678;
      font-weight: 800;
      font-size: 10px;
    }
    table.data td.num { font-weight: 900; font-variant-numeric: tabular-nums; }
    table.data tr:nth-child(even) td { background: #fdfcfa; }
    .totals-row td {
      background: #fff9ee !important;
      font-weight: 900;
      border-top: 2px solid #e8d4a8;
    }
    .note-box {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      background: #f8f6f2;
      border: 1px solid #ebe6dc;
      font-size: 11px;
      line-height: 1.7;
      color: #5c5678;
      font-weight: 600;
    }
    .note-box strong { color: #1a1630; }
    .method-list {
      margin: 0;
      padding: 0 18px 0 0;
      font-size: 11px;
      line-height: 1.75;
      color: #5c5678;
      font-weight: 600;
    }
    .method-list li { margin-bottom: 6px; }
    .features {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    .feat {
      font-size: 10px;
      font-weight: 800;
      padding: 6px 10px;
      border-radius: 999px;
      background: #f0f4f8;
      border: 1px solid #d8e4ef;
      color: #256fa8;
    }
    .custom-note {
      margin: 0 28px 20px;
      padding: 12px 14px;
      border-radius: 10px;
      border-right: 4px solid #c97f1a;
      background: #fffaf2;
      font-size: 12px;
      line-height: 1.7;
      font-weight: 600;
    }
    .foot {
      padding: 16px 28px 22px;
      border-top: 1px solid #ebe6dc;
      background: #faf8f5;
      font-size: 10px;
      color: #5c5678;
      line-height: 1.7;
      text-align: center;
      font-weight: 600;
    }
    .foot strong { color: #1a1630; }
    .print-bar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      justify-content: center;
      gap: 10px;
      padding: 12px;
      background: rgba(26,22,48,.92);
      backdrop-filter: blur(8px);
    }
    .print-btn {
      font-family: inherit;
      padding: 12px 24px;
      border-radius: 12px;
      border: none;
      background: linear-gradient(135deg, #d4920a, #b86a10);
      color: #1a1020;
      font-weight: 900;
      font-size: 14px;
      cursor: pointer;
    }
    .print-btn--ghost {
      background: rgba(255,255,255,.1);
      color: #fff;
      border: 1px solid rgba(255,255,255,.2);
    }
    @media print {
      body { background: #fff; }
      .page { box-shadow: none; border: none; margin: 0; page-break-inside: avoid; }
      .no-print { display: none !important; }
    }
    @media (max-width: 720px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .games-grid { grid-template-columns: 1fr; }
      .letterhead { flex-direction: column; }
      .letterhead__meta { text-align: right; }
    }
  `;
}

function renderKpi(label, value, tone = '') {
  return `<div class="kpi kpi--${tone}">
    <div class="kpi__val">${esc(value)}</div>
    <div class="kpi__lbl">${esc(label)}</div>
  </div>`;
}

function renderGameCard(game) {
  const completion =
    game.sessions > 0 ? `${Math.round((game.completed / game.sessions) * 100)}%` : '—';
  return `<article class="game-card">
    <div class="game-card__head" style="background:${esc(game.accent)};color:${esc(game.color)}">
      ${esc(game.icon)} ${esc(game.label)}
      <div class="game-card__tag">${esc(game.tagline)}</div>
    </div>
    <div class="game-card__body">
      <div class="game-metric"><span>جلسات</span><span>${nf(game.sessions)}</span></div>
      <div class="game-metric"><span>جلسات بجولات فعلية</span><span>${nf(game.realSessions)}</span></div>
      <div class="game-metric"><span>مشاركات المتسابقين</span><span>${nf(game.participants)}</span></div>
      <div class="game-metric"><span>ذروة حضور</span><span>${nf(game.peakPlayers)}</span></div>
      <div class="game-metric"><span>جولات مكتملة</span><span>${nf(game.rounds)}</span></div>
      <div class="game-metric"><span>ظهور رعاية</span><span>${nf(game.roundReach)}</span></div>
      <div class="game-metric"><span>دقائق التفاعل</span><span>${nf(game.engagementMinutes)}</span></div>
      <div class="game-metric"><span>معدل الإكمال</span><span>${completion}</span></div>
    </div>
  </article>`;
}

function renderRecentRows(recent) {
  if (!recent.length) {
    return '<tr><td colspan="10" style="text-align:center;color:#5c5678;padding:16px">لا توجد جلسات مسجّلة في الفترة الأخيرة</td></tr>';
  }
  return recent
    .map((s) => {
      const meta = { titles: '🎭 الألقاب', fameeri: '🦅 القميري', hesbah: '🎯 الحسبة' };
      const gk = s.gameType === 'sniper' ? 'hesbah' : s.gameType;
      const label = meta[gk] || esc(s.gameType);
      const rounds = Number(s.totalRounds) || 0;
      const players = Number(s.playerCount) || 0;
      const reach = Number(s.roundReach) || rounds * players;
      const engagement = Number(s.engagementMinutes) || players * (Number(s.durationMinutes) || 0);
      const date = s.ts
        ? new Date(s.ts).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })
        : '—';
      const names = Array.isArray(s.participantLabels) && s.participantLabels.length
        ? s.participantLabels.join(' · ')
        : `${nf(players)} متسابق`;
      return `<tr>
        <td>${label}</td>
        <td class="num">${esc(s.roomCode || '—')}</td>
        <td>${esc(s.adminName || '—')}</td>
        <td style="font-size:10px;line-height:1.5">${esc(names)}</td>
        <td class="num">${nf(rounds)}</td>
        <td class="num">${nf(players)}</td>
        <td class="num">${nf(reach)}</td>
        <td class="num">${nf(Math.round(engagement))}</td>
        <td>${s.completed ? '✅ مكتملة' : '⏸ مبكرة'}</td>
        <td style="white-space:nowrap;color:#5c5678">${esc(date)}</td>
      </tr>`;
    })
    .join('');
}

function renderSessionRosterRows(roster, purpose) {
  const list = Array.isArray(roster) ? roster : [];
  const filtered =
    purpose === 'prize' ? list.filter((s) => s.prizeReady) : list;
  if (!filtered.length) {
    const msg =
      purpose === 'prize'
        ? 'لا توجد جلسات مؤهلة للجوائز بعد (مطلوب: 5+ متسابقين، جولتان+، مكتملة)'
        : 'لا توجد جلسات مسجّلة بعد — ابدأ لعباً لتظهر الأسماء والأرقام';
    return `<tr><td colspan="8" style="text-align:center;color:#5c5678;padding:16px">${msg}</td></tr>`;
  }
  return filtered
    .map(
      (s) => `<tr>
        <td style="white-space:nowrap">${esc(s.dateLabel)}</td>
        <td>${esc(s.gameLabel)}${s.sponsorName ? `<br/><span style="font-size:9px;color:#7a5a10">🤝 ${esc(s.sponsorName)} · ${nf(s.sponsorImpressions || s.roundReach)} ظهور</span>` : ''}</td>
        <td class="num">${esc(s.roomCode)}</td>
        <td><strong>${esc(s.adminName)}</strong></td>
        <td style="font-size:10px;line-height:1.55">${esc(s.participantSummary)}</td>
        <td class="num">${nf(s.totalRounds)}</td>
        <td class="num">${nf(s.roundReach)}</td>
        <td>${s.prizeReady ? '🎁 مؤهلة' : s.completed ? '✅' : '⏸'}</td>
      </tr>`
    )
    .join('');
}

function renderUniqueParticipants(labels) {
  const list = Array.isArray(labels) ? labels.filter(Boolean) : [];
  if (!list.length) {
    return '<div class="note-box">لم تُسجَّل أسماء بعد — الجلسات القادمة ستظهر أسماء المشرفين والمتسابقين تلقائياً.</div>';
  }
  const chips = list
    .map((name) => `<span class="feat" style="background:#fff9ee;border-color:#e8d4a8;color:#7a5a10">${esc(name)}</span>`)
    .join('');
  return `<div class="features">${chips}</div>
    <div class="note-box" style="margin-top:10px"><strong>إجمالي أسماء فريدة:</strong> ${nf(list.length)} — قد يتكرر نفس الشخص في جلسات مختلفة.</div>`;
}

function purposeKpiGrid(model) {
  const m = model.metrics;
  const purpose = model.reportPurpose || 'full';
  if (purpose === 'sponsorship') {
    return [
      renderKpi('جولات قابلة للرعاية', nf(m.totalRounds), 'blue'),
      renderKpi('ظهور شعار الراعي', nf(m.roundReach), 'blue'),
      renderKpi('مشاركات المتسابقين', nf(m.totalParticipants), 'gold'),
      renderKpi('ذروة حضور', nf(m.peakPlayers), 'purple'),
      renderKpi('جلسات حقيقية', nf(m.totalRealSessions), 'gold'),
      renderKpi('دقائق تفاعل الجمهور', nf(m.totalEngagementMinutes), 'green'),
      renderKpi('متوسط جولات / جلسة', m.avgRoundsPerSession, 'blue'),
      renderKpi('معدل إكمال', `${m.completionRate}%`, 'green'),
    ].join('');
  }
  if (purpose === 'prize') {
    return [
      renderKpi('جلسات مؤهلة للجوائز', nf(model.prizeReadySessions?.length || m.couponReadySessions), 'gold'),
      renderKpi('مشاركات المتسابقين', nf(m.totalParticipants), 'gold'),
      renderKpi('أسماء فريدة مسجّلة', nf(model.uniqueParticipantCount), 'purple'),
      renderKpi('جلسات حقيقية', nf(m.totalRealSessions), 'gold'),
      renderKpi('دقائق تفاعل', nf(m.totalEngagementMinutes), 'green'),
      renderKpi('ذروة حضور', nf(m.peakPlayers), 'purple'),
      renderKpi('جولات مكتملة', nf(m.totalRounds), 'blue'),
      renderKpi('معدل إكمال', `${m.completionRate}%`, 'green'),
    ].join('');
  }
  if (purpose === 'pitch') {
    return [
      renderKpi('جلسات لعب حقيقية', nf(m.totalRealSessions), 'gold'),
      renderKpi('مشاركات المتسابقين', nf(m.totalParticipants), 'gold'),
      renderKpi('ذروة حضور', nf(m.peakPlayers), 'purple'),
      renderKpi('جولات قابلة للرعاية', nf(m.totalRounds), 'blue'),
      renderKpi('ظهورات محتملة', nf(m.roundReach), 'blue'),
      renderKpi('دقائق تفاعل', nf(m.totalEngagementMinutes), 'green'),
      renderKpi('معدل إكمال', `${m.completionRate}%`, 'green'),
      renderKpi('جلسات مؤهلة للجوائز', nf(model.prizeReadySessions?.length || m.couponReadySessions), 'gold'),
    ].join('');
  }
  return [
    renderKpi('جلسات لعب حقيقية', nf(m.totalRealSessions), 'gold'),
    renderKpi('مشاركات المتسابقين', nf(m.totalParticipants), 'gold'),
    renderKpi('ذروة حضور (جلسة واحدة)', nf(m.peakPlayers), 'purple'),
    renderKpi('متوسط الحضور / جلسة', m.avgPlayers, 'purple'),
    renderKpi('جولات قابلة للرعاية', nf(m.totalRounds), 'blue'),
    renderKpi('ظهور رعاية الجولات', nf(m.roundReach), 'blue'),
    renderKpi('دقائق تفاعل المتسابقين', nf(m.totalEngagementMinutes), 'green'),
    renderKpi('معدل إكمال الجلسات', `${m.completionRate}%`, 'green'),
  ].join('');
}

function renderGamesTotalsRow(games) {
  const t = games.reduce(
    (acc, g) => ({
      sessions: acc.sessions + g.sessions,
      participants: acc.participants + g.participants,
      rounds: acc.rounds + g.rounds,
      roundReach: acc.roundReach + g.roundReach,
      engagementMinutes: acc.engagementMinutes + g.engagementMinutes,
    }),
    { sessions: 0, participants: 0, rounds: 0, roundReach: 0, engagementMinutes: 0 }
  );
  return `<tr class="totals-row">
    <td><strong>المجموع الكلي</strong></td>
    <td class="num">${nf(t.sessions)}</td>
    <td class="num">${nf(t.participants)}</td>
    <td class="num">—</td>
    <td class="num">${nf(t.rounds)}</td>
    <td class="num">${nf(t.roundReach)}</td>
    <td class="num">${nf(Math.round(t.engagementMinutes))}</td>
  </tr>`;
}

function renderSponsorBlock(model) {
  if (model.reportPurpose === 'pitch') return '';
  const s = model.sponsorMeta;
  if (!s?.name) return '';
  const logo = s.logoUrl
    ? `<img src="${esc(s.logoUrl)}" alt="${esc(s.name)}" style="max-height:64px;max-width:200px;object-fit:contain"/>`
    : '';
  const prize =
    s.prizeOffer && (model.reportPurpose === 'prize' || model.reportPurpose === 'full')
      ? `<div class="note-box" style="margin-top:10px"><strong>🎁 الجائزة المرتبطة:</strong> ${esc(s.prizeOffer)}</div>`
      : '';
  return `<div class="recipient-box" style="margin-top:12px;border-color:#c97f1a">
        <div class="recipient-box__label">الراعي / الشريك</div>
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:8px">
          ${logo}
          <div>
            <div class="recipient-box__name">${esc(s.name)}</div>
            ${s.tagline ? `<div class="recipient-box__type">${esc(s.tagline)}</div>` : ''}
          </div>
        </div>
        ${prize}
      </div>`;
}

function renderPitchPackagesSection() {
  const rows = SUBSCRIPTION_PACKAGES.map((p) => {
    const price = getEffectivePrice(p);
    return `<tr>
      <td><strong>${esc(p.icon)} ${esc(p.name)}</strong><br/><span style="font-size:10px;color:#5c5678">${esc(p.durationSub)}</span></td>
      <td class="num">${nf(price)} ر.س</td>
      <td>${esc(p.titlesHighlight || '—')}</td>
    </tr>`;
  }).join('');
  return `<div class="sec">
    <h2 class="sec-title">💳 باقات الاستضافة (للمشرفين)</h2>
    <p class="sec-lead">أسعار العرض الحالية — للمرجع عند التفاوض على رعاية منفصلة.</p>
    <table class="data">
      <thead><tr><th>الباقة</th><th>السعر</th><th>ملاحظة</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function buildReportHtml(model) {
  const m = model.metrics;
  const purpose = model.reportPurpose || 'full';
  const purposeMeta = model.purposeMeta || {};
  const features = SUBSCRIPTION_PLATFORM_FEATURES.map((f) => `<span class="feat">✓ ${esc(f)}</span>`).join('');

  const codeInfo = model.codeMeta
    ? `<div class="note-box" style="margin:0 28px 18px">
        <strong>بيانات الاشتراك:</strong>
        الكود ${esc(model.codeLabel)} ·
        الباقة ${esc(model.codeMeta.duration || '—')} يوم ·
        الحالة ${esc(model.codeMeta.statusLabel || '—')}
        ${model.codeMeta.activatedAt ? ` · التفعيل ${esc(formatShort(model.codeMeta.activatedAt))}` : ''}
      </div>`
    : '';

  const recipientBlock = model.recipientName
    ? `<div class="recipient-box">
        <div class="recipient-box__label">موجّه إلى</div>
        <div class="recipient-box__name">${esc(model.recipientName)}</div>
        <div class="recipient-box__type">${esc(model.recipientTypeLabel)}</div>
      </div>`
    : '';

  const customNote = model.customNote
    ? `<div class="custom-note"><strong>ملاحظة:</strong> ${esc(model.customNote)}</div>`
    : '';

  const purposeBanner = `<div class="recipient-box" style="margin-top:0">
        <div class="recipient-box__label">نوع التقرير B2B</div>
        <div class="recipient-box__name">${esc(purposeMeta.label || 'تقرير شراكة')}</div>
        <div class="recipient-box__type">${esc(purposeMeta.subtitle || '')}</div>
      </div>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <title>${esc(`${purposeMeta.titleSuffix || 'تقرير'} — ${PLATFORM_NAME} — ${model.recipientName || model.scopeLabel}`)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&family=Tajawal:wght@500;700&display=swap" rel="stylesheet">
  <style>${reportStyles()}</style>
</head>
<body>
  <div class="print-bar no-print">
    <button type="button" class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
    <button type="button" class="print-btn print-btn--ghost" onclick="window.close()">إغلاق</button>
  </div>

  <div class="wrap">
    <section class="page">
      <header class="letterhead">
        <div class="letterhead__brand">
          ${reportPlatformLogoHtml({ theme: 'light', maxHeight: 56 })}
          <div class="letterhead__org">
            ${esc(LEGAL_ORG_SUBTITLE)} · ${esc(LEGAL_ADDRESS)} · س.ت ${esc(LEGAL_CR_NUMBER)}<br/>
            ${esc(PLATFORM_NAME)} — ${esc(PLATFORM_NAME_EN)} · ${esc(PLATFORM_SLOGAN)}
          </div>
        </div>
        <div class="letterhead__meta">
          <strong>تقرير رسمي</strong>
          رقم: ${esc(model.reportId)}<br/>
          تاريخ الإصدار: ${esc(model.generatedAtLabel)}<br/>
          النطاق: ${esc(model.scopeLabel)}<br/>
          الفترة: ${esc(model.periodStartLabel)} — ${esc(model.periodEndLabel)}
        </div>
      </header>

      <h1 class="doc-title">${esc(purposeMeta.docTitle || 'تقرير تأثير الفعاليات والتفاعل الجماعي')}</h1>
      <p class="doc-sub">
        وثيقة رسمية بتاريخ ووقت الإصدار — تعرض أرقاماً حقيقية مع أسماء المشرفين والمتسابقين
        من نظام تتبع جلسات ${esc(PLATFORM_NAME)}.
        ${purpose === 'sponsorship' ? 'مخصّصة لإقناع الراعي بقيمة ظهور شعاره في الجولات.' : ''}
        ${purpose === 'prize' ? 'مخصّصة لجهة تقدّم جائزة أو خصماً للفائزين — مع كشف الجلسات المؤهلة.' : ''}
        ${purpose === 'pitch' ? 'عرض أرقام المنصة الحقيقية لراعٍ محتمل — قبل توقيع العقد وبدون شعار شركة محددة.' : ''}
      </p>

      ${purposeBanner}
      ${renderSponsorBlock(model)}
      ${recipientBlock}
      ${codeInfo}
      ${customNote}

      <div class="kpi-grid">
        ${purposeKpiGrid(model)}
      </div>
      ${purpose === 'pitch' ? renderPitchPackagesSection() : ''}
    </section>

    <section class="page">
      <div class="sec">
        <h2 class="sec-title">👥 كشف المشرفين والمتسابقين</h2>
        <p class="sec-lead">
          سجل رسمي يوضح من أشرف على كل جلسة ومن شارك فعلياً — وليس أرقاماً مجردة.
          ${purpose === 'prize' ? 'يُبرز الجلسات المؤهلة لربط الجائزة أو الكوبون.' : ''}
        </p>
        <table class="data">
          <thead>
            <tr>
              <th>التاريخ والوقت</th><th>اللعبة</th><th>الغرفة</th><th>المشرف</th>
              <th>المتسابقون</th><th>جولات</th><th>ظهور رعاية</th><th>الحالة</th>
            </tr>
          </thead>
          <tbody>${renderSessionRosterRows(model.sessionRoster, purpose)}</tbody>
        </table>
      </div>

      <div class="sec">
        <h2 class="sec-title">📇 سجل الأسماء الفريدة</h2>
        <p class="sec-lead">جميع الأسماء/الألقاب المسجّلة عبر الجلسات — للتحقق من حجم الجمهور الحقيقي.</p>
        ${renderUniqueParticipants(model.uniqueParticipants)}
      </div>
    </section>

    <section class="page">
      <div class="sec">
        <h2 class="sec-title">🎮 تفصيل الأداء حسب اللعبة</h2>
        <p class="sec-lead">
          كل لعبة في ${esc(PLATFORM_NAME)} تُسجّل جلساتها بشكل مستقل. الأرقام أدناه مجمّعة من سجل الجلسات الفعلي
          وليست تقديرات.
        </p>
        <div class="games-grid">
          ${model.games.map(renderGameCard).join('')}
        </div>
      </div>

      <div class="sec">
        <h2 class="sec-title">📊 جدول مقارنة الألعاب</h2>
        <table class="data">
          <thead>
            <tr>
              <th>اللعبة</th>
              <th>جلسات</th>
              <th>مشاركات</th>
              <th>ذروة</th>
              <th>جولات</th>
              <th>ظهور رعاية</th>
              <th>دقائق تفاعل</th>
            </tr>
          </thead>
          <tbody>
            ${model.games
              .map(
                (g) => `<tr>
              <td>${esc(g.icon)} ${esc(g.label)}</td>
              <td class="num">${nf(g.sessions)}</td>
              <td class="num">${nf(g.participants)}</td>
              <td class="num">${nf(g.peakPlayers)}</td>
              <td class="num">${nf(g.rounds)}</td>
              <td class="num">${nf(g.roundReach)}</td>
              <td class="num">${nf(Math.round(g.engagementMinutes))}</td>
            </tr>`
              )
              .join('')}
            ${renderGamesTotalsRow(model.games)}
          </tbody>
        </table>
      </div>
    </section>

    <section class="page">
      <div class="sec">
        <h2 class="sec-title">🏢 قيمة الشراكة — B2B والرعاة والجوائز</h2>
        <table class="data">
          <thead>
            <tr><th>البند</th><th>الرقم</th><th>الاستخدام التسويقي</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>حزم المؤسسات (مدارس / شركات)</td>
              <td class="num">${nf(m.totalRealSessions)} جلسة · ${nf(m.totalParticipants)} مشاركة</td>
              <td>إثبات حجم الفعاليات المنفّذة فعلياً</td>
            </tr>
            <tr>
              <td>① رعاية الجولات — شعار الراعي في كل جولة</td>
              <td class="num">${nf(m.totalRounds)} جولة · ${nf(m.roundReach)} ظهور · ${nf(m.totalParticipants)} مشاركة</td>
              <td>كل جولة × متسابق = فرصة ظهور للعلامة — مع كشف الأسماء أعلاه</td>
            </tr>
            <tr>
              <td>② جائزة الجولة برعاية — كوبون/خصم للفائز</td>
              <td class="num">${nf(model.prizeReadySessions?.length || m.couponReadySessions)} جلسة مؤهلة · ${nf(model.uniqueParticipantCount)} اسم فريد</td>
              <td>جلسات مكتملة (5+ لاعبين، جولتان+) — مناسبة لربط الجائزة بالفائز</td>
            </tr>
            <tr>
              <td>مدة الاستخدام الفعلي</td>
              <td class="num">${nf(model.totalDurationMinutes)} دقيقة مشرف · ${nf(m.totalEngagementMinutes)} دقيقة متسابقين</td>
              <td>شفافية زمن التفاعل الحقيقي</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="sec">
        <h2 class="sec-title">📋 سجل الجلسات التفصيلي</h2>
        <p class="sec-lead">آخر ${model.recent.length} جلسة — مع المشرف وأسماء المتسابقين.</p>
        <table class="data">
          <thead>
            <tr>
              <th>اللعبة</th><th>الغرفة</th><th>المشرف</th><th>المتسابقون</th>
              <th>جولات</th><th>عدد</th><th>ظهور رعاية</th><th>تفاعل (د)</th><th>الحالة</th><th>التاريخ</th>
            </tr>
          </thead>
          <tbody>${renderRecentRows(model.recent)}</tbody>
        </table>
      </div>
    </section>

    <section class="page">
      <div class="sec">
        <h2 class="sec-title">ℹ️ عن المنصة</h2>
        <p class="sec-lead">
          ${esc(PLATFORM_NAME)} منصة ألعاب جماعية تفاعلية مصمّمة للرحلات والاجتماعات والمناسبات والفعاليات المؤسسية.
          يتحكم المشرف بالكامل في الجلسة مع إمكانية الإيقاف المؤقت والعودة.
        </p>
        <div class="features">${features}</div>
      </div>

      <div class="sec">
        <h2 class="sec-title">🔍 منهجية الأرقام والشفافية</h2>
        <ul class="method-list">
          <li><strong>مصدر البيانات:</strong> نظام تتبع الجلسات في Firebase — يُحدَّث تلقائياً عند كل جلسة لعب.</li>
          <li><strong>جلسة حقيقية:</strong> جلسة أُكمل فيها جولة واحدة على الأقل.</li>
          <li><strong>مشاركة المتسابق:</strong> عدد المتسابقين الحاضرين في جلسة — المجموع تراكمي وقد يتكرر نفس الشخص.</li>
          <li><strong>ظهور الرعاية:</strong> عدد الجولات × عدد المتسابقين في كل جلسة.</li>
          <li><strong>دقائق التفاعل:</strong> متسابق × دقيقة حضور — مقياس التفاعل الفعلي للجمهور.</li>
          <li><strong>جلسة مؤهلة للجوائز:</strong> مكتملة، 5 متسابقين أو أكثر، جولتان فأكثر.</li>
          <li><strong>الجلسات المبكرة:</strong> ${nf(model.abandonedGames)} جلسة أُنهيت قبل الإكمال — مُدرجة بشفافية في الإحصائيات.</li>
        </ul>
      </div>

      <footer class="foot">
        <strong>${esc(LEGAL_ORG_SUBTITLE)}</strong> · ${esc(LEGAL_ADDRESS)} · س.ت ${esc(LEGAL_CR_NUMBER)}<br/>
        ${esc(PLATFORM_NAME)} — ${esc(PLATFORM_SITE_URL)} · ${esc(PLATFORM_SITE_HOST)}<br/>
        للتواصل: ${esc(SUPPORT_EMAIL)} · واتساب ${esc(SUPPORT_WHATSAPP)}<br/>
        <span style="opacity:.75">تقرير آلي رقم ${esc(model.reportId)} — يُعتمد على البيانات المسجّلة وقت الإصدار</span>
      </footer>
    </section>
  </div>
</body>
</html>`;
}

function formatShort(ts) {
  try {
    return new Date(ts).toLocaleDateString('ar-SA', { dateStyle: 'medium' });
  } catch {
    return '—';
  }
}

/**
 * يفتح تقرير HTML رسمي في نافذة جديدة — الطباعة → حفظ PDF
 * @returns {boolean}
 */
export function openMarketingImpactReport(stats, options = {}) {
  if (!stats || typeof stats !== 'object') return false;

  const model = buildMarketingReportModel(stats, options);
  const html = buildReportHtml(model);

  const w = window.open('', '_blank', 'noopener,noreferrer,width=920,height=720');
  if (!w) return false;

  w.document.open();
  w.document.write(html);
  w.document.close();

  const tryPrint = () => {
    try {
      w.focus();
    } catch {
      /* ignore */
    }
  };

  if (w.document.readyState === 'complete') {
    setTimeout(tryPrint, 300);
  } else {
    w.addEventListener('load', () => setTimeout(tryPrint, 200));
  }

  return true;
}
