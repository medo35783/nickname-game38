import { useCallback, useEffect, useMemo, useState } from 'react';
import { onValue } from 'firebase/database';
import { createCode, codesRef } from '../../firebaseHelpers';
import { db } from '../../firebase';

/** باقات التوليد: مدة بالأيام + سعر بالريال */
const PACKAGES = [
  { id: 'p1', duration: 1, price: 15, labelShort: '1 يوم', labelPrice: '15ر' },
  { id: 'p3', duration: 3, price: 35, labelShort: '3 أيام', labelPrice: '35ر' },
  { id: 'p7', duration: 7, price: 50, labelShort: '7 أيام', labelPrice: '50ر' },
];

/**
 * الحالة الفعلية للعرض والإحصاء (نشط لكن انتهت المدة → منتهي)
 */
function getEffectiveStatus(row) {
  if (!row) return 'unknown';
  if (row.status === 'expired') return 'expired';
  if (row.status === 'unused') return 'unused';
  if (row.status === 'active' && row.expiresAt && Date.now() > row.expiresAt) return 'expired';
  if (row.status === 'active') return 'active';
  return row.status || 'unknown';
}

function statusLabel(s) {
  if (s === 'unused') return 'غير مستخدم';
  if (s === 'active') return 'مُفعّل';
  if (s === 'expired') return 'منتهي';
  return s;
}

