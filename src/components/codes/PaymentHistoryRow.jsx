import { formatAccountDate } from '../../shared/accountFormatters';

const PLAN_LABELS = { 1: 'لمسة سريعة', 3: 'جمعة اللمة', 7: 'أسبوع البطولة' };

function shortPaymentId(id) {
  if (!id || typeof id !== 'string') return '—';
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…`;
}

/**
 * صف واحد في سجل عمليات Moyasar
 */
export default function PaymentHistoryRow({ row }) {
  const planLabel = row.planName || PLAN_LABELS[row.duration] || `${row.duration || '—'} يوم`;
  const amount = row.amountSar != null ? `${row.amountSar} ر.س` : '—';
  const when = row.recordedAt ? formatAccountDate(row.recordedAt) : '—';

  return (
    <article className="acct-pay-row">
      <div className="acct-pay-row__main">
        <span className="acct-pay-row__plan">{planLabel}</span>
        <span className="acct-pay-row__amount">{amount}</span>
      </div>
      <div className="acct-pay-row__meta">
        <span>{when}</span>
        {row.paymentId ? <span title={row.paymentId}>#{shortPaymentId(row.paymentId)}</span> : null}
        <span className="acct-pay-row__status">مفعّل</span>
      </div>
    </article>
  );
}
