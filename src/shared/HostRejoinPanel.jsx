import { useState } from 'react';
import { ROOM_CODE_PLACEHOLDER } from '../core/formLabels';
import { ROOM_CODE_LEN, normalizeRoomCodeInput } from '../core/roomCode';
import { HOST_PIN_LEN } from '../core/hostPin';

/**
 * قسم منفصل أسفل شاشة الانضمام — للمشرف فقط (لا يظهر للمتسابقين).
 */
export default function HostRejoinPanel({
  code,
  onCodeChange,
  hostPin,
  onHostPinChange,
  loading,
  error,
  onRejoin,
  isLoggedIn,
  onRegister,
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="host-rejoin-panel">
      <button
        type="button"
        className={`host-rejoin-panel__toggle${open ? ' host-rejoin-panel__toggle--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>👑 مشرف الغرفة؟</span>
        <span className="host-rejoin-panel__chev">{open ? '▾' : '◂'}</span>
      </button>

      {open ? (
        <div className="host-rejoin-panel__body">
          <p className="host-rejoin-panel__lead">
            للعودة لوحة التحكم — أدخل <strong>رمز الغرفة</strong> و<strong>رقمك السري</strong> (إن عيّنته عند
            الإنشاء).
          </p>
          {!isLoggedIn ? (
            <p className="host-rejoin-panel__hint">
              أو{' '}
              <button type="button" className="host-rejoin-panel__link" onClick={onRegister}>
                سجّل حساباً
              </button>{' '}
              لربط غرفتك ببريدك — لا حاجة للرقم السري.
            </p>
          ) : (
            <p className="host-rejoin-panel__hint">مسجّل دخول؟ إن كنت من أنشأ الغرفة يكفي الرمز (أو الرمز + PIN).</p>
          )}

          <label className="lbl">🔢 رمز الغرفة</label>
          <input
            className="inp big"
            placeholder={ROOM_CODE_PLACEHOLDER}
            maxLength={ROOM_CODE_LEN}
            value={code}
            inputMode="numeric"
            onChange={(e) => onCodeChange(normalizeRoomCodeInput(e.target.value))}
          />

          <label className="lbl mt2">🔐 رقم المشرف السري</label>
          <input
            className="inp"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={HOST_PIN_LEN}
            placeholder="••••"
            value={hostPin}
            onChange={(e) => onHostPinChange(e.target.value.replace(/\D/g, '').slice(0, HOST_PIN_LEN))}
          />

          {error ? <div className="err-msg mt2">⚠️ {error}</div> : null}

          <button
            type="button"
            className="btn bo mt2"
            disabled={loading || code.length !== ROOM_CODE_LEN}
            onClick={() => void onRejoin?.()}
          >
            {loading ? '⏳ جاري الدخول…' : '👑 دخول كمشرف'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
