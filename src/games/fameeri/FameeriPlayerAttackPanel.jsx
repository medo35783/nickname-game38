import { Q_TREES, Q_WEAPONS } from '../../core/constants';

/** لوحة الهجوم — للقائد فقط */
export default function FameeriPlayerAttackPanel({
  playMode,
  otherGroups,
  attackTarget,
  setAttackTarget,
  myWeapons,
  sandstorm,
  onSubmit,
}) {
  const availableWeapons = Q_WEAPONS.filter((w) => (myWeapons?.[w.id] || 0) > 0);
  const canSubmit =
    attackTarget.group &&
    attackTarget.weapon &&
    (attackTarget.tree || sandstorm);

  return (
    <div className="card fameeri-attack-panel">
      <div className="fameeri-attack-panel__hero">
        <span className="fameeri-attack-panel__emoji">⚔️</span>
        <div className="fameeri-attack-panel__title">
          {playMode === 'speed' ? '⚡ شنّ هجومك — السرعة!' : '🎯 دورك — اصطد الخصم'}
        </div>
        <div className="fameeri-attack-panel__steps">① هدف → ② شجرة → ③ سلاح</div>
      </div>

      <div className="fameeri-attack-step">
        <label className="lbl">① المجموعة المستهدفة</label>
        <div className="fameeri-target-row">
          {otherGroups.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`fameeri-target-btn${attackTarget.group === g.id ? ' on' : ''}`}
              onClick={() =>
                setAttackTarget((p) => ({ ...p, group: g.id, groupName: g.name }))
              }
            >
              {g.name || 'مجموعة'}
            </button>
          ))}
        </div>
      </div>

      {attackTarget.group && !sandstorm && (
        <div className="fameeri-attack-step">
          <label className="lbl">② الشجرة</label>
          <div className="fameeri-tree-grid">
            {Q_TREES.map((t) => (
              <button
                key={t}
                type="button"
              className={`fameeri-tree-cell${attackTarget.tree === t ? ' on' : ''}`}
                onClick={() => setAttackTarget((p) => ({ ...p, tree: t }))}
              >
                <span className="qt-ico">🌳</span>
                <span className="qt-name">{t}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {attackTarget.group && sandstorm && (
        <div className="fameeri-sandstorm-note">🌪️ العاصفة — الشجرة تُختار عشوائياً</div>
      )}

      {attackTarget.group && (
        <div className="fameeri-attack-step">
          <label className="lbl">③ السلاح</label>
          {availableWeapons.length === 0 ? (
            <div className="fameeri-no-weapons">⚠️ لا أسلحة متبقية</div>
          ) : (
            <div className="fameeri-weapon-pick-row">
              {availableWeapons.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className={`fameeri-weapon-pick${attackTarget.weapon === w.id ? ' on' : ''}`}
                  onClick={() =>
                    setAttackTarget((p) => ({
                      ...p,
                      weapon: w.id,
                      weaponName: w.name,
                    }))
                  }
                >
                  <span className="fameeri-weapon-pick__ico">{w.icon}</span>
                  <span className="fameeri-weapon-pick__name">{w.name}</span>
                  <span className="fameeri-weapon-pick__qty">{myWeapons[w.id]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {canSubmit && (
        <button type="button" className="btn br fameeri-attack-submit mt2" onClick={() => void onSubmit()}>
          ⚔️ أطلق الهجوم!
        </button>
      )}
    </div>
  );
}
