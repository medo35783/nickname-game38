import { Q_WEAPONS } from '../../core/constants';
import FameeriMatchSummary from './FameeriMatchSummary';

/**
 * إعلان حكم المشرف (صح / خطأ) — يظهر لجميع المجموعات فور الضغط.
 */
export default function FameeriVerdictBanner({ verdict, attack }) {
  if (!verdict?.timestamp) return null;
  const ok = !!verdict.correct;
  const atkName = attack?.attackerName || verdict.attackerName;
  const tgtName = attack?.targetName || verdict.targetName;
  const wDef = attack?.weapon ? Q_WEAPONS.find((w) => w.id === attack.weapon) : null;

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
      {ok && verdict.revealedAnswer && (
        <div className="fameeri-verdict-banner__answer">«{verdict.revealedAnswer}»</div>
      )}
      {(atkName || tgtName) && (
        <div className="fameeri-verdict-banner__match">
          <FameeriMatchSummary
            attackerName={atkName}
            targetName={tgtName}
            tree={attack?.tree}
            weaponName={attack?.weaponName}
            weaponIcon={wDef?.icon}
            size="sm"
            variant="banner"
          />
        </div>
      )}
      {ok && (
        <div className="fameeri-verdict-banner__hint">🛡️ المدافع: فرصة الدرع الآن — تبويب «الهجوم»</div>
      )}
    </div>
  );
}
