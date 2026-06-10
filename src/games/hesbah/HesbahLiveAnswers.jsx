import { useMemo } from 'react';
import Av from '../../shared/Av';
import { HesbahInfoBtn, HesbahPanelTitle } from './HesbahHelpTip';
import { HESBAH_ACCENT_CSS, HESBAH_GLOW_CSS, isActiveHesbahPlayer } from './HesbahHelpers';

export function LiveAnswerCard({ entry, isHost }) {
  const badges = [];
  if (entry.shieldActive) badges.push({ key: 'shield', label: '🛡️', title: 'درع' });
  if (entry.confidenceUsed) badges.push({ key: 'conf', label: '💪X2', title: 'ثقة' });
  if (entry.edited) badges.push({ key: 'edit', label: '✏️', title: 'عدّل إجابته', cls: 'hesbah-live-card__power--edit' });

  return (
    <div
      className="hesbah-live-card"
      style={{
        border: isHost ? `2px solid ${HESBAH_ACCENT_CSS}` : '1px solid var(--border-subtle)',
        boxShadow: isHost ? `0 0 14px ${HESBAH_GLOW_CSS}` : undefined,
      }}
    >
      <Av p={entry.player} sz={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>
          {entry.name}
          {isHost && (
            <span style={{ marginRight: 6, fontSize: 10, color: HESBAH_ACCENT_CSS }}>المشرف</span>
          )}
          {badges.map((b) => (
            <span key={b.key} className={`hesbah-live-card__power ${b.cls || ''}`} title={b.title}>
              {b.label}
            </span>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{entry.answer || '—'}</div>
      </div>
      {!isHost && <div className="hesbah-score-pill">{entry.chosenScore ?? '—'}</div>}
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
      shieldActive: !!row.shieldActive,
      confidenceUsed: !!row.confidenceUsed,
      edited: !!row.edited,
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

/** قائمة المتسابقين مع حالة الإرسال — للمشرف */
export function buildParticipantRoster(answers, players) {
  return Object.entries(players || {})
    .filter(([, p]) => !p.isHost && isActiveHesbahPlayer(p))
    .map(([id, p]) => {
      const row = answers?.[id];
      const submitted = !!(row?.answer?.trim() || p.submitted);
      return { id, name: p.name, player: p, submitted };
    })
    .sort((a, b) => {
      if (a.submitted !== b.submitted) return a.submitted ? -1 : 1;
      return (a.name || '').localeCompare(b.name || '', 'ar');
    });
}

export default function HesbahLiveAnswersPanel({
  title = '📡 البطاقات الحية',
  help,
  cards,
  emptyMessage = 'بانتظار إجابات…',
  highlight = false,
  darkMode = false,
}) {
  return (
    <section
      className={`hesbah-admin-panel hesbah-admin-live-feed ${highlight ? 'hesbah-admin-live-feed--ops' : ''} ${darkMode ? 'hesbah-admin-live-feed--dark' : ''}`}
    >
      <HesbahPanelTitle help={help} helpLabel="شرح">{title}</HesbahPanelTitle>
      {darkMode && (
        <p className="hesbah-admin-live-feed__dark-note">
          🕶️ كرت ظلام — المتسابقون لا يرون البطاقات حتى اكتمال الإرسال أو انتهاء الوقت
        </p>
      )}
      <div className="hesbah-admin-live-feed__list">
        {cards.length === 0 ? (
          <p className="hesbah-admin-live-feed__empty">{emptyMessage}</p>
        ) : (
          cards.map((c) => <LiveAnswerCard key={c.id} entry={c} isHost={c.isHost} />)
        )}
      </div>
    </section>
  );
}

/** أسماء المتسابقين + مؤشر الإرسال — قبل/أثناء الجولة */
export function HesbahParticipantRoster({ roster, help, hostPending = false }) {
  const total = roster.length;
  const submitted = roster.filter((r) => r.submitted).length;
  const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;
  const waitingNames = roster.filter((r) => !r.submitted).map((r) => r.name);

  if (!total) {
    return (
      <section className="hesbah-admin-panel hesbah-participant-roster">
        <HesbahPanelTitle help={help} helpLabel="المتسابقون">👥 المتسابقون</HesbahPanelTitle>
        <p className="hesbah-admin-live-feed__empty">لا يوجد متسابقون بعد</p>
      </section>
    );
  }

  return (
    <section className="hesbah-admin-panel hesbah-participant-roster">
      <div className="hesbah-sec-head">
        <span className="hesbah-sec-head__label">👥 المتسابقون</span>
        <span className="hesbah-submit-pill">
          <strong>{submitted}</strong>/{total}
        </span>
        {help && <HesbahInfoBtn content={help} label="المتسابقون" />}
      </div>
      <div className="hesbah-admin-submit-counter__bar" aria-hidden>
        <div className="hesbah-admin-submit-counter__fill" style={{ width: `${pct}%` }} />
      </div>
      {hostPending && (
        <p className="hesbah-participant-roster__host-hint">📤 أرسل إجابتك للمشاركة — الإجابات تظهر للمشرف في «مباشر»</p>
      )}
      {waitingNames.length > 0 && (
        <p className="hesbah-participant-roster__waiting">
          ⏳ لم يرسل: {waitingNames.join(' · ')}
        </p>
      )}
      <div className="hesbah-participant-roster__list">
        {roster.map((r) => (
          <div
            key={r.id}
            className={`hesbah-participant-row ${r.submitted ? 'is-sent' : 'is-pending'}`}
          >
            <Av p={r.player} sz={34} />
            <span className="hesbah-participant-row__name">{r.name}</span>
            <span
              className={`hesbah-participant-row__badge ${r.submitted ? 'is-sent' : 'is-pending'}`}
              aria-label={r.submitted ? 'أرسل' : 'ينتظر'}
            >
              {r.submitted ? '✓' : '⏳'}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function useHesbahLiveAnswers(answers, players, hostAnswer, hostParticipates) {
  const liveCards = useMemo(
    () => buildLiveAnswerCards(answers, players, hostAnswer, hostParticipates),
    [answers, players, hostAnswer, hostParticipates]
  );
  const roster = useMemo(
    () => buildParticipantRoster(answers, players),
    [answers, players]
  );
  const totalContestants = useMemo(() => countContestants(players), [players]);
  const submittedCount = useMemo(
    () => countSubmittedAnswers(answers, players),
    [answers, players]
  );
  const hostSent = !!(hostParticipates && hostAnswer?.answer?.trim());

  return { liveCards, roster, totalContestants, submittedCount, hostSent };
}
