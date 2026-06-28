import { useState } from 'react';
import { hashHostPin } from '../core/hostPin';
import HostPinGateModal from './HostPinGateModal';

const dismissKey = (gameId, roomCode) => `ng_host_pin_dismiss:${gameId}:${roomCode}`;

/**
 * بطاقة اختيارية — تأمين لوحة المشرف بعد إنشاء الغرفة (ليست إلزامية).
 */
export default function HostPinOptionalSetup({
  gameId,
  roomCode,
  hasHostPin,
  onSave,
  notify,
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!roomCode || hasHostPin) return null;
  if (localStorage.getItem(dismissKey(gameId, roomCode)) === '1') return null;

  const handleConfirm = async (pin) => {
    setBusy(true);
    try {
      const hostPinHash = await hashHostPin(pin, roomCode);
      await onSave(hostPinHash);
      notify?.('✅ تم تأمين لوحة التحكم برقم سري', 'success');
      setOpen(false);
    } catch {
      notify?.('تعذّر حفظ الرقم السري', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="host-pin-optional-card">
        <div className="host-pin-optional-card__text">
          <strong>🔐 تأمين اختياري</strong>
          <span>لو ستفتح اللعبة من جهاز آخر بدون نفس حسابك — عيّن رقم سري للمشرف.</span>
        </div>
        <div className="host-pin-optional-card__actions">
          <button type="button" className="btn bsm bg" onClick={() => setOpen(true)}>
            تعيين
          </button>
          <button
            type="button"
            className="btn bsm bgh"
            onClick={() => localStorage.setItem(dismissKey(gameId, roomCode), '1')}
          >
            لاحقاً
          </button>
        </div>
      </div>
      <HostPinGateModal
        open={open}
        busy={busy}
        optional
        onConfirm={(pin) => void handleConfirm(pin)}
        onCancel={() => setOpen(false)}
        onSkip={() => setOpen(false)}
      />
    </>
  );
}
