import { useEffect, useMemo, useState } from 'react';
import { openMarketingImpactReport } from '../../core/marketingImpactReport';

const RECIPIENT_TYPES = [
  { id: 'school', label: '🏫 مدرسة / مؤسسة تعليمية' },
  { id: 'company', label: '🏢 شركة / مؤسسة' },
  { id: 'sponsor', label: '🎯 راعٍ / شريك تسويقي' },
  { id: 'general', label: '📋 جهة مهتمة' },
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
}) {
  const [recipientName, setRecipientName] = useState('');
  const [recipientType, setRecipientType] = useState('company');
  const [customNote, setCustomNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setRecipientName('');
    setRecipientType(reportScope === 'school' ? 'school' : 'company');
    setCustomNote('');
  }, [open, reportScope, codeLabel]);

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
      platformAggregate: reportScope === 'platform' ? platformAggregate : null,
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
          border: '1px solid rgba(201,127,26,.28)',
          boxShadow: '0 24px 64px rgba(0,0,0,.45)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ctitle" id="marketing-report-title" style={{ marginBottom: 4 }}>
          📄 تقرير رسمي B2B
        </div>
        <p className="psub" style={{ marginBottom: 14, fontSize: 12 }}>
          {reportScope === 'platform'
            ? 'تقرير مجمّع بشعار لعيب زون — للإرسال لمدرسة أو شركة'
            : `تقرير كود ${codeLabel || ''} — أرقام حقيقية من الجلسات`}
        </p>

        <div className="ig" style={{ marginBottom: 10 }}>
          <label className="lbl">اسم الجهة الموجّه إليها التقرير *</label>
          <input
            className="inp"
            placeholder="مثال: مدرسة الأمل الأهلية"
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
