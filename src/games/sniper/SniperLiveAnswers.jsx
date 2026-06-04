import { useMemo } from 'react';
import Av from '../../shared/Av';
import { SniperInfoBtn, SniperPanelTitle } from './SniperHelpTip';
import { SNIPER_ACCENT_CSS, SNIPER_GLOW_CSS } from './sniperHelpers';

export function LiveAnswerCard({ entry, isHost }) {
  return (
    <div
      className="sniper-live-card"
      style={{
        border: isHost ? `2px solid ${SNIPER_ACCENT_CSS}` : '1px solid var(--border-subtle)',
        boxShadow: isHost ? `0 0 14px ${SNIPER_GLOW_CSS}` : undefined,
      }}
    >
      <Av p={entry.player} sz={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>
          {entry.name}
          {isHost && (
            <span style={{ marginRight: 6, fontSize: 10, color: SNIPER_ACCENT_CSS }}>المشرف</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{entry.answer || '—'}</div>
      </div>
      {!isHost && <div className="sniper-score-pill">{entry.chosenScore ?? '—'}</div>}
      {isHost && (
        <span className="tag tg" style={{ fontSize: 10 }}>
          عرض
        </span>
      )}
    </div>
  );
}

/** بطاقات الإجابات الحية — نفس ترتيب المتسابقين */
export function buildLiveAnswerCards(answers, players, hostAnswer, hostParticipates) {
  const cards = [];
  Object.entries(answers || {}).forEach(([pid, row]) => {
    const p = players[pid];
    if (!p || p.isHost) return;
    if (!row?.answer?.trim()) return;
    cards.push({
      id: pid,
      name: p.name,
      answer: row.answer,
      chosenScore: row.chosenScore,
      player: p,
      ts: row.ts || 0,
      isHost: false,
    });
  });
  if (hostParticipates && hostAnswer?.answer?.trim()) {
    cards.push({
      id: '__host__',
      name: 'المشرف',
      answer: hostAnswer.answer,
      player: { name: 'المشرف', initials: '👑', colorIdx: 0 },
      ts: hostAnswer.ts || 0,
      isHost: true,
    });
  }
  return cards.sort((a, b) => (a.ts || 0) - (b.ts || 0));
}

export function countContestants(players) {
  return Object.values(players || {}).filter((p) => !p.isHost).length;
}

export function countSubmittedAnswers(answers, players) {
  return Object.entries(players || {}).filter(([id, p]) => {
    if (p.isHost) return false;
    const row = answers?.[id];
    return !!(row?.answer?.trim() || p.submitted);
  }).length;
}

export default function SniperLiveAnswersPanel({
  title = '📡 البطاقات الحية',
  help,
  cards,
  emptyMessage = 'بانتظار إجابات…',
  highlight = false,
}) {
  return (
    <section className={`sniper-admin-panel sniper-admin-live-feed ${highlight ? 'sniper-admin-live-feed--ops' : ''}`}>
      <SniperPanelTitle help={help} helpLabel="شرح">{title}</SniperPanelTitle>
      <div className="sniper-admin-live-feed__list">
        {cards.length === 0 ? (
          <p className="sniper-admin-live-feed__empty">{emptyMessage}</p>
        ) : (
          cards.map((c) => <LiveAnswerCard key={c.id} entry={c} isHost={c.isHost} />)
        )}
      </div>
    </section>
  );
}

/** عداد الإرسال للمشرف المشارك قبل إرسال إجابته */
export function SniperAdminSubmitCounter({ submitted, total, help }) {
  const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;
  return (
    <section className="sniper-admin-panel sniper-admin-submit-counter">
      <div className="sniper-sec-head">
        <span className="sniper-sec-head__label">📨 وصول</span>
        <span className="sniper-submit-pill">
          <strong>{submitted}</strong>/{total}
        </span>
        {help && <SniperInfoBtn content={help} label="الوصول" />}
      </div>
      <div className="sniper-admin-submit-counter__bar" aria-hidden>
        <div className="sniper-admin-submit-counter__fill" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}

export function useSniperLiveAnswers(answers, players, hostAnswer, hostParticipates) {
  const liveCards = useMemo(
    () => buildLiveAnswerCards(answers, players, hostAnswer, hostParticipates),
    [answers, players, hostAnswer, hostParticipates]
  );
  const totalContestants = useMemo(() => countContestants(players), [players]);
  const submittedCount = useMemo(
    () => countSubmittedAnswers(answers, players),
    [answers, players]
  );
  const hostSent = !!(hostParticipates && hostAnswer?.answer?.trim());

  return { liveCards, totalContestants, submittedCount, hostSent };
}
