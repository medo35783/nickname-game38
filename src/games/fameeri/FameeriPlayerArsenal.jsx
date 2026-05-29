import { Q_WEAPONS } from '../../core/constants';

/** عرض الأسلحة + حالة الدرع */
export default function FameeriPlayerArsenal({ weapons, shieldUsed, shieldActive, shieldTree }) {
  return (
    <div className="fameeri-player-arsenal card">
      <div className="fameeri-player-arsenal__head">
        <span className="ctitle">🎒 ترسانة الصيد</span>
        <span
          className={`fameeri-player-shield-status${shieldUsed ? ' used' : shieldActive ? ' on' : ' ready'}`}
        >
          {shieldActive
            ? `🛡️ درع على 🌳${shieldTree}`
            : shieldUsed
              ? '🛡️ استُخدم الدرع'
              : '🛡️ الدرع جاهز (مرة واحدة)'}
        </span>
      </div>
      <div className="fameeri-weapon-row">
        {Q_WEAPONS.map((w) => {
          const qty = weapons?.[w.id] || 0;
          const empty = qty <= 0;
          return (
            <div
              key={w.id}
              className={`fameeri-weapon-chip${empty ? ' empty' : ''}`}
              title={w.name}
            >
              <div className="fameeri-weapon-chip__ico">{w.icon}</div>
              <div className="fameeri-weapon-chip__name">{w.name}</div>
              <div className="fameeri-weapon-chip__qty">{qty}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
