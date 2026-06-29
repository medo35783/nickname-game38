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
import CodeAdminNote from './CodeAdminNote';
import CodeSponsorLink from './CodeSponsorLink';
import { formatCodeMiniStats, getCodeActivityInfo } from './codeActivityHelpers';
import { aggregateMarketingMetrics, formatEngagementMinutes } from '../../core/marketingStatsHelpers';
import MarketingReportDialog from './MarketingReportDialog';

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

function getCodeSource(row) {
  return row?.source === 'promo' ? 'promo' : 'paid';
}

function formatCodeDuration(row) {
  const h = Number(row?.durationHours);
  if (Number.isFinite(h) && h > 0) return h === 1 ? '1 ساعة' : `${h} ساعات`;
  const d = Number(row?.duration);
  return d ? `${d} يوم` : '—';
}

function sourceLabel(source) {
  return source === 'promo' ? 'ترويجي' : 'مدفوع';
}

function mergeByGameStats(a = {}, b = {}) {
  const keys = ['titles', 'fameeri', 'hesbah'];
  const out = { ...a };
  keys.forEach((k) => {
    const x = a[k] || {};
    const y = b[k] || {};
    if (!x.sessions && !y.sessions) return;
    out[k] = {
      sessions: (x.sessions || 0) + (y.sessions || 0),
      realSessions: (x.realSessions || 0) + (y.realSessions || 0),
      rounds: (x.rounds || 0) + (y.rounds || 0),
      participants: (x.participants || 0) + (y.participants || 0),
      engagementMinutes: (x.engagementMinutes || 0) + (y.engagementMinutes || 0),
      roundReach: (x.roundReach || 0) + (y.roundReach || 0),
      completed: (x.completed || 0) + (y.completed || 0),
      peakPlayers: Math.max(x.peakPlayers || 0, y.peakPlayers || 0),
    };
  });
  return out;
}

/**
 * لوحة إدارة أكواد الاشتراك — إحصائيات، توليد، قائمة، تصدير CSV
 * @param {{ notify: (text: string, type?: string) => void }} props
 */
