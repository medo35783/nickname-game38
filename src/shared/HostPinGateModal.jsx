import { useState } from 'react';
import { HOST_PIN_LEN, hostPinValidationMessage, isValidHostPin } from '../core/hostPin';

/**
 * يطلب من المشرف تعيين رقم سري (اختياري — بعد إنشاء الغرفة).
 */
export default function HostPinGateModal({
  open,
  onConfirm,
  onCancel,
  onSkip,
  busy = false,
  optional = false,
}) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr('');
    if (!isValidHostPin(pin)) {
      setErr(hostPinValidationMessage());
      return;
    }
    if (pin !== confirm) {
      setErr('الرقم السري غير متطابق');
      return;
    }
    onConfirm?.(pin);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="host-pin-title">
      <div className="modal-card host-pin-modal">
        <h2 id="host-pin-title" className="modal-title">
          🔐 رقم المشرف السري
        </h2>
        <p className="modal-desc">
          {optional
            ? `اختر ${HOST_PIN_LEN} أرقام — تستخدمها مع رمز الغرفة عند العودة من جهاز آخر بلا نفس حسابك.`
            : `اختر ${HOST_PIN_LEN} أرقام لحماية لوحة التحكم. ستحتاجه عند العودة من جهاز آخر.`}
        </p>
        <form onSubmit={handleSubmit}>
          <label className="lbl">الرقم السري</label>
          <input
            className="inp"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={HOST_PIN_LEN}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, HOST_PIN_LEN))}
            placeholder="••••"
          />
          <label className="lbl mt2">تأكيد الرقم</label>
          <input
            className="inp"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={HOST_PIN_LEN}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, HOST_PIN_LEN))}
            placeholder="••••"
          />
          {err ? <p className="err-txt">{err}</p> : null}
          <div className="modal-actions">
            {optional ? (
              <button type="button" className="btn bgh" onClick={onSkip || onCancel} disabled={busy}>
                تخطي
              </button>
            ) : (
              <button type="button" className="btn bgh" onClick={onCancel} disabled={busy}>
                إلغاء
              </button>
            )}
            <button type="submit" className="btn bg" disabled={busy}>
              {busy ? 'جاري الحفظ…' : 'حفظ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
