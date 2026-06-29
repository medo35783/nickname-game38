import { useEffect, useMemo, useState } from 'react';
import { openMarketingImpactReport } from '../../core/marketingImpactReport';
import { REPORT_PURPOSES } from '../../core/marketingStatsHelpers';
import { fetchSponsorsAdmin } from '../../core/platformSponsors';

const RECIPIENT_TYPES = [
  { id: 'school', label: '🏫 مدرسة / مؤسسة تعليمية' },
  { id: 'company', label: '🏢 شركة / مؤسسة' },
  { id: 'sponsor', label: '🎯 راعٍ / شريك تسويقي' },
  { id: 'general', label: '📋 جهة مهتمة' },
];

const PURPOSE_OPTIONS = [
  REPORT_PURPOSES.pitch,
  REPORT_PURPOSES.sponsorship,
  REPORT_PURPOSES.prize,
  REPORT_PURPOSES.full,
];

/**
 * نافذة إعداد تقرير B2B رسمي قبل الطباعة / PDF
 */
export default function MarketingReportDialog({
  open,
  onClose,
  stats,
  codeLabel = null,
  codeMeta = null,
  reportScope = 'code',
  platformAggregate = null,
  notify,
  initialSponsorId = null,
  initialReportPurpose = null,
}) {
  const [recipientName, setRecipientName] = useState('');
  const [recipientType, setRecipientType] = useState('company');
  const [customNote, setCustomNote] = useState('');
  const [reportPurpose, setReportPurpose] = useState('full');
  const [sponsors, setSponsors] = useState([]);
  const [sponsorId, setSponsorId] = useState('');

  useEffect(() => {
    if (!open) return;
    setRecipientName('');
    setRecipientType(reportScope === 'school' ? 'school' : 'sponsor');
    setCustomNote('');
    setReportPurpose(initialReportPurpose || 'full');
    setSponsorId(initialReportPurpose === 'pitch' ? '' : initialSponsorId || '');
    fetchSponsorsAdmin()
      .then((list) => {
        const active = list.filter((s) => s.active !== false);
        setSponsors(active);
        if (initialSponsorId && active.some((s) => s.id === initialSponsorId)) {
          setSponsorId(initialSponsorId);
          const sp = active.find((s) => s.id === initialSponsorId);
          if (sp) setRecipientName((prev) => prev || sp.name);
        }
      })
      .catch(() => setSponsors([]));
  }, [open, reportScope, codeLabel, initialSponsorId, initialReportPurpose]);

  const selectedSponsor = useMemo(
    () => sponsors.find((s) => s.id === sponsorId) || null,
    [sponsors, sponsorId]
  );

  const hasData = useMemo(() => {
    if (!stats) return false;
    return (Number(stats.totalRealSessions) || 0) > 0 || (Number(stats.totalRounds) || 0) > 0;
  }, [stats]);

  if (!open) return null;

  const handleGenerate = () => {
    if (!recipientName.trim()) {
      notify?.('أدخل اسم المدرسة أو الشركة الموجّه إليها التقرير', 'error');
      return;
    }
    if (!hasData) {
      notify?.('لا توجد بيانات كافية — ابدأ جلسة لعب أولاً', 'error');
      return;
    }

    const ok = openMarketingImpactReport(stats, {
      recipientName: recipientName.trim(),
      recipientType,
      codeLabel,
      codeMeta,
      reportScope,
      customNote,
      reportPurpose,
      platformAggregate: reportScope === 'platform' ? platformAggregate : null,
      sponsorMeta: selectedSponsor
        ? {
            name: selectedSponsor.name,
            logoUrl: selectedSponsor.logoUrl,
            tagline: selectedSponsor.tagline,
            prizeOffer: selectedSponsor.prizeOffer,
          }
        : null,
    });

    if (ok) {
      notify?.('تم فتح التقرير — اختر «طباعة» ثم «حفظ كـ PDF»', 'success');
      onClose?.();
    } else {
      notify?.('تعذّر فتح النافذة — اسمح بالنوافذ المنبثقة وحاول مجدداً', 'error');
    }
  };

  return (
    <div
      className="marketing-report-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="marketing-report-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 12000,
        background: 'rgba(4,8,18,.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="card"
        style={{
          width: 'min(480px, 100%)',
          maxHeight: '90vh',
          overflow: 'auto',
          border: '1px solid rgba(37,111,168,.22)',
          boxShadow: '0 24px 64px rgba(0,0,0,.45)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ctitle" id="marketing-report-title" style={{ marginBottom: 4 }}>
          📄 تقرير رسمي B2B
        </div>
        <p className="psub" style={{ marginBottom: 14, fontSize: 12 }}>
          {reportScope === 'platform'
            ? 'كشف أرقام + أسماء المشرفين والمتسابقين — للإرسال للراعي أو مقدّم الجائزة'
            : `تقرير كود ${codeLabel || ''} — أرقام وأسماء حقيقية من الجلسات`}
        </p>

        <div className="ig" style={{ marginBottom: 12 }}>
          <label className="lbl">نوع التقرير *</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PURPOSE_OPTIONS.map((p) => {
              const sel = reportPurpose === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`btn bgh ${sel ? 'bo' : ''}`}
                  style={{
                    width: '100%',
                    textAlign: 'right',
                    padding: '10px 12px',
                    borderColor: sel ? 'var(--brand-blue)' : undefined,
                  }}
                  onClick={() => setReportPurpose(p.id)}
                >
                  <div style={{ fontWeight: 900, fontSize: 13 }}>{p.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, fontWeight: 600 }}>{p.subtitle}</div>
                </button>
              );
            })}
          </div>
        </div>

        {sponsors.length > 0 && reportPurpose !== 'pitch' ? (
          <div className="ig" style={{ marginBottom: 10 }}>
            <label className="lbl">الراعي (شعار يظهر في التقرير)</label>
            <select
              className="inp"
              value={sponsorId}
              onChange={(e) => {
                setSponsorId(e.target.value);
                const sp = sponsors.find((s) => s.id === e.target.value);
                if (sp && !recipientName.trim()) setRecipientName(sp.name);
              }}
              style={{ cursor: 'pointer' }}
            >
              <option value="">— بدون شعار —</option>
              {sponsors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="ig" style={{ marginBottom: 10 }}>
          <label className="lbl">اسم الجهة الموجّه إليها التقرير *</label>
          <input
            className="inp"
            placeholder="مثال: شركة الراعي / مدرسة الأمل"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="ig" style={{ marginBottom: 10 }}>
          <label className="lbl">نوع الجهة</label>
          <select
            className="inp"
            value={recipientType}
            onChange={(e) => setRecipientType(e.target.value)}
            style={{ cursor: 'pointer' }}
          >
            {RECIPIENT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ig" style={{ marginBottom: 14 }}>
          <label className="lbl">ملاحظة اختيارية (تظهر في التقرير)</label>
          <textarea
            className="inp"
            rows={3}
            placeholder="مثال: فعالية اليوم الوطني — قسم المتوسط"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            style={{ resize: 'vertical', minHeight: 72 }}
          />
        </div>

        {!hasData && (
          <div
            style={{
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(230,57,80,.08)',
              border: '1px solid rgba(230,57,80,.25)',
              color: 'var(--red)',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            لا توجد جلسات مسجّلة بعد — التقرير يحتاج بيانات فعلية.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn bg" style={{ flex: 1, minWidth: 140 }} onClick={handleGenerate}>
            🖨️ إنشاء التقرير / PDF
          </button>
          <button type="button" className="btn bgh" style={{ flex: 1, minWidth: 100 }} onClick={onClose}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
