import { useCallback, useEffect, useRef, useState } from 'react';

const HOUR_MS = 60 * 60 * 1000;

/**
 * @param {number} expiresAt
 * @returns {string}
 */
export function formatTimeRemaining(expiresAt) {
  const remaining = expiresAt - Date.now();
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

  if (remaining <= 0) return '0 دقيقة';
  if (days > 0) return `${days} يوم`;
  if (hours > 0) return `${hours} ساعة`;
  return `${minutes} دقيقة`;
}

function formatDetailedRemaining(expiresAt) {
  const remaining = Math.max(0, expiresAt - Date.now());
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  const parts = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? 'يوم' : 'أيام'}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} دقيقة`);
  return parts.join(' و ') || 'أقل من دقيقة';
}

function formatExpiryDate(expiresAt) {
  try {
    return new Date(expiresAt).toLocaleString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
}

/**
 * @param {{ activeCode: { code?: string, duration?: number, activatedAt?: number|null, expiresAt: number }, onExpired: () => void }} props
 */
export default function SubscriptionTimer({ activeCode, onExpired }) {
  const [now, setNow] = useState(() => Date.now());
  const [modalOpen, setModalOpen] = useState(false);
  const expiredCalledRef = useRef(false);

  const expiresAt = activeCode?.expiresAt;

  const fireExpired = useCallback(() => {
    if (expiredCalledRef.current) return;
    expiredCalledRef.current = true;
    onExpired();
  }, [onExpired]);

  useEffect(() => {
    if (expiresAt == null) return undefined;

    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= expiresAt) fireExpired();
    };

    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [expiresAt, fireExpired]);

  if (!activeCode || expiresAt == null) return null;

  const remaining = expiresAt - now;
  if (remaining <= 0) return null;

  const urgent = remaining < HOUR_MS;
  const label = formatTimeRemaining(expiresAt);
  const durationDays = activeCode.duration ?? '—';
  const codeStr = activeCode.code ?? '—';

  const badgeStyle = {
    padding: '6px 12px',
    borderRadius: 8,
    fontSize: 12,
    cursor: 'pointer',
    border: `1px solid ${urgent ? 'rgba(230,57,80,.45)' : 'rgba(46,204,113,.35)'}`,
    background: urgent ? 'rgba(230,57,80,.12)' : 'rgba(46,204,113,.1)',
    color: urgent ? 'var(--red)' : 'var(--green)',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    maxWidth: 'min(42vw, 200px)',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  };

  return (
    <>
      <button
        type="button"
        className="btn bgh bsm"
        style={{
          ...badgeStyle,
          width: 'auto',
          justifyContent: 'center',
          gap: 4
        }}
        aria-label="تفاصيل الاشتراك"
        onClick={() => setModalOpen(true)}
      >
        <span>⏳</span>
        <span>{label}</span>
      </button>

      {modalOpen ? (
        <div
          className="mbg"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="modal" style={{ textAlign: 'right', maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="micn">⏳</div>
            <div className="mtitle">اشتراكك النشط</div>
            <div className="msub" style={{ textAlign: 'right' }}>
              تفاصيل الكود والمدة المتبقية
            </div>

            <div className="card2" style={{ marginBottom: 12, textAlign: 'right' }}>
              <div className="lbl">الكود</div>
              <div style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 900, fontSize: 18, color: 'var(--gold)' }}>
                {codeStr}
              </div>
            </div>

            <div className="card2" style={{ marginBottom: 12, textAlign: 'right' }}>
              <div className="lbl">مدة الباقة (بالأيام)</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{durationDays}</div>
            </div>

            <div className="card2" style={{ marginBottom: 12, textAlign: 'right' }}>
              <div className="lbl">تاريخ ووقت الانتهاء</div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{formatExpiryDate(expiresAt)}</div>
            </div>

            <div
              className={`card2 ${urgent ? 'ar' : 'av'}`}
              style={{ marginBottom: 14, textAlign: 'right' }}
            >
              <div className="lbl">الوقت المتبقي (تفصيلي)</div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{formatDetailedRemaining(expiresAt)}</div>
            </div>

            <button type="button" className="btn bg" onClick={() => setModalOpen(false)}>
              إغلاق
            </button>

            {urgent ? (
              <button
                type="button"
                className="btn bo mt2"
                onClick={() => {
                  setModalOpen(false);
                  window.dispatchEvent(new CustomEvent('pfcc-open-packages'));
                }}
              >
                🔄 جدّد الاشتراك
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
