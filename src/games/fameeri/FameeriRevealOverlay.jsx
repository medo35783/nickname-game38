/**
 * مشهد كشف نتيجة الهجوم — موحّد للمشرف والمتسابقين (نفس التفاصيل والعبارات).
 */
export default function FameeriRevealOverlay({ qReveal, showContinue, onContinue }) {
  if (!qReveal) return null;

  const ctx = (
    <div
      style={{
        marginTop: 10,
        padding: '10px 14px',
        background: 'rgba(255,255,255,.06)',
        borderRadius: 10,
        fontSize: 13,
        lineHeight: 1.55,
        border: '1px solid rgba(255,255,255,.08)',
      }}
    >
      <div style={{ color: 'var(--gold)', fontWeight: 800 }}>
        {qReveal.attackerName} يهاجم {qReveal.targetName}
      </div>
      <div style={{ color: 'var(--muted)', marginTop: 4, fontSize: 12 }}>
        الشجرة: <span style={{ color: 'var(--text)', fontWeight: 700 }}>{qReveal.tree}</span> · السلاح:{' '}
        <span style={{ color: 'var(--text)', fontWeight: 700 }}>{qReveal.weapon}</span>
      </div>
    </div>
  );

  const poison = qReveal.poisonMsg ? (
    <div
      style={{
        marginTop: 10,
        padding: '10px 14px',
        background: 'rgba(155,89,182,.18)',
        border: '1px solid rgba(155,89,182,.45)',
        borderRadius: 10,
        fontSize: 13,
        color: 'var(--purple)',
        fontWeight: 800,
        lineHeight: 1.5,
      }}
    >
      {qReveal.poisonMsg}
    </div>
  ) : null;

  return (
    <div
      className={`q-reveal ${qReveal.phase === 'result' ? `q-reveal-bg-${qReveal.type}` : 'q-reveal-bg-pending'}`}
    >
      <div className="q-scene">
        {qReveal.phase === 'suspense' && (
          <>
            <div className="q-tree-big">🌳</div>
            <div style={{ fontFamily: 'Cairo', fontSize: 16, color: 'var(--gold)', marginTop: 10 }}>
              شجرة {qReveal.tree}
            </div>
            <div className="q-suspense" style={{ fontFamily: 'Cairo', fontSize: 18, color: 'var(--muted)', marginTop: 20 }}>
              ... حبس الأنفاس ...
            </div>
            {ctx}
          </>
        )}
        {qReveal.phase === 'weapon' && (
          <>
            <div className="q-shake">
              <div className="q-tree-big">🌳</div>
            </div>
            <div className="q-weapon-flash" style={{ fontSize: 44, marginTop: 12 }}>
              {qReveal.weapon === 'شوزل' ? '💥' : qReveal.weapon === 'أم صتمة' ? '🎯' : '🪃'}
            </div>
            <div style={{ fontFamily: 'Cairo', fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>{qReveal.weapon}</div>
            {ctx}
          </>
        )}
        {qReveal.phase === 'result' && qReveal.type === 'success' && (
          <>
            <div className="q-tree-big">🌳</div>
            <div className="q-birds">
              {Array.from({ length: Math.min(qReveal.hunted || 0, 30) }).map((_, i) => (
                <span
                  key={i}
                  className="q-bird"
                  style={{ '--br': `${(Math.random() - 0.5) * 40}deg`, animationDelay: `${i * 0.1}s` }}
                >
                  🐦
                </span>
              ))}
            </div>
            <div className="q-num" style={{ color: 'var(--green)' }}>
              -{qReveal.hunted}
            </div>
            <div style={{ fontFamily: 'Cairo', fontSize: 20, fontWeight: 900, color: 'var(--gold)' }}>
              تم اصطياد {qReveal.hunted} قميري
            </div>
            {ctx}
            {poison}
          </>
        )}
        {qReveal.phase === 'result' && qReveal.type === 'empty' && (
          <>
            <div className="q-empty-face">😂</div>
            <div style={{ fontFamily: 'Cairo', fontSize: 22, fontWeight: 900, color: 'var(--gold)', marginTop: 12 }}>
              الشجرة فاضية — لا قميري هنا
            </div>
            {ctx}
            {poison}
          </>
        )}
        {qReveal.phase === 'result' && qReveal.type === 'fail' && (
          <>
            <div style={{ fontSize: 64 }}>💨</div>
            <div style={{ fontFamily: 'Cairo', fontSize: 22, fontWeight: 900, color: 'var(--red)', marginTop: 8 }}>
              إجابة خاطئة — الهجوم لا يُحسب
            </div>
            {ctx}
            {poison}
          </>
        )}
      </div>
      {showContinue && typeof onContinue === 'function' && qReveal.phase === 'result' && (
        <button className="btn bg mt3" style={{ width: 'auto', padding: '10px 30px' }} type="button" onClick={onContinue}>
          ▶️ متابعة
        </button>
      )}
    </div>
  );
}
