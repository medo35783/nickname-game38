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

  const step1Done = !!attackTarget.group;
  const step2Done = step1Done && (sandstorm || !!attackTarget.tree);
  const step3Done = !!attackTarget.weapon;
  const currentStep = !step1Done ? 1 : !step2Done ? 2 : !step3Done ? 3 : 4;

  const steps = [
    { n: 1, label: 'الهدف', short: 'مجموعة' },
    { n: 2, label: 'الشجرة', short: 'موقع' },
    { n: 3, label: 'السلاح', short: 'قوة' },
  ];

  return (
    <div className="card fameeri-attack-panel fameeri-attack-panel--active">
      <div className="fameeri-attack-turn-banner" role="status" aria-live="polite">
        <span className="fameeri-attack-turn-banner__pulse" aria-hidden />
        <span className="fameeri-attack-turn-banner__icon">{playMode === 'speed' ? '⚡' : '👑'}</span>
        <div className="fameeri-attack-turn-banner__text">
          <div className="fameeri-attack-turn-banner__title">
            {playMode === 'speed' ? 'وضع السرعة — شنّ هجومك الآن!' : 'دورك للهجوم — القرار لك!'}
          </div>
          <div className="fameeri-attack-turn-banner__sub">
            {playMode === 'speed'
              ? 'أكمل الخطوات ثلاث ثم أرسل — الأسرع يفوز'
              : 'أنت القائد — اختر الهدف ثم الشجرة ثم السلاح'}
          </div>
        </div>
      </div>

      <nav className="fameeri-attack-stepper" aria-label="خطوات الهجوم">
        {steps.map((s, i) => {
          const done = s.n === 1 ? step1Done : s.n === 2 ? step2Done : step3Done;
          const active = currentStep === s.n;
          return (
            <div
              key={s.n}
              className={`fameeri-attack-stepper__item${done ? ' done' : ''}${active ? ' active' : ''}`}
            >
              <div className="fameeri-attack-stepper__node">
                {done && !active ? '✓' : s.n}
              </div>
              <div className="fameeri-attack-stepper__labels">
                <span className="fameeri-attack-stepper__label">{s.label}</span>
                <span className="fameeri-attack-stepper__short">{s.short}</span>
              </div>
              {i < steps.length - 1 && <div className="fameeri-attack-stepper__line" aria-hidden />}
            </div>
          );
        })}
      </nav>

      <div
        className={`fameeri-attack-step${currentStep === 1 ? ' fameeri-attack-step--focus' : ''}${step1Done ? ' fameeri-attack-step--done' : ''}`}
      >
        <div className="fameeri-attack-step__head">
          <span className="fameeri-attack-step__num">①</span>
          <span className="fameeri-attack-step__title">اختر المجموعة المستهدفة</span>
          {step1Done && (
            <span className="fameeri-attack-step__picked">{attackTarget.groupName}</span>
          )}
        </div>
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
        <div
          className={`fameeri-attack-step${currentStep === 2 ? ' fameeri-attack-step--focus' : ''}${step2Done ? ' fameeri-attack-step--done' : ''}`}
        >
          <div className="fameeri-attack-step__head">
            <span className="fameeri-attack-step__num">②</span>
            <span className="fameeri-attack-step__title">اختر الشجرة على غابة الخصم</span>
            {step2Done && <span className="fameeri-attack-step__picked">🌳 {attackTarget.tree}</span>}
          </div>
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
        <div className="fameeri-sandstorm-note fameeri-attack-step--done">
          <span className="fameeri-attack-step__num">②</span>
          🌪️ العاصفة — الشجرة تُختار عشوائياً (تخطّ هذه الخطوة)
        </div>
      )}

      {attackTarget.group && (step2Done || sandstorm) && (
        <div
          className={`fameeri-attack-step${currentStep === 3 ? ' fameeri-attack-step--focus' : ''}${step3Done ? ' fameeri-attack-step--done' : ''}`}
        >
          <div className="fameeri-attack-step__head">
            <span className="fameeri-attack-step__num">③</span>
            <span className="fameeri-attack-step__title">اختر السلاح (يحدد صعوبة السؤال)</span>
            {step3Done && (
              <span className="fameeri-attack-step__picked">
                {attackTarget.weaponName} · {Q_WEAPONS.find((w) => w.id === attackTarget.weapon)?.diff}
              </span>
            )}
          </div>
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
                  <span className="fameeri-weapon-pick__diff">{w.diff}</span>
                  <span className="fameeri-weapon-pick__qty">×{myWeapons[w.id]}</span>
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

      {currentStep < 4 && (
        <p className="fameeri-attack-next-hint">
          {currentStep === 1 && '← ابدأ باختيار مجموعة الخصم'}
          {currentStep === 2 && '← اختر شجرة الهجوم'}
          {currentStep === 3 && '← اختر السلاح ثم أطلق'}
        </p>
      )}
    </div>
  );
}
