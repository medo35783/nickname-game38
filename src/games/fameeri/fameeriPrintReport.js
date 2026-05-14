/**
 * تقرير HTML فخم — يفتح في نافذة جديدة؛ من المتصفح: طباعة → حفظ كـ PDF.
 */
export function openFameeriPrintableReport({ qRoom, qGList, qAttacks }) {
  const sorted = [...qGList].sort((a, b) => (b.totalRemaining || 0) - (a.totalRemaining || 0));
  const attacks = Object.values(qAttacks || {}).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const rows = sorted
    .map(
      (g, i) => `
    <tr class="${i === 0 ? 'winner' : ''}">
      <td>${i === 0 ? '👑' : i + 1}</td>
      <td>${esc(g.name)}</td>
      <td class="num">${g.totalRemaining ?? 0}</td>
    </tr>`
    )
    .join('');

  const logRows = attacks
    .map(
      (a) => `
    <tr>
      <td>${esc(a.attackerName)}</td>
      <td>${esc(a.targetName)}</td>
      <td>${esc(a.tree)}</td>
      <td>${a.result === 'success' ? `✅ ${a.hunted ?? 0}` : '❌'}</td>
    </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <title>تقرير صيد القميري #${esc(qRoom)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;800;900&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box}
    body{margin:0;font-family:'Cairo',sans-serif;background:#07071a;color:#e8e0ff;padding:28px 20px 40px}
    .wrap{max-width:720px;margin:0 auto}
    .head{text-align:center;padding:26px 20px;border-radius:18px;background:linear-gradient(145deg,#1a1530,#0d0b18);border:1px solid rgba(240,192,64,.25);margin-bottom:22px}
    .head h1{margin:0;font-size:26px;font-weight:900;color:#f0c040;letter-spacing:.02em}
    .head .sub{margin-top:8px;font-size:14px;color:#9b92c4}
    .badge{display:inline-block;margin-top:12px;padding:6px 14px;border-radius:999px;background:rgba(46,204,113,.12);border:1px solid rgba(46,204,113,.35);font-size:12px;color:#2ecc71;font-weight:800}
    h2{font-size:17px;font-weight:900;color:#f0c040;margin:24px 0 12px;padding-bottom:8px;border-bottom:1px solid rgba(240,192,64,.2)}
    table{width:100%;border-collapse:collapse;font-size:14px;background:#0f0f22;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.06)}
    th,td{padding:11px 12px;text-align:right}
    th{background:#151530;color:#c8c0e8;font-weight:800;font-size:12px}
    tr:nth-child(even) td{background:rgba(255,255,255,.02)}
    tr.winner td{background:rgba(240,192,64,.12);font-weight:800}
    td.num{font-weight:900;color:#2ecc71;font-variant-numeric:tabular-nums}
    .foot{margin-top:28px;text-align:center;font-size:11px;color:#6a6490}
    @media print{body{background:#fff;color:#111;padding:16px}.head{border-color:#ccc}}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <h1>🦅 تقرير صيد القميري</h1>
      <div class="sub">غرفة رقم <strong style="color:#f0c040">#${esc(qRoom)}</strong></div>
      <div class="badge">استخدم «طباعة» ثم اختر «حفظ كـ PDF» من الوجهة</div>
      <p style="text-align:center;margin-top:14px"><button onclick="doPrint()" style="font-family:Cairo,sans-serif;padding:12px 22px;border-radius:12px;border:none;background:linear-gradient(135deg,#f0c040,#c9a030);color:#1a1020;font-weight:900;cursor:pointer;font-size:14px">🖨️ طباعة / حفظ PDF</button></p>
    </div>
    <h2>الترتيب النهائي</h2>
    <table>
      <thead><tr><th>#</th><th>المجموعة</th><th>القميري المتبقي</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <h2>سجل الهجمات</h2>
    <table>
      <thead><tr><th>مهاجم</th><th>هدف</th><th>شجرة</th><th>النتيجة</th></tr></thead>
      <tbody>${logRows || '<tr><td colspan="4" style="text-align:center;color:#7a74a0">لا سجل</td></tr>'}</tbody>
    </table>
    <div class="foot">صيد القميري — ساحة الألعاب</div>
  </div>
  <script>
    function doPrint(){ window.print(); }
  </script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
