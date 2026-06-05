import { useState } from 'react';
import {
  HESBAH_ACCENT_CSS,
  TIMER_PRESET_SECS,
  clampCustomQuestionSecs,
  MIN_QUESTION_SECS,
  MAX_QUESTION_SECS,
} from './HesbahHelpers';

/** اختيار مدة المؤقت — افتراضي في اللوبي أو لهذه الجولة في لوحة المشرف */
export default function HesbahTimerPicker({
  activeSecs,
  onSelect,
  compact = false,
  hint,
}) {
  const [customSecs, setCustomSecs] = useState('');
  const isPreset = TIMER_PRESET_SECS.includes(activeSecs);

  const applyCustom = () => {
    const n = clampCustomQuestionSecs(customSecs);
    if (n) onSelect(n);
  };

  return (
    <div>
      {hint && (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.55 }}>{hint}</div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: compact ? 6 : 8 }}>
        {TIMER_PRESET_SECS.map((s) => (
          <button
            key={s}
            type="button"
            className={`btn ${compact ? 'bsm' : ''} ${activeSecs === s && isPreset ? 'bg' : 'bgh'}`}
            style={{ flex: compact ? '1 1 22%' : '1 1 40%', borderColor: activeSecs === s ? HESBAH_ACCENT_CSS : undefined }}
            onClick={() => onSelect(s)}
          >
            {s} ث
          </button>
        ))}
      </div>
      <div style={{ marginTop: compact ? 8 : 10 }}>
        {!compact && <label className="lbl">مدة مخصصة (ثانية)</label>}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="inp"
            type="number"
            min={MIN_QUESTION_SECS}
            max={MAX_QUESTION_SECS}
            placeholder={compact ? 'ثوانٍ…' : `${MIN_QUESTION_SECS}–${MAX_QUESTION_SECS}`}
            value={customSecs}
            onChange={(e) => setCustomSecs(e.target.value)}
          />
          <button type="button" className="btn bo bsm" style={{ width: 'auto', flexShrink: 0 }} onClick={applyCustom}>
            اعتماد
          </button>
        </div>
        {!isPreset && (
          <div style={{ fontSize: 11, color: HESBAH_ACCENT_CSS, marginTop: 6 }}>المفعّل: {activeSecs} ث</div>
        )}
      </div>
    </div>
  );
}