function formatDate(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('ar-SA', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

/**
 * لوحة إدارة أكواد الاشتراك — إحصائيات، توليد، قائمة، تصدير CSV
 * @param {{ notify: (text: string, type?: string) => void }} props
 */
export default function AdminCodesPanel({ notify }) {
  /** سجل الأكواد من Realtime DB */
  const [rows, setRows] = useState([]);
  /** الباقة المختارة للتوليد */
  const [selectedPkg, setSelectedPkg] = useState(PACKAGES[0]);
  /** عدد الأكواد المراد توليدها */
  const [countInput, setCountInput] = useState(10);
  /** تحميل أثناء التوليد */
  const [generating, setGenerating] = useState(false);
  /** آخر دفعة مولّدة (للعرض والنسخ) */
  const [generatedLines, setGeneratedLines] = useState([]);
  /** رسالة نجاح بعد التوليد */
  const [successMsg, setSuccessMsg] = useState('');

  // الاشتراك في شجرة codes (تنظيف عند unmount)
  useEffect(() => {
    const r = codesRef();
    const unsub = onValue(
      r,
      (snap) => {
        const list = [];
        snap.forEach((child) => {
          list.push({ id: child.key, ...child.val() });
        });
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setRows(list);
      },
      (err) => {
        console.error(err);
        notify(err?.message || 'فشل تحميل الأكواد', 'error');
      }
    );
    return () => unsub();
  }, [notify]);

  /** إحصائيات مجمّعة حسب الحالة الفعلية */
  const stats = useMemo(() => {
    let total = 0;
    let unused = 0;
    let active = 0;
    let expired = 0;
    for (const row of rows) {
      total += 1;
      const eff = getEffectiveStatus(row);
      if (eff === 'unused') unused += 1;
      else if (eff === 'active') active += 1;
      else if (eff === 'expired') expired += 1;
    }
    return { total, unused, active, expired };
  }, [rows]);

  const clampCount = useCallback((n) => {
    const x = Number.isFinite(n) ? Math.floor(n) : 1;
    return Math.min(100, Math.max(1, x));
  }, []);

  /** توليد دفعة أكواد */
  const handleGenerate = async () => {
    const n = clampCount(Number(countInput));
    setCountInput(n);
    setGenerating(true);
    setSuccessMsg('');
    setGeneratedLines([]);
    const created = [];
    try {
      for (let i = 0; i < n; i += 1) {
        const rec = await createCode(selectedPkg.duration, selectedPkg.price);
        created.push(rec.code);
      }
      setGeneratedLines(created);
      const msg = `تم توليد ${created.length} كود بنجاح (${selectedPkg.labelShort} / ${selectedPkg.labelPrice})`;
      setSuccessMsg(msg);
      notify(msg, 'success');
    } catch (e) {
      const errText = e?.message || 'حدث خطأ أثناء توليد الأكواد';
      notify(errText, 'error');
    } finally {
      setGenerating(false);
    }
  };

  /** نسخ الأكواد المولدة */
  const handleCopyGenerated = async () => {
    if (!generatedLines.length) {
      notify('لا توجد أكواد للنسخ', 'info');
      return;
    }
    const text = generatedLines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      notify('تم نسخ الأكواد', 'success');
    } catch {
      notify('تعذّر النسخ — انسخ يدوياً من المربع', 'error');
    }
  };

  /** تصدير كل الأكواد المعروضة كـ CSV */
  const handleExportCsv = () => {
    if (!rows.length) {
      notify('لا توجد بيانات للتصدير', 'info');
      return;
    }
    const header = ['code', 'status', 'duration_days', 'price_sar', 'created_at'];
    const lines = rows.map((row) => {
      const eff = getEffectiveStatus(row);
      const code = String(row.code || '').replace(/"/g, '""');
      const created = row.createdAt ? new Date(row.createdAt).toISOString() : '';
      return `"${code}","${eff}",${Number(row.duration) || 0},${Number(row.price) || 0},"${created}"`;
    });
    const csv = [header.join(','), ...lines].join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codes-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify('تم تصدير CSV', 'success');
  };

  const statBox = (label, value, colorVar) => (
    <div
      style={{
        flex: 1,
        minWidth: 120,
        padding: '12px 10px',
        borderRadius: 12,
        background: '#09091e',
        border: `1px solid rgba(255,255,255,.06)`,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 900, color: colorVar, fontFamily: 'Cairo, sans-serif' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontWeight: 700 }}>{label}</div>
    </div>
  );

  return (
    <div className="scr" style={{ paddingBottom: 24 }}>
      <div className="ptitle" style={{ fontSize: 20 }}>
        🎟️ لوحة الأكواد
      </div>
      <div className="psub" style={{ marginBottom: 12 }}>
        إحصائيات، توليد، وقائمة الأكواد
      </div>

      {/* إحصائيات */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="ctitle">📊 إحصائيات الأكواد</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {statBox('إجمالي الأكواد', stats.total, 'var(--gold)')}
          {statBox('غير مستخدم', stats.unused, 'var(--blue)')}
          {statBox('مُفعّل', stats.active, 'var(--green)')}
          {statBox('منتهي', stats.expired, 'var(--red)')}
        </div>
      </div>

      {/* توليد أكواد */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="ctitle">✨ توليد أكواد جديدة</div>

        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>اختر الباقة</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {PACKAGES.map((p) => {
            const sel = selectedPkg.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className={`btn bgh ${sel ? 'bo' : ''}`}
                style={{
                  flex: 1,
                  minWidth: 100,
                  borderColor: sel ? 'var(--gold)' : undefined,
                  background: sel ? 'rgba(240,192,64,.1)' : undefined,
                  color: sel ? 'var(--gold)' : undefined,
                }}
                onClick={() => setSelectedPkg(p)}
              >
                <div style={{ fontWeight: 900 }}>{p.labelShort}</div>
                <div style={{ fontSize: 11, opacity: 0.9 }}>{p.labelPrice}</div>
              </button>
            );
          })}
        </div>

        <div className="ig">
          <label className="lbl">عدد الأكواد (1 — 100)</label>
          <input
            className="inp"
            type="number"
            min={1}
            max={100}
            value={countInput}
            disabled={generating}
            onChange={(e) => {
              const v = e.target.value === '' ? '' : clampCount(Number(e.target.value));
              setCountInput(v === '' ? '' : v);
            }}
            onBlur={() => setCountInput((c) => clampCount(Number(c === '' ? 1 : c)))}
          />
        </div>

        <button type="button" className="btn bg mt2" style={{ width: '100%' }} disabled={generating} onClick={handleGenerate}>
          {generating ? '⏳ جاري التوليد...' : '⚡ توليد الأكواد'}
        </button>

        {successMsg && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(46,204,113,.1)',
              border: '1px solid rgba(46,204,113,.35)',
              color: 'var(--green)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            ✅ {successMsg}
          </div>
        )}

        {generatedLines.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginTop: 14, marginBottom: 6 }}>الأكواد المولدة</div>
            <textarea
              className="inp"
              readOnly
              rows={Math.min(12, Math.max(4, generatedLines.length))}
              value={generatedLines.join('\n')}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 13, resize: 'vertical', minHeight: 100 }}
            />
            <button type="button" className="btn bgh mt2" style={{ width: '100%' }} onClick={handleCopyGenerated}>
              📋 نسخ الأكواد
            </button>
          </>
        )}
      </div>

      {/* قائمة الأكواد */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          <div className="ctitle" style={{ marginBottom: 0 }}>
            📋 جميع الأكواد ({rows.length})
          </div>
          <button type="button" className="btn bgh bsm" style={{ width: 'auto' }} onClick={handleExportCsv}>
            📤 تصدير CSV
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ color: 'var(--muted)', textAlign: 'right' }}>
                <th style={{ padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>الكود</th>
                <th style={{ padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>الحالة</th>
                <th style={{ padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>المدة</th>
                <th style={{ padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>السعر</th>
                <th style={{ padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 16, textAlign: 'center', color: 'var(--muted)' }}>
                    لا توجد أكواد بعد
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const eff = getEffectiveStatus(row);
                  const rowColor =
                    eff === 'unused' ? 'var(--blue)' : eff === 'active' ? 'var(--green)' : eff === 'expired' ? 'var(--red)' : 'var(--muted)';
                  const bg =
                    eff === 'unused'
                      ? 'rgba(79,163,224,.06)'
                      : eff === 'active'
                        ? 'rgba(46,204,113,.06)'
                        : eff === 'expired'
                          ? 'rgba(230,57,80,.07)'
                          : 'rgba(255,255,255,.03)';
                  return (
                    <tr key={row.id} style={{ background: bg, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                      <td style={{ padding: '10px 6px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--gold)' }}>{row.code}</td>
                      <td style={{ padding: '10px 6px', fontWeight: 800, color: rowColor }}>{statusLabel(eff)}</td>
                      <td style={{ padding: '10px 6px', color: 'var(--text)' }}>{row.duration ?? '—'} يوم</td>
                      <td style={{ padding: '10px 6px', color: 'var(--text)' }}>{row.price ?? '—'} ر.س</td>
                      <td style={{ padding: '10px 6px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(row.createdAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
