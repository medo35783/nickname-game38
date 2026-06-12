import { buildSpeedAdminRows } from './fameeriSpeedResolve';
import FameeriAdminDuel from './FameeriAdminDuel';

/**
 * لوحة السرعة للمشرف — طلبات + إجابات + الفائز التلقائي.
 */
export default function FameeriSpeedAdminPanel({
  claimIds = [],
  speedClaims = {},
  qGList = [],
  qKey,
  qActiveQuestion,
  qActiveAnswer,
  speedBatchActive = false,
  winnerId = '',
  accent = 'var(--fameeri-primary)',
}) {
  if (!claimIds.length) return null;

  const options = qActiveQuestion?.options || [];
  const { rows, reasonAr, winnerId: autoWinner, reason } = buildSpeedAdminRows({
    claimIds,
    qGList,
    speedClaims,
    qKey,
    options,
    correctAnswer: qActiveAnswer,
  });

  const activeWinner = winnerId || autoWinner;

  return (
    <div className="fameeri-speed-admin card" style={{ borderColor: accent }}>
      <div className="fameeri-speed-admin__head">
        <span className="fameeri-speed-admin__title">
          {speedBatchActive ? '⚡ جولة السرعة — جارية' : `📨 طلبات السرعة (${claimIds.length})`}
        </span>
        {!speedBatchActive && (
          <span className="fameeri-speed-admin__hint">شغّل المؤقت — الأسرع والأصح يفوز تلقائياً</span>
        )}
      </div>

      <div className="fameeri-speed-admin__rows">
        {rows.map((row) => {
          const isWinner = activeWinner === row.groupId;
          const statusClass =
            !row.submitted ? 'wait' : row.correct ? 'ok' : 'miss';
          return (
            <div
              key={row.groupId}
              className={`fameeri-speed-admin__row${isWinner ? ' winner' : ''}`}
            >
              <div className="fameeri-speed-admin__row-top">
                <span className="fameeri-speed-admin__group">{row.name}</span>
                {isWinner && <span className="fameeri-speed-admin__crown">👑 فائز</span>}
                <span className={`fameeri-speed-admin__status fameeri-speed-admin__status--${statusClass}`}>
                  {!row.submitted
                    ? '⏳ بانتظار الإجابة'
                    : row.correct
                      ? '✅ صحيحة'
                      : '❌ خاطئة'}
                </span>
              </div>
              <FameeriAdminDuel
                attackerName={row.claim.attackerName}
                targetName={row.claim.targetName}
                tree={row.claim.tree}
                weaponName={row.claim.weaponName}
                size="sm"
              />
              {row.submitted && (
                <div className={`fameeri-speed-admin__answer fameeri-speed-admin__answer--${statusClass}`}>
                  {row.letter && <span className="fameeri-speed-admin__letter">{row.letter}</span>}
                  <span>{row.optText}</span>
                  {row.by && <span className="fameeri-speed-admin__by">👑 {row.by}</span>}
                  {row.submittedAt > 0 && speedBatchActive && (
                    <span className="fameeri-speed-admin__time">
                      {formatSpeedTime(row.submittedAt)}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {speedBatchActive && reasonAr && (
        <div
          className={`fameeri-speed-admin__verdict${
            reason === 'all_wrong' ? ' miss' : autoWinner ? ' ok' : ' wait'
          }`}
        >
          {reasonAr}
        </div>
      )}
    </div>
  );
}

function formatSpeedTime(ts) {
  const d = new Date(ts);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `⏱ ${h}:${m}:${s}`;
}
