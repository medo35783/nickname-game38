import { GAME_SEAT_PIN_LEN } from '../core/gameSeat';

/**
 * حقل الرقم السري للضيوف — 4 أرقام
 */
export default function GameSeatPinField({
  value,
  onChange,
  disabled = false,
  label = '🔐 رقمك السري (4 أرقام)',
  hint = 'احفظه — ستحتاجه للعودة من جهاز آخر أو بعد مسح البيانات',
  isRejoin = false,
}) {
  return (
    <div className="ig">
      <label className="lbl">{label}</label>
      <input
        className="inp big"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={GAME_SEAT_PIN_LEN}
        placeholder="••••"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, GAME_SEAT_PIN_LEN))}
      />
      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
        {isRejoin
          ? 'أدخل الرقم الذي اخترته عند التسجيل'
          : hint}
      </div>
    </div>
  );
}
