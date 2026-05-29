import { SHIELD_WINDOW_SEC } from './fameeriAdminResolve';

/** نافذة الدرع — 10 ثوانٍ بعد إجابة «صح» */
export default function FameeriPlayerShieldPanel({
  attack,
  countdown,
  isLeader,
  shieldUsed,
  onActivate,
  activating,
}) {
  if (!attack) return null;

  const urgent = countdown !== null && countdown <= 3;

  return (
    <div className={`fameeri-shield-panel${urgent ? ' urgent' : ''}`}>
      <div className="fameeri-shield-panel__glow" aria-hidden />
      <div className="fameeri-shield-panel__icon">🛡️</div>
      <div className="fameeri-shield-panel__title">هجوم ناجح — فرصة الدرع!</div>
      <div className="fameeri-shield-panel__sub">
        {attack.attackerName} يصيب 🌳{attack.tree} · {attack.weaponName}
      </div>
      <div className="fameeri-shield-panel__timer">
        {countdown !== null && countdown > 0 ? countdown : '⏰'}
      </div>
      <div className="fameeri-shield-panel__hint">
        {shieldUsed
          ? 'استُخدم الدرع سابقاً في هذه المباراة'
          : `لديك ${SHIELD_WINDOW_SEC} ثوانٍ — مرة واحدة فقط`}
      </div>
      {isLeader && !shieldUsed && (
        <button
          type="button"
          className="btn fameeri-shield-panel__btn"
          disabled={activating || countdown === 0}
          onClick={() => void onActivate()}
        >
          {activating ? '⏳…' : `🛡️ فعّل الدرع على 🌳${attack.tree}`}
        </button>
      )}
      {!isLeader && !shieldUsed && (
        <div className="fameeri-shield-panel__member">👑 القائد يقرر — ناقشوا بسرعة!</div>
      )}
    </div>
  );
}
