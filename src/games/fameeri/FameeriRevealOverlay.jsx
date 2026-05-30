/**
 * مشهد كشف نتيجة الهجوم — واضح وفخم لجميع الشاشات.
 */
export default function FameeriRevealOverlay({ qReveal, showContinue, onContinue }) {
  if (!qReveal) return null;

  const weaponEmoji =
    qReveal.weapon === 'شوزل' || qReveal.weaponName?.includes('شوز')
      ? '💥'
      : qReveal.weapon === 'أم صتمة' || qReveal.weaponName?.includes('صتم')
        ? '🎯'
        : '🪃';

  const resultType = qReveal.phase === 'result' ? qReveal.type : 'pending';
  const bgClass =
    resultType === 'success'
      ? 'q-reveal-bg-success'
      : resultType === 'shielded'
        ? 'q-reveal-bg-shield'
        : resultType === 'empty'
          ? 'q-reveal-bg-empty'
          : resultType === 'fail'
            ? 'q-reveal-bg-fail'
            : 'q-reveal-bg-pending';

  return (
    <div className={`q-reveal ${bgClass}`} role="dialog" aria-modal="true" aria-label="كشف الهجوم">
      <div className="q-reveal-legend">
        <div className="q-reveal-legend__ribbon">⚔️ كشف الهجوم</div>

        <div className="q-reveal-legend__duel">
          <div className="q-reveal-legend__side q-reveal-legend__side--atk">
            <span className="q-reveal-legend__label">المهاجم</span>
            <span className="q-reveal-legend__name">{qReveal.attackerName || '—'}</span>
          </div>
          <div className="q-reveal-legend__vs" aria-hidden>
            ⚔️
          </div>
          <div className="q-reveal-legend__side q-reveal-legend__side--def">
            <span className="q-reveal-legend__label">الهدف</span>
            <span className="q-reveal-legend__name">{qReveal.targetName || '—'}</span>
          </div>
        </div>

        <div className="q-reveal-legend__meta">
          <span>🌳 {qReveal.tree}</span>
          <span className="q-reveal-legend__dot">·</span>
          <span>
            {weaponEmoji} {qReveal.weaponName || qReveal.weapon}
          </span>
        </div>
      </div>

      <div className="q-scene">
        {qReveal.phase === 'suspense' && (
          <>
            <div className="q-tree-big">🌳</div>
            <div className="q-reveal-phase-title">حبس الأنفاس…</div>
            <div className="q-suspense">ماذا يخبئ شجر {qReveal.tree}؟</div>
          </>
        )}

        {qReveal.phase === 'weapon' && (
          <>
            <div className="q-shake">
              <div className="q-weapon-flash">{weaponEmoji}</div>
            </div>
            <div className="q-reveal-phase-title">إطلاق السلاح!</div>
            <div className="q-reveal-phase-sub">{qReveal.weaponName || qReveal.weapon}</div>
          </>
        )}

        {qReveal.phase === 'result' && qReveal.type === 'success' && (
          <>
            <div className="q-reveal-result-head q-reveal-pop">🎯 إصابة!</div>
            <div className="q-birds">
              {Array.from({ length: Math.min(qReveal.hunted || 0, 30) }).map((_, i) => (
                <span
                  key={i}
                  className="q-bird"
                  style={{ '--br': `${(Math.random() - 0.5) * 40}deg`, animationDelay: `${i * 0.08}s` }}
                >
                  🐦
                </span>
              ))}
            </div>
            <div className="q-num q-reveal-hunt-num q-reveal-pop">−{qReveal.hunted}</div>
            <div className="q-reveal-result-line">
              <strong>{qReveal.attackerName}</strong> اصطاد{' '}
              <strong className="q-reveal-hunt-count">{qReveal.hunted}</strong> قميري من{' '}
              <strong>{qReveal.targetName}</strong>
            </div>
            <div className="q-reveal-result-sub">من شجرة «{qReveal.tree}»</div>
          </>
        )}

        {qReveal.phase === 'result' && qReveal.type === 'shielded' && (
          <>
            <div className="q-reveal-shield-scene">
              <div className="q-reveal-shield-burst" aria-hidden />
              <div className="q-reveal-shield-icon q-reveal-pop">🛡️</div>
              <div className="q-reveal-shield-spark" aria-hidden>✨</div>
            </div>
            <div className="q-reveal-result-head q-reveal-result-head--shield q-reveal-pop">صد الهجوم!</div>
            <div className="q-reveal-result-line">
              <strong>{qReveal.targetName}</strong> فعّلت الدرع على 🌳{qReveal.tree}
            </div>
            <div className="q-reveal-result-sub">
              {qReveal.attackerName} لم يصطد أي قميري — السلاح أُهدر
            </div>
          </>
        )}

        {qReveal.phase === 'result' && qReveal.type === 'empty' && (
          <>
            <div className="q-empty-face">😂</div>
            <div className="q-reveal-result-head">شجرة فارغة!</div>
            <div className="q-reveal-result-line">
              <strong>{qReveal.attackerName}</strong> هاجم <strong>{qReveal.targetName}</strong> — لا قميري هنا
            </div>
          </>
        )}

        {qReveal.phase === 'result' && qReveal.type === 'fail' && (
          <>
            <div className="q-reveal-fail-icon q-reveal-pop">💨</div>
            <div className="q-reveal-result-head q-reveal-result-head--fail">الهجوم لم يُحسب</div>
            <div className="q-reveal-result-line">
              <strong>{qReveal.attackerName}</strong> لم يصب <strong>{qReveal.targetName}</strong>
            </div>
            <div className="q-reveal-result-sub">إجابة خاطئة — لا صيد</div>
          </>
        )}

        {qReveal.poisonMsg && (
          <div className="q-reveal-poison">{qReveal.poisonMsg}</div>
        )}
      </div>

      {showContinue && typeof onContinue === 'function' && qReveal.phase === 'result' && (
        <button className="btn bg mt3 q-reveal-continue" type="button" onClick={onContinue}>
          ▶️ متابعة
        </button>
      )}
    </div>
  );
}
