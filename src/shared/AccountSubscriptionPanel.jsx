import { formatCodeForDisplay } from '../firebaseHelpers';
import {
  fmt,
  formatAccountDate,
  formatAccountDateShort,
  subscriptionProgress,
  subscriptionTimeLeft,
} from './accountFormatters';
import '../styles/account-subscription.css';

const GAME_META = {
  titles: { label: 'الألقاب', icon: '🏷️', color: 'gold' },
  fameeri: { label: 'القميري', icon: '🧠', color: 'purple' },
  hesbah: { label: 'حسابة', icon: '🎯', color: 'blue' },
};

/**
 * لوحة الاشتراك — عرض فاخر للكود النشط أو دعوة للاشتراك
 */
export default function AccountSubscriptionPanel({
  activeCode,
  isActive,
  historyList = [],
  onGoPricing,
  onActivateCode,
}) {
  const totalActivations = historyList.length;
  const pastDays = historyList.reduce((sum, row) => sum + (Number(row.duration) || 0), 0);

  if (isActive && activeCode) {
    const codeStr = formatCodeForDisplay(activeCode.code) || '—';
    const { days, hours, minutes, urgent } = subscriptionTimeLeft(activeCode.expiresAt);
    const { pct, usedDays, totalDays } = subscriptionProgress(activeCode);

    return (
      <section className={`acct-sub acct-sub--active${urgent ? ' acct-sub--urgent' : ''}`}>
        <div className="acct-sub__glow" aria-hidden />
        <div className="acct-sub__head">
          <div>
            <span className="acct-sub__eyebrow">اشتراكك الآن</span>
            <h3 className="acct-sub__title">باقة نشطة</h3>
          </div>
          <span className={`acct-sub__status${urgent ? ' acct-sub__status--urgent' : ''}`}>
            {urgent ? '⚠️ ينتهي قريباً' : '✓ نشط'}
          </span>
        </div>

        <div className="acct-sub__code-block">
          <span className="acct-sub__code-lbl">كود الاشتراك</span>
          <span className="acct-sub__code">{codeStr}</span>
        </div>

        <div className="acct-sub__countdown">
          <span className="acct-sub__countdown-num">{fmt(days)}</span>
          <span className="acct-sub__countdown-unit">يوم متبقي</span>
          {(hours > 0 || days === 0) && (
            <span className="acct-sub__countdown-sub">
              + {fmt(hours)} س · {fmt(minutes)} د
            </span>
          )}
        </div>

        <div className="acct-sub__progress">
          <div className="acct-sub__progress-labels">
            <span>استُخدم {fmt(usedDays)} من {fmt(totalDays)} يوم</span>
            <span>{fmt(100 - pct)}% متبقي</span>
          </div>
          <div className="acct-sub__progress-track">
            <div className="acct-sub__progress-fill" style={{ width: `${100 - pct}%` }} />
          </div>
        </div>

        <div className="acct-sub__details">
          <div className="acct-sub__detail">
            <span className="acct-sub__detail-lbl">بدء التفعيل</span>
            <span className="acct-sub__detail-val">{formatAccountDate(activeCode.activatedAt)}</span>
          </div>
          <div className="acct-sub__detail">
            <span className="acct-sub__detail-lbl">ينتهي في</span>
            <span className="acct-sub__detail-val">{formatAccountDate(activeCode.expiresAt)}</span>
          </div>
          <div className="acct-sub__detail">
            <span className="acct-sub__detail-lbl">مدة الباقة</span>
            <span className="acct-sub__detail-val">{fmt(activeCode.duration)} يوم</span>
          </div>
          <div className="acct-sub__detail">
            <span className="acct-sub__detail-lbl">سجل التفعيلات</span>
            <span className="acct-sub__detail-val">{fmt(totalActivations)} مرة</span>
          </div>
        </div>

        <div className="acct-sub__actions">
          <button type="button" className="btn bo" onClick={onActivateCode}>
            🔄 تفعيل كود جديد
          </button>
          {urgent ? (
            <button type="button" className="btn bg" onClick={onGoPricing}>
              جدّد الاشتراك
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="acct-sub acct-sub--empty">
      <div className="acct-sub__glow acct-sub__glow--muted" aria-hidden />
      <div className="acct-sub__empty-icon">💎</div>
      <h3 className="acct-sub__empty-title">لا يوجد اشتراك نشط</h3>
      <p className="acct-sub__empty-sub">
        فعّل كوداً أو اشترك من الباقات لاستضافة الجلسات وفتح كل مزايا الساحة.
      </p>

      {totalActivations > 0 ? (
        <div className="acct-sub__empty-meta">
          <span>{fmt(totalActivations)} تفعيل سابق</span>
          <span>·</span>
          <span>{fmt(pastDays)} يوم إجمالي</span>
        </div>
      ) : null}

      <div className="acct-sub__actions">
        <button type="button" className="btn bg" onClick={onGoPricing}>
          اشترك الآن
        </button>
        <button type="button" className="btn bo" onClick={onActivateCode}>
          تفعيل كود
        </button>
      </div>
    </section>
  );
}

export { GAME_META };
