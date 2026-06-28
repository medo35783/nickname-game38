import { HOST_PIN_LEN } from '../core/hostPin';

/** حقل استعادة لوحة المشرف — اختياري عند الانضمام */
export default function HostPinVerifyField({ value, onChange, label = '🔐 رقم المشرف السري (4 أرقام)' }) {
  return (
    <div className="host-pin-verify">
      <label className="lbl">{label}</label>
      <input
        className="inp"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={HOST_PIN_LEN}
        value={value}
        placeholder="للمشرف فقط"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, HOST_PIN_LEN))}
      />
      <p className="hint-txt">إن كنت مشرف الغرفة وتعود من جهاز جديد — أدخل رقمك السري هنا.</p>
    </div>
  );
}
