import Av from '../../shared/Av';
import {
  answerDedupeKey,
  compareToHostAnswer,
} from './HesbahHelpers';

function HostMatchBadge({ match }) {
  if (!match) return null;
  if (match === 'exact') {
    return (
      <span className="hesbah-grade-match hesbah-grade-match--exact" title="مطابق لإجابة المشرف">
        ✓ مطابق للمشرف
      </span>
    );
  }
  return (
    <span className="hesbah-grade-match hesbah-grade-match--similar" title="قريب من إجابة المشرف">
      ≈ قريب من المشرف
    </span>
  );
}

function DuplicateGroupCard({ group, marked, special, onToggle }) {
  const key = group.dedupeKey || answerDedupeKey(group.answer);
  const hasHost = group.items.some((it) => it.isHost);
  const hostItem = group.items.find((it) => it.isHost);
  const displayAnswers = [...new Set(group.items.map((it) => it.answer?.trim()).filter(Boolean))];

  return (
    <div
      className={`hesbah-grade-box hesbah-admin-grade hesbah-admin-grade--dup ${marked ? 'is-marked-dup' : ''} ${special === 'risk2x' ? 'is-risk2x' : ''}`}
    >
      <div className="hesbah-admin-grade__dup-head">
        <span className="hesbah-admin-grade__dup-label">🔁 تكرار</span>
        {displayAnswers.length > 1 && (
          <span className="hesbah-admin-grade__dup-variants">
            {displayAnswers.join(' · ')}
          </span>
        )}
      </div>

      {hasHost && hostItem && (
        <div className="hesbah-admin-grade__host-inline">
          <span className="hesbah-admin-grade__host-ico">👑</span>
          <strong>{hostItem.answer}</strong>
          <span className="hesbah-admin-grade__host-tag">مرجع المشرف</span>
        </div>
      )}

      <div className="hesbah-admin-grade__who">
        {group.items
          .filter((it) => !it.isHost)
          .map((it) => (
            <div key={it.playerId} className="hesbah-admin-grade__who-row">
              <Av p={it.player} sz={28} />
              <span>
                <strong>{it.name}</strong>
                <em>{it.answer}</em>
                <small>درجة {it.chosenScore ?? '—'}</small>
              </span>
            </div>
          ))}
      </div>

      {hasHost && (
        <div className="hesbah-admin-grade__warn">⚠️ مطابقة/قرب من إجابة المشرف</div>
      )}

      <button
        type="button"
        className={`btn bsm ${marked ? 'bg' : 'bgh'}`}
        style={marked ? { background: 'var(--red)' } : undefined}
        onClick={() => onToggle(key, !marked)}
      >
        {marked
          ? special === 'risk2x'
            ? '✓ مكرر — ضعف خصم'
            : special === 'risk'
              ? '✓ مكرر — خصم'
              : '✓ مكرر — صفر'
          : 'اعتماد كتكرار'}
      </button>
    </div>
  );
}

function UniqueGradeCard({ entry, verdict, special, hostRef, onToggle }) {
  const match = hostRef ? compareToHostAnswer(entry.answer, hostRef) : null;
  const v = verdict;

  return (
    <div
      className={`hesbah-grade-box hesbah-admin-grade hesbah-admin-grade--unique ${
        v === 'correct' ? 'is-correct' : v === 'wrong' ? 'is-wrong' : ''
      } ${v === 'wrong' && special === 'risk2x' ? 'is-risk2x' : ''} ${match ? 'has-host-match' : ''}`}
    >
      <div className="hesbah-admin-grade__row">
        <Av p={entry.player} sz={36} />
        <div className="hesbah-admin-grade__main">
          <div className="hesbah-admin-grade__name-row">
            <span className="hesbah-admin-grade__name">{entry.player?.name}</span>
            <HostMatchBadge match={match} />
          </div>
          <div className="hesbah-admin-grade__answer">{entry.answer}</div>
          {hostRef && (
            <div className="hesbah-admin-grade__vs-host">
              <span>👑 {hostRef}</span>
            </div>
          )}
          <div className="hesbah-admin-grade__score">درجة: {entry.chosenScore}</div>
        </div>
      </div>
      <div className="hesbah-admin-grade__actions">
        <button
          type="button"
          className={`btn bsm ${v === 'correct' ? 'bg' : 'bgh'}`}
          onClick={() => onToggle(entry.playerId, 'correct')}
        >
          ✅ صحيح
        </button>
        <button
          type="button"
          className={`btn bsm ${v === 'wrong' ? 'bg' : 'bgh'}`}
          style={v === 'wrong' ? { background: 'var(--red)' } : undefined}
          onClick={() => onToggle(entry.playerId, 'wrong')}
        >
          ❌ خطأ
        </button>
      </div>
    </div>
  );
}

/** لوحة تصحيح موحّدة — مرجع المشرف مع إجابات المتسابقين */
export default function HesbahAdminGrading({
  hostParticipates,
  hostAnswer,
  dupGroups,
  duplicateMarked,
  uniques,
  verdicts,
  special,
  onMarkDuplicate,
  onToggleVerdict,
}) {
  const hostRef = hostParticipates && hostAnswer?.answer?.trim() ? hostAnswer.answer.trim() : null;

  const sortedUniques = hostRef
    ? [...uniques].sort((a, b) => {
        const rank = { exact: 0, similar: 1, null: 2 };
        const ra = rank[compareToHostAnswer(a.answer, hostRef)] ?? 2;
        const rb = rank[compareToHostAnswer(b.answer, hostRef)] ?? 2;
        return ra - rb;
      })
    : uniques;

  return (
    <div className="hesbah-admin-grading">
      {hostRef && (
        <div className="hesbah-grade-host-strip">
          <div className="hesbah-grade-host-strip__main">
            <span className="hesbah-grade-host-strip__label">👑 مرجع المشرف</span>
            <strong className="hesbah-grade-host-strip__answer">{hostRef}</strong>
          </div>
          <span className="hesbah-grade-host-strip__hint">قارِن كل إجابة بالمرجع — التشابه الذكي يُظهر ≈ أو ✓</span>
        </div>
      )}

      {dupGroups.length > 0 && (
        <section className="hesbah-admin-panel hesbah-admin-grading__section">
          <h3 className="hesbah-admin-panel__title">🔁 إجابات مكررة / قريبة</h3>
          {dupGroups.map((g) => {
            const key = g.dedupeKey || answerDedupeKey(g.answer);
            return (
              <DuplicateGroupCard
                key={key}
                group={g}
                marked={!!duplicateMarked[key]}
                special={special}
                onToggle={onMarkDuplicate}
              />
            );
          })}
        </section>
      )}

      <section className="hesbah-admin-panel hesbah-admin-grading__section">
        <h3 className="hesbah-admin-panel__title">
          ✨ إجابات للتصحيح
          {hostRef && <span className="hesbah-admin-grading__sub"> — بجانب مرجع المشرف</span>}
        </h3>
        {sortedUniques.length === 0 ? (
          <p className="hesbah-admin-panel__hint">لا توجد إجابات فريدة — راجع التكرارات أعلاه</p>
        ) : (
          sortedUniques.map((u) => (
            <UniqueGradeCard
              key={u.playerId}
              entry={u}
              verdict={verdicts[u.playerId]}
              special={special}
              hostRef={hostRef}
              onToggle={onToggleVerdict}
            />
          ))
        )}
      </section>
    </div>
  );
}
