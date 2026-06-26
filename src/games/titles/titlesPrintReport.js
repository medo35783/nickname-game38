/**
 * تقرير HTML للطباعة / حفظ PDF — لعبة الألقاب (خلفية بيضاء، ألوان اللعبة).
 */
import { AV_COLORS } from '../../core/constants';
import { reportPlatformFooterLabel, reportPlatformLogoHtml } from '../../shared/reportBrandAssets';
import {
  attackableNicksForPlayer,
  nickExitMeta,
  playerNicksList,
  remainingBoardStats,
  revealedNicksForStats,
} from './titlesRevealHelpers';

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const C = {
  gold: '#b8860b',
  goldLight: '#f5ecd4',
  green: '#1a8a50',
  greenBg: '#e8f7ef',
  red: '#c42b40',
  redBg: '#fdecef',
  blue: '#2a7ab8',
  purple: '#7d3c98',
  text: '#1a1630',
  muted: '#5c5678',
  border: '#e8e4dc',
  card: '#faf8f5',
};

function pgHead(roomCode, sectionTitle = '') {
  return `<header class="pg-head">
    <div class="pg-brand">
      <div class="pg-platform">${reportPlatformLogoHtml({ theme: 'light', maxHeight: 34 })}</div>
      <span class="pg-ico" aria-hidden="true">🎭</span>
      <div>
        <div class="pg-title">لعبة الألقاب</div>
        <div class="pg-tag">أخف هويتك واكشف الآخرين</div>
      </div>
    </div>
    <div class="pg-meta">
      <span>رمز <strong>${esc(roomCode)}</strong></span>
      ${sectionTitle ? `<span class="pg-sec">${esc(sectionTitle)}</span>` : ''}
    </div>
  </header>`;
}

function avHtml(p, sz = 36) {
  const idx = (p.colorIdx ?? 0) % AV_COLORS.length;
  const bg = AV_COLORS[idx];
  const ini = esc(p.initials || p.name?.slice(0, 2) || '?');
  return `<span class="av" style="width:${sz}px;height:${sz}px;background:${bg};font-size:${Math.round(sz * 0.34)}px">${ini}</span>`;
}

function nickChip(n, revealed = true) {
  const cls = revealed ? 'chip chip-gold' : 'chip chip-muted';
  return `<span class="${cls}">&quot;${esc(n)}&quot;</span>`;
}