export default function AdminCodesPanel({ notify, layout = 'standalone', sharedSnapshot = null }) {
  const useShared = Boolean(sharedSnapshot);
  const isPage = layout === 'page';
  const isEmbedded = layout === 'embedded';
  /** سجل الأكواد من Realtime DB */
  const [internalRows, setInternalRows] = useState([]);
  /** حالة التفعيل الفعلية من codeIndex */
  const [internalIndexByCode, setInternalIndexByCode] = useState({});
  /** الباقة المختارة للتوليد */
  const [selectedPkg, setSelectedPkg] = useState(PACKAGES[0]);
  /** عدد الأكواد المراد توليدها */
  const [countInput, setCountInput] = useState(10);
  /** ملاحظة ترويج (محل / عائلة) */
  const [promoNote, setPromoNote] = useState('');
  /** فلتر مصدر الكود في القائمة */
  const [sourceFilter, setSourceFilter] = useState('all');
  /** تحميل أثناء التوليد */
  const [generating, setGenerating] = useState(false);
  /** آخر دفعة مولّدة (للعرض والنسخ) */
  const [generatedLines, setGeneratedLines] = useState([]);
  /** رسالة نجاح بعد التوليد */
  const [successMsg, setSuccessMsg] = useState('');
  /** كود مُوسَّع لعرض إحصائيات الجلسات */
  const [expandedCodeId, setExpandedCodeId] = useState(null);
  /** إحصائيات مختصرة للجدول (get عند التحميل / التحديث اليدوي) */
  const [internalCodeStatsById, setInternalCodeStatsById] = useState({});
  /** تحميل الإحصائيات المختصرة */
  const [internalStatsBulkLoading, setInternalStatsBulkLoading] = useState(false);
  /** بيانات لوحة التفاصيل الموسّعة (onValue مباشر) */
  const [expandedStats, setExpandedStats] = useState(null);
  const [expandedStatsLoading, setExpandedStatsLoading] = useState(false);
  const [expandedStatsError, setExpandedStatsError] = useState(false);
  const expandedStatsRef = useRef(null);
  const expandedUnsubRef = useRef(null);
  const [reportDialog, setReportDialog] = useState(null);

  const rows = useShared ? sharedSnapshot.rows : internalRows;
  const indexByCode = useShared ? sharedSnapshot.indexByCode : internalIndexByCode;
  const codeStatsById = useShared ? sharedSnapshot.codeStatsById : internalCodeStatsById;
  const statsBulkLoading = useShared ? sharedSnapshot.loading : internalStatsBulkLoading;

  // الاشتراك في codes بعد تأكيد جلسة مشرف (تجنّب قراءة أثناء auth مجهول)
  useEffect(() => {
    if (useShared) return undefined;
    let dbUnsub = null;

    const authUnsub = onAuthStateChanged(auth, async (user) => {
      if (dbUnsub) dbUnsub();
      dbUnsub = null;
      setInternalRows([]);

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
          setInternalRows(list);
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
  }, [notify, useShared]);

  useEffect(() => {
    if (useShared || !internalRows.length) return;
    ensureCodeIndexesFromRows(internalRows).catch((err) => {
      console.warn('ensureCodeIndexesFromRows:', err);
    });
  }, [internalRows, useShared]);

  const loadAllMiniStats = useCallback(async () => {
    if (useShared) return;
    if (!internalRows.length) {
      setInternalCodeStatsById({});
      setInternalStatsBulkLoading(false);
      return;
    }

    setInternalStatsBulkLoading(true);
    try {
      const results = await Promise.all(
        internalRows.map(async (row) => {
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
      setInternalCodeStatsById(map);
    } finally {
      setInternalStatsBulkLoading(false);
    }
  }, [internalRows, useShared]);

  const reloadAllStats = useShared
    ? () => sharedSnapshot.reloadAllStats?.()
    : () => {
        void loadAllMiniStats();
      };

  /** تحميل الإحصائيات المختصرة مرة عند توفر قائمة الأكواد */
  useEffect(() => {
    if (useShared) return;
    void loadAllMiniStats();
  }, [loadAllMiniStats, useShared]);

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
    if (useShared) return undefined;
    let unsub = null;
    const authUnsub = onAuthStateChanged(auth, async (user) => {
      if (unsub) unsub();
      unsub = null;
      setInternalIndexByCode({});
      if (!user) return;
      const isAdmin = await adminProfileExistsForUid(user.uid);
      if (!isAdmin) return;
      unsub = onValue(ref(db, 'codeIndex'), (snap) => {
        setInternalIndexByCode(snap.val() || {});
      });
    });
    return () => {
      authUnsub();
      if (unsub) unsub();
    };
  }, [useShared]);

  /** إحصائيات مجمّعة حسب الحالة الفعلية */
  const stats = useMemo(() => {
    let total = 0;
    let unused = 0;
    let active = 0;
    let expired = 0;
    let promo = 0;
    let paid = 0;
    for (const row of rows) {
      total += 1;
      const merged = indexByCode[row.code] ? { ...row, ...indexByCode[row.code] } : row;
      const eff = getEffectiveStatus(merged);
      if (eff === 'unused') unused += 1;
      else if (eff === 'active') active += 1;
      else if (eff === 'expired') expired += 1;
      if (getCodeSource(merged) === 'promo') promo += 1;
      else paid += 1;
    }
    return { total, unused, active, expired, promo, paid };
  }, [rows, indexByCode]);

  const filteredRows = useMemo(() => {
    if (sourceFilter === 'all') return rows;
    return rows.filter((row) => {
      const merged = indexByCode[row.code] ? { ...row, ...indexByCode[row.code] } : row;
      return getCodeSource(merged) === sourceFilter;
    });
  }, [rows, indexByCode, sourceFilter]);

  const platformMarketing = useMemo(() => {
    const statsList = Object.values(codeStatsById)
      .map((entry) => entry?.data)
      .filter(Boolean);
    return aggregateMarketingMetrics(statsList);
  }, [codeStatsById]);

  const clampCount = useCallback((n) => {
    const x = Number.isFinite(n) ? Math.floor(n) : 1;
    return Math.min(100, Math.max(1, x));
  }, []);

  /** توليد دفعة أكواد مدفوعة */
  const handleGenerate = async () => {
    const n = clampCount(Number(countInput));
    setCountInput(n);
    setGenerating(true);
    setSuccessMsg('');
    setGeneratedLines([]);
    const created = [];
    try {
      for (let i = 0; i < n; i += 1) {
        const rec = await createCode(selectedPkg.duration, selectedPkg.price, { source: 'paid' });
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

  /** توليد أكواد ترويجية — 6 ساعات، بدون احتساب إيراد */
  const handleGeneratePromo = async () => {
    const n = clampCount(Number(countInput));
    setCountInput(n);
    setGenerating(true);
    setSuccessMsg('');
    setGeneratedLines([]);
    const created = [];
    try {
      for (let i = 0; i < n; i += 1) {
        const rec = await createCode(0, 0, {
          source: 'promo',
          durationHours: 6,
          promoNote: promoNote.trim() || undefined,
        });
        created.push(formatCodeForDisplay(rec.code));
      }
      setGeneratedLines(created);
      const msg = `تم توليد ${created.length} كود ترويجي (6 ساعات)`;
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

  /** تصدير تقرير تسويقي لكل الأكواد */
  const handleExportMarketingCsv = () => {
    if (!rows.length) {
      notify('لا توجد بيانات للتصدير', 'info');
      return;
    }
    const header = [
      'code',
      'status',
      'sessions',
      'participants',
      'peak_players',
      'rounds',
      'sponsor_reach',
      'engagement_minutes',
      'completion_rate',
      'coupon_ready_sessions',
    ];
    const lines = rows.map((row) => {
      const merged = indexByCode[row.code] ? { ...row, ...indexByCode[row.code] } : row;
      const eff = getEffectiveStatus(merged);
      const rowStats = codeStatsById[row.id]?.data;
      const m = aggregateMarketingMetrics(rowStats ? [rowStats] : []);
      const code = String(formatCodeForDisplay(row.code) || '').replace(/"/g, '""');
      return [
        `"${code}"`,
        `"${eff}"`,
        m.totalRealSessions,
        m.totalParticipants,
        m.peakPlayers,
        m.totalRounds,
        m.roundReach,
        Math.round(m.totalEngagementMinutes),
        m.completionRate,
        m.couponReadySessions,
      ].join(',');
    });
    const csv = [header.join(','), ...lines].join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketing-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify('تم تصدير التقرير التسويقي', 'success');
  };

  /** تصدير كل الأكواد المعروضة كـ CSV */
  const handleExportCsv = () => {
    if (!rows.length) {
      notify('لا توجد بيانات للتصدير', 'info');
      return;
    }
    const header = ['code', 'status', 'source', 'duration_days', 'duration_hours', 'price_sar', 'promo_note', 'created_at'];
    const lines = rows.map((row) => {
      const merged = indexByCode[row.code] ? { ...row, ...indexByCode[row.code] } : row;
      const eff = getEffectiveStatus(merged);
      const code = String(formatCodeForDisplay(row.code) || '').replace(/"/g, '""');
      const created = row.createdAt ? new Date(row.createdAt).toISOString() : '';
      const note = String(row.promoNote || '').replace(/"/g, '""');
      return `"${code}","${eff}","${getCodeSource(merged)}",${Number(row.duration) || 0},${Number(row.durationHours) || 0},${Number(row.price) || 0},"${note}","${created}"`;
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

  const openCodeReport = useCallback(
    (row, rowStats) => {
      const merged = indexByCode[row.code] ? { ...row, ...indexByCode[row.code] } : row;
      const eff = getEffectiveStatus(merged);
      setReportDialog({
        reportScope: 'code',
        stats: rowStats,
        codeLabel: formatCodeForDisplay(row.code),
        codeMeta: {
          duration: row.duration,
          statusLabel: statusLabel(eff),
          activatedAt: merged.activatedAt || row.activatedAt || null,
        },
        initialSponsorId: merged.sponsorId || row.sponsorId || null,
      });
    },
    [indexByCode]
  );

  const openPlatformReport = useCallback(() => {
    const statsList = Object.values(codeStatsById)
      .map((entry) => entry?.data)
      .filter(Boolean);
    const syntheticStats = statsList.length
      ? {
          ...statsList.reduce((acc, s) => ({
            totalRealSessions: (acc.totalRealSessions || 0) + (Number(s.totalRealSessions) || 0),
            totalPlayerCount: (acc.totalPlayerCount || 0) + (Number(s.totalPlayerCount) || 0),
            totalRounds: (acc.totalRounds || 0) + (Number(s.totalRounds) || 0),
            totalEngagementMinutes: (acc.totalEngagementMinutes || 0) + (Number(s.totalEngagementMinutes) || 0),
            roundReach: (acc.roundReach || 0) + (Number(s.roundReach) || 0),
            completedGames: (acc.completedGames || 0) + (Number(s.completedGames) || 0),
            abandonedGames: (acc.abandonedGames || 0) + (Number(s.abandonedGames) || 0),
            totalDurationMinutes: (acc.totalDurationMinutes || 0) + (Number(s.totalDurationMinutes) || 0),
            peakPlayers: Math.max(acc.peakPlayers || 0, Number(s.peakPlayers) || 0),
            lastActiveAt: Math.max(acc.lastActiveAt || 0, Number(s.lastActiveAt) || 0),
            gamesPlayed: {
              titles: (acc.gamesPlayed?.titles || 0) + (Number(s.gamesPlayed?.titles) || 0),
              fameeri: (acc.gamesPlayed?.fameeri || 0) + (Number(s.gamesPlayed?.fameeri) || 0),
              hesbah: (acc.gamesPlayed?.hesbah || 0) + (Number(s.gamesPlayed?.hesbah) || 0),
            },
            byGame: mergeByGameStats(acc.byGame, s.byGame),
            recentSessions: [...(acc.recentSessions || []), ...(Array.isArray(s.recentSessions) ? s.recentSessions : [])]
              .sort((a, b) => (a.ts || 0) - (b.ts || 0))
              .slice(-20),
            uniqueParticipantLabels: [
              ...new Set([
                ...(acc.uniqueParticipantLabels || []),
                ...(Array.isArray(s.uniqueParticipantLabels) ? s.uniqueParticipantLabels : []),
              ]),
            ].slice(0, 120),
          }), {}),
        }
      : null;

    setReportDialog({
      reportScope: 'platform',
      stats: syntheticStats,
      platformAggregate: platformMarketing,
    });
  }, [codeStatsById, platformMarketing]);

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
    <div
      className={isEmbedded ? 'admin-codes-embedded' : isPage ? 'admin-codes-page' : 'scr'}
      style={{ paddingBottom: isEmbedded ? 0 : isPage ? 0 : 24 }}
    >
      {(layout === 'standalone' || isPage) && (
        <>
          <div className="ptitle" style={{ fontSize: 20 }}>
            🎟️ لوحة الأكواد
          </div>
          <div className="psub" style={{ marginBottom: 12 }}>
            إحصائيات، توليد، وقائمة الأكواد
          </div>
        </>
      )}

      {/* إحصائيات */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="ctitle">📊 إحصائيات الأكواد</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {statBox('إجمالي الأكواد', stats.total, 'var(--brand-blue)')}
          {statBox('غير مستخدم', stats.unused, 'var(--blue)')}
          {statBox('مُفعّل', stats.active, 'var(--green)')}
          {statBox('منتهي', stats.expired, 'var(--red)')}
          {statBox('ترويجي', stats.promo, 'var(--gold)')}
          {statBox('مدفوع', stats.paid, 'var(--brand-blue)')}
        </div>
      </div>

      {layout === 'standalone' && (
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="ctitle">📣 ملخص تسويقي للمنصة</div>
        <div className="psub" style={{ marginBottom: 10, fontSize: 11 }}>
          أرقام مجمّعة من {platformMarketing.codesWithActivity || 0} كود نشط —
          ① رعاية الجولات · ② جائزة برعاية · كشف مشرفين ومتسابقين
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {statBox('مشاركات المتسابقين', platformMarketing.totalParticipants, 'var(--brand-blue)')}
          {statBox('ذروة حضور', platformMarketing.peakPlayers, 'var(--purple)')}
          {statBox('جولات قابلة للرعاية', platformMarketing.totalRounds, 'var(--fameeri-primary)')}
          {statBox('ظهور الرعاية', platformMarketing.roundReach, 'var(--green)')}
          {statBox('دقائق التفاعل', formatEngagementMinutes(platformMarketing.totalEngagementMinutes, { short: true }), 'var(--blue)')}
          {statBox('جلسات مؤهلة للجوائز', platformMarketing.couponReadySessions, 'var(--brand-orange)')}
        </div>
        <button
          type="button"
          className="btn bg mt2"
          style={{ width: '100%' }}
          onClick={openPlatformReport}
        >
          📄 إنشاء تقرير B2B رسمي (PDF + كشف أسماء)
        </button>
      </div>
      )}

      {/* توليد أكواد مدفوعة */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="ctitle">✨ توليد أكواد مدفوعة</div>

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
                  borderColor: sel ? 'var(--brand-blue)' : undefined,
                  background: sel ? 'rgba(37,111,168,.1)' : undefined,
                  color: sel ? 'var(--brand-blue)' : undefined,
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
          {generating ? '⏳ جاري التوليد...' : '⚡ توليد أكواد مدفوعة'}
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

      {/* توليد أكواد ترويجية */}
      <div
        className="card"
        style={{
          marginBottom: 12,
          border: '1px solid rgba(212,175,55,.25)',
          background: 'linear-gradient(135deg, rgba(212,175,55,.06), transparent)',
        }}
      >
        <div className="ctitle">🎁 أكواد ترويجية (6 ساعات)</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.55 }}>
          للأهل والأصدقاء ومحلات add value — لا تُعدّ باقة رسمية ولا تُحتسب ضمن الإيرادات.
        </div>

        <div className="ig">
          <label className="lbl">ملاحظة (اختياري — محل / عائلة)</label>
          <input
            className="inp"
            type="text"
            maxLength={120}
            value={promoNote}
            disabled={generating}
            placeholder="مثال: مقهى النخيل"
            onChange={(e) => setPromoNote(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="btn bgh mt2"
          style={{ width: '100%', borderColor: 'rgba(212,175,55,.45)', color: 'var(--gold)' }}
          disabled={generating}
          onClick={handleGeneratePromo}
        >
          {generating ? '⏳ جاري التوليد...' : '🎁 توليد أكواد ترويجية'}
        </button>
      </div>

      {/* قائمة الأكواد */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          <div className="ctitle" style={{ marginBottom: 0 }}>
            📋 جميع الأكواد ({filteredRows.length}{sourceFilter !== 'all' ? ` / ${rows.length}` : ''})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'paid', label: 'مدفوع' },
              { id: 'promo', label: 'ترويجي' },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`btn bgh bxs ${sourceFilter === id ? 'bo' : ''}`}
                style={{ width: 'auto', fontSize: 10 }}
                onClick={() => setSourceFilter(id)}
              >
                {label}
              </button>
            ))}
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
            <button type="button" className="btn bgh bsm" style={{ width: 'auto' }} onClick={handleExportMarketingCsv}>
              📣 تقرير تسويقي
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ color: 'var(--muted)', textAlign: 'right' }}>
                <th style={{ padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>الكود</th>
                <th style={{ padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>الحالة</th>
                <th style={{ padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>المصدر</th>
                <th style={{ padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>المدة</th>
                <th style={{ padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>السعر</th>
                <th style={{ padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>تاريخ الإنشاء</th>
                <th style={{ padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,.08)', width: 72 }} />
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 16, textAlign: 'center', color: 'var(--muted)' }}>
                    {rows.length === 0 ? 'لا توجد أكواد بعد' : 'لا توجد أكواد مطابقة للفلتر'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
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
                          background: isExpanded ? 'rgba(37,111,168,.08)' : bg,
                          borderBottom: '1px solid rgba(255,255,255,.05)',
                          cursor: 'pointer',
                        }}
                      >
                        <td style={{ padding: '10px 6px', verticalAlign: 'top' }}>
                          <div
                            style={{
                              fontWeight: 800,
                              fontFamily: 'monospace',
                              color: 'var(--brand-blue)',
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
                        <td style={{ padding: '10px 6px' }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: getCodeSource(merged) === 'promo' ? 'rgba(212,175,55,.15)' : 'rgba(37,111,168,.12)',
                              color: getCodeSource(merged) === 'promo' ? 'var(--gold)' : 'var(--brand-blue)',
                            }}
                          >
                            {sourceLabel(getCodeSource(merged))}
                          </span>
                        </td>
                        <td style={{ padding: '10px 6px', color: 'var(--text)' }}>{formatCodeDuration(merged)}</td>
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
                              <>
                                <CodeAdminNote
                                  codeId={row.id}
                                  initialNote={merged.adminNote || row.adminNote}
                                  notify={notify}
                                />
                                <CodeSponsorLink
                                  codeId={row.id}
                                  codeRow={row}
                                  indexRow={merged}
                                  notify={notify}
                                />
                                <CodeStatsDetailPanel
                                  loading={expandedStatsLoading}
                                  stats={expandedStats}
                                  codeLabel={formatCodeForDisplay(row.code)}
                                  onOpenReport={() => openCodeReport(row, expandedStats)}
                                />
                              </>
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

      <MarketingReportDialog
        open={Boolean(reportDialog)}
        onClose={() => setReportDialog(null)}
        stats={reportDialog?.stats}
        codeLabel={reportDialog?.codeLabel}
        codeMeta={reportDialog?.codeMeta}
        reportScope={reportDialog?.reportScope || 'code'}
        platformAggregate={reportDialog?.platformAggregate}
        initialSponsorId={reportDialog?.initialSponsorId || null}
        notify={notify}
      />
    </div>
  );
}
