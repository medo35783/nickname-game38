import { useState } from 'react';
import { HESBAH_PLAYER_POWERS } from './HesbahHelpers';

function powerSlotState(power, me, { timerActive, submitted, editPending, shieldActive, confidenceActive }) {
  const used = !!me[`${power.id}Used`];
  if (used) return { state: 'used', canAct: false, statusText: 'استُخدمت' };

  if (power.id === 'shield') {
    if (!timerActive || submitted) return { state: 'idle', canAct: false, statusText: power.timing };
    return {
      state: shieldActive ? 'armed' : 'ready',
      canAct: true,
      statusText: shieldActive ? 'مفعّل' : 'تفعيل',
    };
  }
  if (power.id === 'confidence') {
    if (!timerActive || submitted) return { state: 'idle', canAct: false, statusText: power.timing };
    return {
      state: confidenceActive ? 'armed' : 'ready',
      canAct: true,
      statusText: confidenceActive ? 'مفعّل' : 'تفعيل',
    };
  }
  if (power.id === 'edit') {
    if (!timerActive || !submitted) return { state: 'idle', canAct: false, statusText: power.timing };
    if (editPending) return { state: 'armed', canAct: false, statusText: 'عدّل وأرسل' };
    return { state: 'ready', canAct: true, statusText: 'تفعيل' };
  }
  return { state: 'idle', canAct: false, statusText: '' };
}

/** شريط أدوات الإثارة — 3 أزرار أفقية تحت الإجابة */
export default function HesbahPlayerPowerBar({
  me,
  timerActive,
  submitted,
  shieldActive,
  confidenceActive,
  onToggleShield,
  onToggleConfidence,
  onEdit,
  editPending,
}) {
  const [infoId, setInfoId] = useState(null);

  if (!me || me.isHost) return null;

  const handlers = {
    shield: onToggleShield,
    confidence: onToggleConfidence,
    edit: onEdit,
  };

  const toggleInfo = (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    setInfoId((cur) => (cur === id ? null : id));
  };

  return (
    <div className="hesbah-power-bar" role="group" aria-label="أدوات الإثارة — مرة واحدة للمسابقة">
      <div className="hesbah-power-bar__head">
        <span>⚡ أدوات الإثارة</span>
        <span className="hesbah-power-bar__once">مرة واحدة</span>
      </div>

      <div className="hesbah-power-bar__row">
        {HESBAH_PLAYER_POWERS.map((power) => {
          const { state, canAct, statusText } = powerSlotState(power, me, {
            timerActive,
            submitted,
            editPending,
            shieldActive,
            confidenceActive,
          });

          return (
            <div key={power.id} className="hesbah-power-card-wrap">
              <button
                type="button"
                className={[
                  'hesbah-power-card',
                  `hesbah-power-card--${power.id}`,
                  `is-${state}`,
                ].join(' ')}
                disabled={!canAct}
                onClick={() => {
                  if (!canAct) return;
                  handlers[power.id]?.();
                }}
              >
                <span className="hesbah-power-card__ico">{power.icon}</span>
                <span className="hesbah-power-card__lbl">{power.label}</span>
                {power.tag && <span className="hesbah-power-card__tag">{power.tag}</span>}
                <span className="hesbah-power-card__status">{statusText}</span>
                {state === 'used' && <span className="hesbah-power-card__spent">✓</span>}
              </button>

              <button
                type="button"
                className={`hesbah-power-card__info ${infoId === power.id ? 'is-open' : ''}`}
                aria-label={`شرح ${power.label}`}
                onClick={(e) => toggleInfo(power.id, e)}
              >
                ?
              </button>

              {infoId === power.id && (
                <div className="hesbah-power-card__tip" role="tooltip">
                  <strong>{power.tip}</strong>
                  <p>{power.desc}</p>
                  <em>{power.timing} · ١× للمسابقة</em>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
