/**
 * إعلان حكم المشرف (صح / خطأ) — يظهر لجميع المجموعات فور الضغط.
 */
export default function FameeriVerdictBanner({ verdict }) {
  if (!verdict?.timestamp) return null;
  const ok = !!verdict.correct;

  return (
    <div
      className={`fameeri-verdict-banner${ok ? ' fameeri-verdict-banner--ok' : ' fameeri-verdict-banner--fail'}`}
      role="status"
      aria-live="assertive"
    >
      <div className="fameeri-verdict-banner__glow" aria-hidden />
      <div className="fameeri-verdict-banner__icon">{ok ? '✅' : '❌'}</div>
      <div className="fameeri-verdict-banner__title">{ok ? 'إجابة صحيحة!' : 'إجابة خاطئة'}</div>
      <div className="fameeri-verdict-banner__msg">{verdict.msg}</div>
      {(verdict.attackerName || verdict.targetName) && (
        <div className="fameeri-verdict-banner__duel">
          <span className="fameeri-verdict-banner__attacker">{verdict.attackerName}</span>
          <span className="fameeri-verdict-banner__arrow">⚔️</span>
          <span className="fameeri-verdict-banner__target">{verdict.targetName}</span>
        </div>
      )}
      {ok && (
        <div className="fameeri-verdict-banner__hint">🛡️ المدافع: فرصة الدرع الآن — تبويب «الهجوم»</div>
      )}
    </div>
  );
}
