import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import {
  db,
  ref,
  get,
  onValue,
  off,
  codesRef,
  adminProfileExistsForUid,
  createCode,
  ensureCodeIndexesFromRows,
  formatCodeForDisplay,
} from '../../core/firebaseHelpers';

import { ADMIN_PACKAGE_OPTIONS } from '../../core/subscriptionPackages';
import CodeStatsDetailPanel from './CodeStatsDetailPanel';
import CodeActivityBadge from './CodeActivityBadge';
import { formatCodeMiniStats, getCodeActivityInfo } from './codeActivityHelpers';

/** باقات التوليد: مدة بالأيام + سعر بالريال */
const PACKAGES = ADMIN_PACKAGE_OPTIONS;

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
  /** حالة التفعيل الفعلية من codeIndex */
  const [indexByCode, setIndexByCode] = useState({});
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
  /** كود مُوسَّع لعرض إحصائيات الجلسات */
  const [expandedCodeId, setExpandedCodeId] = useState(null);
  /** إحصائيات مختصرة للجدول (get عند التحميل / التحديث اليدوي) */
  const [codeStatsById, setCodeStatsById] = useState({});
  /** تحميل الإحصائيات المختصرة */
  const [statsBulkLoading, setStatsBulkLoading] = useState(false);
  /** بيانات لوحة التفاصيل الموسّعة (onValue مباشر) */
  const [expandedStats, setExpandedStats] = useState(null);
  const [expandedStatsLoading, setExpandedStatsLoading] = useState(false);
  const [expandedStatsError, setExpandedStatsError] = useState(false);
  const expandedStatsRef = useRef(null);
  const expandedUnsubRef = useRef(null);

  // الاشتراك في codes بعد تأكيد جلسة مشرف (تجنّب قراءة أثناء auth مجهول)
  useEffect(() => {
    let dbUnsub = null;

    const authUnsub = onAuthStateChanged(auth, async (user) => {
      if (dbUnsub) dbUnsub();
      dbUnsub = null;
      setRows([]);

      if (!user) return;

      const isAdmin = await adminProfileExistsForUid(user.uid);
      if (!isAdmin) return;

      dbUnsub = onValue(
        codesRef(),
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
          const denied =
            err?.code === 'PERMISSION_DENIED' ||
            String(err?.message || '').includes('permission_denied');
          notify(
            denied
              ? 'صلاحية /codes مرفوضة: انشر قواعد firebase-database-rules.json من Firebase → Realtime Database → Rules → Publish'
              : err?.message || 'فشل تحميل الأكواد',
            'error'
          );
        }
      );
    });

    return () => {
      authUnsub();
      if (dbUnsub) dbUnsub();
    };
  }, [notify]);

  useEffect(() => {
    if (!rows.length) return;
    ensureCodeIndexesFromRows(rows).catch((err) => {
      console.warn('ensureCodeIndexesFromRows:', err);
    });
  }, [rows]);

  const loadAllMiniStats = useCallback(async () => {
    if (!rows.length) {
      setCodeStatsById({});
      setStatsBulkLoading(false);
      return;
    }

    setStatsBulkLoading(true);
    try {
      const results = await Promise.all(
        rows.map(async (row) => {
          try {
            const snap = await get(ref(db, `codes/${row.id}/stats`));
            return {
              id: row.id,
              data: snap.exists() ? snap.val() : null,
              error: false,
            };
          } catch (err) {
            console.error('[stats]', err);
            return { id: row.id, data: null, error: true };
          }
        })
      );
      const map = {};
      results.forEach(({ id, data, error }) => {
        map[id] = { loading: false, data, error };
      });
      setCodeStatsById(map);
    } finally {
      setStatsBulkLoading(false);
    }
  }, [rows]);

  /** تحميل الإحصائيات المختصرة مرة عند توفر قائمة الأكواد */
  useEffect(() => {
    void loadAllMiniStats();
  }, [loadAllMiniStats]);

  const reloadAllStats = () => {
    void loadAllMiniStats();
  };

  /** اشتراك مباشر لإحصائيات الكود الموسّع فقط */
  useEffect(() => {
    if (expandedUnsubRef.current) {
      expandedUnsubRef.current();
      expandedUnsubRef.current = null;
    }
    if (expandedStatsRef.current) {
      off(expandedStatsRef.current);
      expandedStatsRef.current = null;
    }

    if (!expandedCodeId) {
      setExpandedStats(null);
      setExpandedStatsLoading(false);
      setExpandedStatsError(false);
      return undefined;
    }

    const statsRefPath = ref(db, `codes/${expandedCodeId}/stats`);
    expandedStatsRef.current = statsRefPath;
    setExpandedStatsLoading(true);
    setExpandedStatsError(false);

    const unsub = onValue(
      statsRefPath,
      (snap) => {
        setExpandedStats(snap.exists() ? snap.val() : null);
        setExpandedStatsLoading(false);
      },
      (err) => {
        console.error('[stats]', err);
        setExpandedStatsError(true);
        setExpandedStatsLoading(false);
      }
    );
    expandedUnsubRef.current = unsub;

    return () => {
      if (expandedUnsubRef.current) {
        expandedUnsubRef.current();
        expandedUnsubRef.current = null;
      }
      if (expandedStatsRef.current) {
        off(expandedStatsRef.current);
        expandedStatsRef.current = null;
      }
    };
  }, [expandedCodeId]);

  useEffect(() => {
    let unsub = null;
    const authUnsub = onAuthStateChanged(auth, async (user) => {
      if (unsub) unsub();
      unsub = null;
      setIndexByCode({});
      if (!user) return;
      const isAdmin = await adminProfileExistsForUid(user.uid);
      if (!isAdmin) return;
      unsub = onValue(ref(db, 'codeIndex'), (snap) => {
        setIndexByCode(snap.val() || {});
      });
    });
    return () => {
      authUnsub();
      if (unsub) unsub();
    };
  }, []);

  /** إحصائيات مجمّعة حسب الحالة الفعلية */
  const stats = useMemo(() => {
    let total = 0;
    let unused = 0;
    let active = 0;
    let expired = 0;
    for (const row of rows) {
      total += 1;
      const merged = indexByCode[row.code] ? { ...row, ...indexByCode[row.code] } : row;
      const eff = getEffectiveStatus(merged);
      if (eff === 'unused') unused += 1;
      else if (eff === 'active') active += 1;
      else if (eff === 'expired') expired += 1;
    }
    return { total, unused, active, expired };
  }, [rows, indexByCode]);

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
        created.push(formatCodeForDisplay(rec.code));
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
      const merged = indexByCode[row.code] ? { ...row, ...indexByCode[row.code] } : row;
      const eff = getEffectiveStatus(merged);
      const code = String(formatCodeForDisplay(row.code) || '').replace(/"/g, '""');
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

  const toggleCodeStats = useCallback((codeId) => {
    setExpandedCodeId((prev) => (prev === codeId ? null : codeId));
  }, []);

  const statBox = (label, value, colorVar) => (
    <div
      style={{
        flex: 1,
        minWidth: 120,
        padding: '12px 10px',
        borderRadius: 12,
        background: 'var(--surface)',
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
                  background: sel ? 'rgba(201,127,26,.1)' : undefined,
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
              background: 'rgba(36,143,85,.1)',
              border: '1px solid rgba(36,143,85,.35)',
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <button
              type="button"
              className="btn bgh bsm"
              style={{ width: 'auto', fontSize: 11, color: 'var(--muted)' }}
              disabled={statsBulkLoading || rows.length === 0}
              onClick={reloadAllStats}
            >
              🔄 تحديث الإحصائيات
            </button>
            <button type="button" className="btn bgh bsm" style={{ width: 'auto' }} onClick={handleExportCsv}>
              📤 تصدير CSV
            </button>
          </div>
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
                <th style={{ padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,.08)', width: 72 }} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 16, textAlign: 'center', color: 'var(--muted)' }}>
                    لا توجد أكواد بعد
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const merged = indexByCode[row.code] ? { ...row, ...indexByCode[row.code] } : row;
                  const eff = getEffectiveStatus(merged);
                  const rowColor =
                    eff === 'unused' ? 'var(--blue)' : eff === 'active' ? 'var(--green)' : eff === 'expired' ? 'var(--red)' : 'var(--muted)';
                  const bg =
                    eff === 'unused'
                      ? 'rgba(37,111,168,.06)'
                      : eff === 'active'
                        ? 'rgba(36,143,85,.06)'
                        : eff === 'expired'
                          ? 'rgba(230,57,80,.07)'
                          : 'rgba(255,255,255,.03)';
                  const isExpanded = expandedCodeId === row.id;
                  const statsEntry = codeStatsById[row.id];
                  const rowStats = statsEntry?.data ?? null;
                  const rowStatsLoading = statsBulkLoading && !statsEntry;
                  const activity = getCodeActivityInfo(rowStats);
                  const miniStats = rowStatsLoading ? '—' : formatCodeMiniStats(rowStats);
                  return (
                    <Fragment key={row.id}>
                      <tr
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleCodeStats(row.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleCodeStats(row.id);
                          }
                        }}
                        style={{
                          background: isExpanded ? 'rgba(201,127,26,.08)' : bg,
                          borderBottom: '1px solid rgba(255,255,255,.05)',
                          cursor: 'pointer',
                        }}
                      >
                        <td style={{ padding: '10px 6px', verticalAlign: 'top' }}>
                          <div
                            style={{
                              fontWeight: 800,
                              fontFamily: 'monospace',
                              color: 'var(--gold)',
                              fontSize: 13,
                              marginBottom: 5,
                            }}
                          >
                            {formatCodeForDisplay(row.code)}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              gap: '6px 10px',
                            }}
                          >
                            <CodeActivityBadge activity={activity} loading={rowStatsLoading} />
                            <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>{miniStats}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 6px', fontWeight: 800, color: rowColor }}>{statusLabel(eff)}</td>
                        <td style={{ padding: '10px 6px', color: 'var(--text)' }}>{row.duration ?? '—'} يوم</td>
                        <td style={{ padding: '10px 6px', color: 'var(--text)' }}>{row.price ?? '—'} ر.س</td>
                        <td style={{ padding: '10px 6px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(row.createdAt)}</td>
                        <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                          <button
                            type="button"
                            className={`btn bgh bxs ${isExpanded ? 'bo' : ''}`}
                            style={{ width: 'auto', fontSize: 10, padding: '4px 8px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCodeStats(row.id);
                            }}
                          >
                            📊 {isExpanded ? 'إخفاء' : 'تفاصيل'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr style={{ background: 'rgba(0,0,0,.25)' }}>
                          <td colSpan={6} style={{ padding: '8px 10px 14px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                            {expandedStatsError ? (
                              <div style={{ fontSize: 12, color: 'var(--red)', textAlign: 'center', padding: 8 }}>
                                تعذّر تحميل الإحصائيات
                              </div>
                            ) : (
                              <CodeStatsDetailPanel
                                loading={expandedStatsLoading}
                                stats={expandedStats}
                              />
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