function heatFromAttacks(atkList, field) {
  const m = {};
  atkList.forEach((a) => {
    const k = a[field];
    if (k) m[k] = (m[k] || 0) + 1;
  });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

function heatBarInline(count, maxVal) {
  const r = maxVal > 0 ? Math.min(1, count / maxVal) : 0;
  const hue = 215 - r * 168;
  const pct = Math.max(count > 0 ? 6 : 0, Math.round(r * 100));
  const light = 32 + r * 18;
  const sat = 65 + r * 25;
  const c0 = `hsl(${hue + 18}deg, ${sat}%, ${light}%)`;
  const c1 = `hsl(${hue}deg, ${sat + 8}%, ${light + 4}%)`;
  const c2 = `hsl(${Math.max(8, hue - 28)}deg, ${Math.min(98, sat + 12)}%, ${Math.min(58, light + 12)}%)`;
  return `<div class="heat-track"><div class="heat-fill" style="width:${pct}%;background:linear-gradient(90deg,${c0},${c1},${c2})"></div></div>`;
}

function renderHeatItems(items) {
  if (!items.length) return '<p class="empty-sm">—</p>';
  const max = items[0][1];
  return items
    .map(
      ([label, count], i) => `
    <div class="heat-item${i === 0 ? ' top' : ''}">
      <div class="heat-head">
        <span class="heat-label"><span class="heat-rank">${i + 1}</span> ${esc(label)}</span>
        <span class="heat-count">${count}</span>
      </div>
      ${heatBarInline(count, max)}
    </div>`
    )
    .join('');
}

function renderHeatColumn(title, allRoundsList, field) {
  const allAtks = [...allRoundsList]
    .sort((a, b) => a.round - b.round)
    .flatMap((r) => Object.values(r.attacks || {}));
  const total = heatFromAttacks(allAtks, field);
  const inner = total.length
    ? `<div class="heat-total-block">${renderHeatItems(total)}</div>`
    : '<p class="empty-sm">لا بيانات</p>';

  return `<div class="heat-col">
    <h3 class="heat-col-title">${esc(title)}</h3>
    <p class="heat-col-sub">🏅 المجموع الكلي (كل الجولات) · ${allAtks.length} هجمة</p>
    ${inner}
  </div>`;
}

function renderRosterVisual(playersList, allRoundsList) {
  const board = remainingBoardStats(playersList, 0);
  const dual = playersList.some((p) => p.nick2);
  const active = playersList.filter((p) => p.status === 'active');
  const out = playersList
    .filter((p) => p.status && p.status !== 'active')
    .sort((a, b) => (b.eliminatedRound || 0) - (a.eliminatedRound || 0));

  const hud = `
    <div class="hud">
      <span class="hud-cell"><b>${board.playersActive}</b> متسابق</span>
      ${dual ? `<span class="hud-cell gold"><b>${board.titlesLeft}</b> لقب سري</span>` : ''}
      <span class="hud-cell red"><b>${board.playersOut}</b> خارج</span>
      ${dual && board.titlesGone > 0 ? `<span class="hud-cell muted"><b>${board.titlesGone}</b> انكشف</span>` : ''}
    </div>`;

  const activeRows = active
    .map((p) => {
      const nicks = playerNicksList(p);
      const surviving = attackableNicksForPlayer(p);
      const chips = nicks
        .map((n) =>
          surviving.includes(n)
            ? `<span class="chip chip-winner">👑 &quot;${esc(n)}&quot;</span>`
            : `<span class="chip chip-out">✕ &quot;${esc(n)}&quot; <small>كُشف</small></span>`
        )
        .join('');
      return `<div class="prow active">
        ${avHtml(p)}
        <div class="pinfo">
          <div class="pname">${esc(p.name)}</div>
          <div class="pchips">${chips}</div>
        </div>
        <span class="badge ok">نشط</span>
      </div>`;
    })
    .join('');

  const outRows = out
    .map((p) => {
      const nicks = playerNicksList(p);
      const showNicks = nicks.length ? nicks : revealedNicksForStats(p, allRoundsList);
      const statusLine =
        p.status === 'cheater'
          ? '🚫 غش'
          : p.status === 'inactive'
            ? `😴 خمول · ج${p.eliminatedRound || '?'}`
            : '💀 خرج';
      const exitLines = showNicks
        .map((n) => {
          const meta = nickExitMeta(p, n, allRoundsList);
          const round = meta?.round ?? p.eliminatedRound;
          let line = `<span class="exit-nick">&quot;${esc(n)}&quot;</span>`;
          if (round != null) line += ` <span class="exit-r">ج${round}</span>`;
          if (meta?.by) line += ` · أخرجه <strong>&quot;${esc(meta.by)}&quot;</strong>`;
          return `<div class="exit-line">${line}</div>`;
        })
        .join('');
      return `<div class="prow out">
        ${avHtml(p)}
        <div class="pinfo">
          <div class="pname">${esc(p.name)}</div>
          <div class="pchips">${showNicks.map((n) => nickChip(n, true)).join('')}</div>
          <div class="psub">${statusLine}</div>
          ${exitLines ? `<div class="exit-list">${exitLines}</div>` : ''}
        </div>
      </div>`;
    })
    .join('');

  return `${hud}
    <h3 class="block-lbl">🎮 في الساحة</h3>
    <div class="plist">${activeRows || '<p class="empty-sm">لا أحد</p>'}</div>
    ${out.length ? `<h3 class="block-lbl out">💀 خرجوا من اللعبة (${out.length})</h3><div class="plist grave">${outRows}</div>` : ''}`;
}

function renderDecoys(decoyNicks, allAttacksFlat) {
  if (!decoyNicks.length) {
    return '<p class="empty-sm">لا ألقاب تمويه في هذه المسابقة</p>';
  }
  const rows = decoyNicks
    .map((n) => {
      const hits = allAttacksFlat.filter(
        (a) => a.targetNick === n || (a.isDecoy && a.targetNick === n)
      ).length;
      return `<tr><td class="nick">${esc(n)}</td><td><span class="count-pill">${hits}</span> هجمة</td></tr>`;
    })
    .join('');
  return `<table class="tbl compact">
    <thead><tr><th>لقب التمويه</th><th>عدد الهجمات عليه</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function attackerRank(playersList, allAttacksFlat) {
  return playersList
    .map((p) => {
      const nicks = playerNicksList(p);
      const atks = allAttacksFlat.filter((a) => nicks.includes(a.attackerNick));
      return {
        name: p.name,
        nick: p.nick,
        hits: atks.filter((a) => a.correct).length,
        count: atks.length,
        colorIdx: p.colorIdx,
        initials: p.initials,
      };
    })
    .filter((p) => p.count > 0)
    .sort((a, b) => b.hits - a.hits || b.count - a.count);
}

function renderFierceCol(rank) {
  if (!rank.length) return '<p class="empty-sm">لا هجمات مسجّلة</p>';
  return rank
    .slice(0, 12)
    .map(
      (p, i) => `
    <div class="rank-row${i < 3 ? ' top' : ''}">
      <span class="rank-n">${i === 0 ? '👑' : i + 1}</span>
      ${avHtml(p, 28)}
      <div class="rank-body">
        <div class="rank-name">${esc(p.name)}</div>
        <div class="rank-nick">&quot;${esc(p.nick)}&quot;</div>
      </div>
      <div class="rank-stats">
        <span class="ok">${p.hits} إصابة</span>
        <span class="dim">${p.count} هجمة</span>
      </div>
    </div>`
    )
    .join('');
}

function renderPoisonCol(playersList, poisonNick) {
  const poisoned = playersList.filter((p) => p.isBannedNextRound);
  if (!poisoned.length && !poisonNick) {
    return '<p class="empty-sm">لا ضحايا مسموم</p>';
  }
  let html = poisonNick
    ? `<p class="poison-nick">☠️ اللقب المسموم: <strong>&quot;${esc(poisonNick)}&quot;</strong></p>`
    : '';
  if (poisoned.length) {
    html += poisoned
      .map(
        (p) => `
      <div class="poison-row">
        ${avHtml(p, 28)}
        <div>
          <div class="rank-name">${esc(p.name)}</div>
          <div class="rank-nick">&quot;${esc(p.nick)}&quot;</div>
          <div class="psub">ممنوع الجولة ${esc(p.isBannedNextRound)}</div>
        </div>
      </div>`
      )
      .join('');
  }
  return html;
}

function renderRoundPath(r, playersList, decoyNicks) {
  const ratks = Object.values(r.attacks || {}).sort((a, b) => (a.time || 0) - (b.time || 0));
  const hits = ratks.filter((a) => a.correct).length;

  const rows = ratks
    .map((a) => {
      const ok = Boolean(a.correct);
      const isDecoy = a.isDecoy || decoyNicks.includes(a.targetNick);
      const victim = playersList.find((pl) => pl.id === a.realOwnerId);
      let note = '—';
      if (isDecoy) note = 'تمويه (لا صاحب حقيقي)';
      else if (victim) note = `صاحب اللقب: ${victim.name} (${a.targetNick})`;

      return `<tr class="${ok ? 'row-ok' : 'row-fail'}">
        <td class="nick">${esc(a.attackerNick)}</td>
        <td class="nick">${esc(a.targetNick)}</td>
        <td>${esc(a.guessedName || '—')}</td>
        <td><span class="verdict ${ok ? 'ok' : 'fail'}">${ok ? '✓ صح' : '✕ خطأ'}</span></td>
        <td class="note">${esc(note)}</td>
      </tr>`;
    })
    .join('');

  return `<div class="round-box">
    <div class="round-top">
      <h3>الجولة ${r.round}${r.silent ? ' <span class="silent">🤫 صمت</span>' : ''}</h3>
      <span class="round-pills">
        <span class="pill">${ratks.length} هجمة</span>
        <span class="pill ok">${hits} صح</span>
        <span class="pill bad">${ratks.length - hits} خطأ</span>
      </span>
    </div>
    ${
      ratks.length
        ? `<table class="tbl path-tbl">
      <thead><tr><th>المهاجم</th><th>الهدف</th><th>التخمين</th><th>النتيجة</th><th>ملاحظات</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
        : '<p class="empty-sm">لا هجمات</p>'
    }
  </div>`;
}

function reportStyles() {
  return `
  *{box-sizing:border-box}
  body{margin:0;font-family:'Tajawal','Cairo',Arial,sans-serif;background:#fff;color:${C.text};line-height:1.5}
  .wrap{max-width:800px;margin:0 auto;padding:0 14px 28px}
  .pg-head{
    display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;
    padding:10px 14px;margin:0 -14px 14px;
    background:linear-gradient(135deg,${C.goldLight},#fff);
    border-bottom:2px solid ${C.gold};
  }
  .pg-brand{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .pg-platform{flex-shrink:0}
  .pg-ico{font-size:28px;line-height:1}
  .pg-title{font-family:'Cairo',sans-serif;font-size:16px;font-weight:900;color:${C.gold}}
  .pg-tag{font-size:10px;color:${C.muted}}
  .pg-meta{font-size:11px;color:${C.muted};text-align:left}
  .pg-meta strong{color:${C.text}}
  .pg-sec{display:block;margin-top:2px;color:${C.gold};font-weight:800}
  .page{margin-bottom:20px;padding-top:4px}
  .page-break{page-break-before:always;padding-top:8px}
  .sec-title{font-family:'Cairo',sans-serif;font-size:17px;font-weight:900;color:${C.gold};margin:0 0 10px}
  .cover{padding:16px 0 8px;text-align:center}
  .cover-platform{display:flex;justify-content:center;margin-bottom:12px}
  .cover h1{margin:0 0 8px;font-family:'Cairo',sans-serif;font-size:22px;color:${C.gold}}
  .cover .date{font-size:12px;color:${C.muted}}
  .kpi{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:14px 0}
  .kpi span{padding:6px 14px;border-radius:10px;background:${C.card};border:1px solid ${C.border};font-size:12px}
  .kpi b{font-family:'Cairo',sans-serif;font-size:15px;color:${C.gold};margin-right:4px}
  .kpi .ok b{color:${C.green}}
  .kpi .bad b{color:${C.red}}
  .winners-box{margin:12px auto;max-width:520px;padding:12px 14px;border-radius:12px;background:${C.goldLight};border:1px solid rgba(184,134,11,.35);text-align:right}
  .winners-box h4{margin:0 0 8px;font-size:13px;color:${C.gold}}
  .winner-line{padding:6px 0;border-bottom:1px dashed ${C.border};font-size:13px}
  .winner-line:last-child{border:none}
  .winner-line strong{color:${C.text}}
  .winner-nicks{color:${C.muted};font-size:12px;margin-top:4px;display:flex;flex-wrap:wrap;align-items:center;gap:5px}
  .wchip{display:inline-block;padding:2px 9px;border-radius:8px;font-size:12px;font-weight:900}
  .wchip.win{background:linear-gradient(135deg,#fbe9b0,#f3cf5e);color:#5a3d00;border:1.5px solid ${C.gold};box-shadow:0 1px 4px rgba(184,134,11,.35)}
  .wchip.out{background:#eceaf3;color:#9a93b5;border:1px dashed #cfc9de;text-decoration:line-through;font-weight:700}
  .wchip.dim{color:${C.muted}}
  .winner-sep{color:${C.muted}}
  .print-hint{font-size:11px;color:${C.muted};margin:12px 0 6px}
  .print-btn{font-family:'Cairo',sans-serif;padding:11px 24px;border-radius:11px;border:none;background:linear-gradient(135deg,#d4920a,#b86a10);color:#1a1020;font-weight:900;font-size:14px;cursor:pointer}
  .hud{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
  .hud-cell{padding:8px 12px;border-radius:10px;background:#fff;border:1px solid ${C.border};font-size:11px;color:${C.muted}}
  .hud-cell b{display:block;font-family:'Cairo',sans-serif;font-size:18px;color:${C.blue}}
  .hud-cell.gold b{color:${C.gold}}
  .hud-cell.red b{color:${C.red}}
  .hud-cell.muted b{color:${C.muted}}
  .block-lbl{font-family:'Cairo',sans-serif;font-size:14px;font-weight:800;margin:12px 0 8px;color:${C.text}}
  .block-lbl.out{color:${C.red}}
  .plist{display:flex;flex-direction:column;gap:8px}
  .plist.grave .prow{background:${C.redBg}}
  .prow{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:12px;background:#fff;border:1px solid ${C.border}}
  .prow.active{border-color:rgba(26,138,80,.35);background:${C.greenBg}}
  .av{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-family:'Cairo',sans-serif;font-weight:900;flex-shrink:0}
  .pinfo{flex:1;min-width:0}
  .pname{font-family:'Cairo',sans-serif;font-weight:900;font-size:14px}
  .pchips{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}
  .chip{display:inline-block;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:800}
  .chip-gold{background:rgba(184,134,11,.15);color:${C.gold};border:1px solid rgba(184,134,11,.35)}
  .chip-muted{background:#f0eef8;color:${C.muted};border:1px solid ${C.border}}
  .chip-winner{background:linear-gradient(135deg,#fbe9b0,#f3cf5e);color:#5a3d00;border:1.5px solid ${C.gold};font-weight:900;box-shadow:0 1px 4px rgba(184,134,11,.35)}
  .chip-out{background:#eceaf3;color:#9a93b5;border:1px dashed #cfc9de;text-decoration:line-through;font-weight:700}
  .chip-out small{font-size:9px;text-decoration:none;font-weight:800}
  .badge{font-size:10px;font-weight:900;padding:3px 8px;border-radius:999px;flex-shrink:0}
  .badge.ok{color:${C.green};background:${C.greenBg};border:1px solid rgba(26,138,80,.3)}
  .psub{font-size:11px;color:${C.muted};margin-top:4px}
  .exit-list{margin-top:6px}
  .exit-line{font-size:11px;color:${C.muted};margin-top:3px}
  .exit-nick{color:${C.text};font-weight:700}
  .exit-r{color:${C.gold};font-weight:800}
  .exit-line strong{color:${C.red}}
  .split-2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .heat-col{background:${C.card};border:1px solid ${C.border};border-radius:12px;padding:10px}
  .heat-col-title{margin:0 0 4px;font-family:'Cairo',sans-serif;font-size:13px;font-weight:900;color:${C.gold};text-align:center}
  .heat-col-sub{margin:0 0 12px;font-size:11px;font-weight:700;color:${C.muted};text-align:center}
  .heat-total-block{padding:4px 0}
  .heat-item{margin-bottom:6px;padding:6px 8px;border-radius:8px;background:#fff;border:1px solid ${C.border}}
  .heat-item.top{border-color:rgba(184,134,11,.4);background:${C.goldLight}}
  .heat-head{display:flex;justify-content:space-between;gap:6px;margin-bottom:4px;font-size:11px}
  .heat-label{font-weight:800;font-family:'Cairo',sans-serif}
  .heat-item.top .heat-label{color:${C.gold}}
  .heat-rank{color:${C.muted};font-size:10px}
  .heat-count{font-weight:900;color:${C.text}}
  .heat-track{height:8px;background:#eee;border-radius:999px;overflow:hidden}
  .heat-fill{height:100%;border-radius:999px;min-width:3px}
  .split-card{background:${C.card};border:1px solid ${C.border};border-radius:12px;padding:12px}
  .split-card h3{margin:0 0 10px;font-family:'Cairo',sans-serif;font-size:14px;font-weight:900;color:${C.gold}}
  .rank-row{display:flex;align-items:center;gap:8px;padding:8px;margin-bottom:6px;border-radius:10px;background:#fff;border:1px solid ${C.border}}
  .rank-row.top{border-color:rgba(184,134,11,.4);background:${C.goldLight}}
  .rank-n{font-weight:900;min-width:22px;text-align:center}
  .rank-body{flex:1;min-width:0}
  .rank-name{font-weight:800;font-size:13px}
  .rank-nick{font-size:11px;color:${C.muted}}
  .rank-stats{text-align:left;font-size:11px;display:flex;flex-direction:column;gap:2px}
  .rank-stats .ok{color:${C.green};font-weight:800}
  .rank-stats .dim{color:${C.muted}}
  .poison-nick{font-size:12px;margin-bottom:10px;padding:8px;border-radius:8px;background:rgba(125,60,152,.08);border:1px solid rgba(125,60,152,.25)}
  .poison-row{display:flex;gap:8px;padding:8px 0;border-bottom:1px solid ${C.border}}
  .tbl{width:100%;border-collapse:collapse;font-size:11px}
  .tbl th,.tbl td{padding:7px 6px;text-align:right;border-bottom:1px solid ${C.border}}
  .tbl th{background:${C.goldLight};color:${C.gold};font-weight:800;font-size:10px}
  .tbl .nick{font-family:'Cairo',sans-serif;font-weight:800}
  .count-pill{font-weight:900;color:${C.gold}}
  .round-box{margin-bottom:16px;padding:12px;border:1px solid ${C.border};border-radius:12px;background:#fff;page-break-inside:avoid}
  .round-top{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid ${C.goldLight}}
  .round-top h3{margin:0;font-family:'Cairo',sans-serif;font-size:15px;font-weight:900;color:${C.gold}}
  .round-pills{display:flex;gap:5px;font-size:10px}
  .pill{padding:3px 8px;border-radius:999px;background:#f0eef8;border:1px solid ${C.border}}
  .pill.ok{color:${C.green};background:${C.greenBg}}
  .pill.bad{color:${C.red};background:${C.redBg}}
  .silent{color:${C.blue};font-size:12px}
  .verdict{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:900}
  .verdict.ok{color:${C.green};background:${C.greenBg}}
  .verdict.fail{color:${C.red};background:${C.redBg}}
  .row-ok td:nth-child(2){border-right:3px solid ${C.green}}
  .row-fail td:nth-child(2){border-right:3px solid ${C.red}}
  .note{font-size:10px;color:${C.muted}}
  .empty-sm{text-align:center;color:${C.muted};font-size:12px;padding:8px}
  .foot{text-align:center;font-size:10px;color:${C.muted};margin-top:20px;padding-top:12px;border-top:1px solid ${C.border}}
  @media print{
    .no-print{display:none!important}
    body{padding:0}
    .wrap{max-width:100%;padding:0 10mm}
    .pg-head{margin:0 0 10px;padding:8px 10px}
    .page-break{page-break-before:always}
    .heat-page{page-break-after:always}
  }
`;
}

function buildReportHtml({ roomCode, playersList, allRoundsList, allAttacksFlat, gameState }) {
  const decoyNicks = Array.isArray(gameState?.decoyNicks) ? gameState.decoyNicks : [];
  const poisonNick = gameState?.poisonNick || '';
  const totalHits = allAttacksFlat.filter((a) => a.correct).length;
  const winners = playersList.filter((p) => p.status === 'active');
  const rank = attackerRank(playersList, allAttacksFlat);
  const dateStr = new Date().toLocaleString('ar-SA');

  const winnerHtml = winners.length
    ? winners
        .map((p) => {
          const surviving = attackableNicksForPlayer(p);
          const revealed = playerNicksList(p).filter((n) => !surviving.includes(n));
          const winChips = surviving.length
            ? surviving.map((n) => `<span class="wchip win">👑 &quot;${esc(n)}&quot;</span>`).join('')
            : '<span class="wchip dim">—</span>';
          const outChips = revealed
            .map((n) => `<span class="wchip out">✕ &quot;${esc(n)}&quot;</span>`)
            .join('');
          return `<div class="winner-line">
            <strong>${esc(p.name)}</strong>
            <div class="winner-nicks">اللقب الفائز: ${winChips}${outChips ? ` <span class="winner-sep">·</span> ${outChips}` : ''}</div>
          </div>`;
        })
        .join('')
    : '<div class="winner-line">—</div>';

  const roundsPath = [...allRoundsList]
    .sort((a, b) => a.round - b.round)
    .map((r) => renderRoundPath(r, playersList, decoyNicks))
    .join('');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>${esc(`تقرير الألقاب ${roomCode}`)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;900&family=Tajawal:wght@500;700&display=swap" rel="stylesheet">
<style>${reportStyles()}</style>
</head>
<body>
<div class="wrap">

  <section class="page cover">
    <div class="cover-platform">${reportPlatformLogoHtml({ theme: 'light', maxHeight: 52 })}</div>
    ${pgHead(roomCode, 'ملخص المسابقة')}
    <h1>تقرير كامل</h1>
    <p class="date">${esc(dateStr)}</p>
    <div class="kpi">
      <span><b>${allRoundsList.length}</b> جولة</span>
      <span><b>${allAttacksFlat.length}</b> هجمة</span>
      <span class="ok"><b>${totalHits}</b> إصابة</span>
      <span class="bad"><b>${allAttacksFlat.length - totalHits}</b> خطأ</span>
    </div>
    <div class="winners-box">
      <h4>🏆 الفائز / المتبقون عند الإنهاء</h4>
      ${winnerHtml}
    </div>
    <p class="print-hint no-print">لحفظ PDF: اضغط الزر ثم اختر «حفظ كـ PDF»</p>
    <button type="button" class="print-btn no-print" onclick="doPrint()">🖨️ طباعة / حفظ PDF</button>
  </section>

  <section class="page">
    ${pgHead(roomCode, 'المتسابقون')}
    <h2 class="sec-title">👥 المتسابقون — كما في تبويب المتبقون</h2>
    ${renderRosterVisual(playersList, allRoundsList)}
  </section>

  <section class="page">
    ${pgHead(roomCode, 'التمويه')}
    <h2 class="sec-title">🎭 ألقاب التمويه</h2>
    ${renderDecoys(decoyNicks, allAttacksFlat)}
  </section>

  <section class="page page-break heat-page">
    ${pgHead(roomCode, 'الخريطة الحرارية')}
    <h2 class="sec-title">🔥 الخريطة الحرارية — المجموع الكلي لكل الجولات</h2>
    <div class="split-2">
      ${renderHeatColumn('👥 الأسماء الأكثر تخميناً', allRoundsList, 'guessedName')}
      ${renderHeatColumn('🎭 الألقاب الأكثر استهدافاً', allRoundsList, 'targetNick')}
    </div>
  </section>

  <section class="page page-break">
    ${pgHead(roomCode, 'الأشرس والمسموم')}
    <div class="split-2">
      <div class="split-card">
        <h3>⚔️ الأشرس هجوماً</h3>
        ${renderFierceCol(rank)}
      </div>
      <div class="split-card">
        <h3>☠️ ضحايا المسموم</h3>
        ${renderPoisonCol(playersList, poisonNick)}
      </div>
    </div>
  </section>

  <section class="page page-break">
    ${pgHead(roomCode, 'مسار اللعبة')}
    <h2 class="sec-title">📍 مسار اللعبة — تفصيلي</h2>
    ${roundsPath || '<p class="empty-sm">لا جولات مسجّلة</p>'}
  </section>

  <div class="foot">${reportPlatformFooterLabel('لعبة الألقاب')}</div>
</div>
<script>function doPrint(){window.focus();window.print();}</script>
</body>
</html>`;
}

/**
 * @returns {boolean} نجح فتح النافذة
 */
export function openTitlesPrintableReport({
  roomCode,
  playersList,
  allRoundsList,
  allAttacksFlat,
  gameState,
}) {
  const html = buildReportHtml({
    roomCode,
    playersList,
    allRoundsList,
    allAttacksFlat,
    gameState,
  });

  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) {
    try {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `تقرير_الألقاب_${roomCode || 'room'}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
    return false;
  }

  w.document.open();
  w.document.write(html);
  w.document.close();

  const tryPrint = () => {
    try {
      w.focus();
      w.print();
    } catch {
      /* ignore */
    }
  };

  if (w.document.readyState === 'complete') {
    setTimeout(tryPrint, 400);
  } else {
    w.addEventListener('load', () => setTimeout(tryPrint, 250));
    setTimeout(tryPrint, 900);
  }

  return true;
}
