import { useEffect, useState } from 'react';
import { hashHostPin } from '../core/hostPin';
import HostPinGateModal from './HostPinGateModal';

const dismissKey = (gameId, roomCode) => `ng_host_session_remind:${gameId}:${roomCode}`;

/**
 * تنبيه المشرف — يظهر في اللوبي قبل بدء الجولة (ضيف أو بدون رقم سري).
 */
export default function HostSessionReminder({
  gameId,
  roomCode,
  phase = 'lobby',
  isRegisteredEmail = false,
  hasHostPin,
  onSavePin,
  onRegister,
  notify,
}) {
  const [visible, setVisible] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!roomCode || phase !== 'lobby') {
      setVisible(false);
      return;
    }
    /** مسجّل بالبريد — الغرفة مربوطة بـ adminId */
    if (isRegisteredEmail) {
      setVisible(false);
      return;
    }
    if (hasHostPin) {
      setVisible(false);
      return;
    }
    if (sessionStorage.getItem(dismissKey(gameId, roomCode)) === '1') {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(t);
  }, [gameId, roomCode, phase, isRegisteredEmail, hasHostPin]);

  if (!visible || !roomCode) return null;

  const dismiss = () => {
    sessionStorage.setItem(dismissKey(gameId, roomCode), '1');
    setVisible(false);
  };

  const handlePinConfirm = async (pin) => {
    setBusy(true);
    try {
      const hostPinHash = await hashHostPin(pin, roomCode);
      await onSavePin?.(hostPinHash);
      notify?.('✅ احفظ رمز الغرفة + رقمك السري للعودة لاحقاً', 'success');
      setPinOpen(false);
      setVisible(false);
    } catch {
      notify?.('تعذّر حفظ الرقم السري', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="host-session-toast" role="status">
        <button type="button" className="host-session-toast__close" onClick={dismiss} aria-label="إغلاق">
          ×
        </button>
        <div className="host-session-toast__title">💾 احفظ جلستك</div>
        <p className="host-session-toast__text">
          رمزك: <strong className="host-session-toast__code">{roomCode}</strong>
          {' — عيّن رقم سري أو سجّل لترجع من جهاز آخر.'}
        </p>
        <div className="host-session-toast__actions">
          <button type="button" className="btn bsm bg" onClick={() => setPinOpen(true)}>
            رقم سري
          </button>
          {onRegister ? (
            <button type="button" className="btn bsm bo" onClick={onRegister}>
              سجّل
            </button>
          ) : null}
          <button type="button" className="btn bsm bgh" onClick={dismiss}>
            فهمت
          </button>
        </div>
      </div>
      <HostPinGateModal
        open={pinOpen}
        busy={busy}
        optional
        onConfirm={(pin) => void handlePinConfirm(pin)}
        onCancel={() => setPinOpen(false)}
        onSkip={() => setPinOpen(false)}
      />
    </>
  );
}
