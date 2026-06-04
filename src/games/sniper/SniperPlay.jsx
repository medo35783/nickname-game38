import { useMemo } from 'react';
import Av from '../../shared/Av';
import SniperCountdown from './SniperCountdown';
import SniperPlayerHud from './SniperPlayerHud';
import {
  pickAvailableScores,
  questionDurationSec,
  FINAL_VOTE_OPTIONS,
  FINAL_VOTE_SECONDS,
  SNIPER_ACCENT_CSS,
  SNIPER_GLOW_CSS,
} from './sniperHelpers';

function LiveAnswerCard({ entry, isHost }) {
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

export default function SniperPlay({
  roomCode,
  game,
  me,
  myId,
  players,
  answers,
  hostAnswer,
  answerText,
  setAnswerText,
  chosenScore,
  setChosenScore,
  insuranceActive,
  setInsuranceActive,
  onSubmit,
  submitting,
  finalVoteActive,
  myVote,
  onVote,
  voteCountdown,
}) {
  const phase = game?.phase;
  const blind = game?.specialRound === 'blind';
  const isFinalBet = !!game?.finalVoteResult && game?.currentQ > (game?.totalQ || 0);
  const maxSec = questionDurationSec(game);
  const deadline = game?.deadline;
  const timerWaiting = phase === 'question' && !deadline;
  const remaining = deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : null;

  const submitted = !!me?.submitted;
  const canUseInsurance = (me?.insuranceLeft || 0) > 0 && !submitted && !timerWaiting;

  const liveCards = useMemo(() => {
    const cards = [];
    Object.entries(answers || {}).forEach(([pid, row]) => {
      cards.push({
        id: pid,
        name: players[pid]?.name,
        answer: row.answer,
        chosenScore: row.chosenScore,
        player: players[pid],
        ts: row.ts || 0,
        isHost: false,
      });
    });
    if (game?.hostParticipates && hostAnswer?.answer) {
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
  }, [answers, hostAnswer, players, game?.hostParticipates]);

  const hud = (body) => (
    <SniperPlayerHud roomCode={roomCode} me={me} myId={myId} game={game} players={players}>
      {body}
    </SniperPlayerHud>
  );

  if (finalVoteActive && phase !== 'final') {
    return hud(
      <>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="ctitle">🗳️ السؤال الحاسم — صوّت للدرجة</div>
          <SniperCountdown remaining={voteCountdown} maxSeconds={FINAL_VOTE_SECONDS} size={64} />
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>الأغلبية تحدد قيمة الرهان الأخير</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {FINAL_VOTE_OPTIONS.map((v) => {
            const labels = { 5: 'سهل', 10: 'وسط', 15: 'صعب', 20: 'حاسم' };
            return (
              <button
                key={v}
                type="button"
                className={`btn ${myVote === v ? 'bg' : 'bgh'}`}
                disabled={!!myVote}
                onClick={() => onVote(v)}
              >
                {labels[v]} · {v}
              </button>
            );
          })}
        </div>
        {myVote && <div style={{ textAlign: 'center', fontSize: 12, color: SNIPER_ACCENT_CSS }}>✅ صوّتت بـ {myVote}</div>}
      </>
    );
  }

  if (phase === 'grading') {
    return hud(
      <div className="card" style={{ textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 40 }}>⏳</div>
        <div style={{ fontSize: 15, fontWeight: 800, marginTop: 10 }}>انتهى الوقت — المشرف يصحّح</div>
      </div>
    );
  }

  return hud(
    <>
      <div className="card sniper-q-card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <SniperCountdown remaining={remaining} maxSeconds={maxSec} waiting={timerWaiting} />
          <div style={{ flex: 1 }}>
            {timerWaiting && (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  marginBottom: 8,
                  padding: '6px 10px',
                  background: 'var(--surface)',
                  borderRadius: 8,
                }}
              >
                ⏸ بانتظار المشرف لبدء المؤقت…
              </div>
            )}
            {game?.questionCategory && (
              <div className="tag tg" style={{ fontSize: 10, marginBottom: 6 }}>
                {game.questionCategory}
              </div>
            )}
            {blind ? (
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--muted)' }}>🙈 جولة عميان — التصنيف فقط</div>
            ) : (
              <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.5 }}>{game?.questionText || '…'}</div>
            )}
            {blind && game?.questionCategory && (
              <div style={{ marginTop: 8, fontSize: 14 }}>{game.questionCategory}</div>
            )}
            {isFinalBet && (
              <div style={{ marginTop: 8, fontSize: 12, color: SNIPER_ACCENT_CSS }}>
                🎲 رهان حاسم: {game.finalVoteResult} نقطة للجميع
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="ctitle">✍️ إجابتك</div>
        <input
          className="inp"
          placeholder={timerWaiting ? 'انتظر بدء المؤقت…' : 'اكتب إجابتك…'}
          value={answerText}
          disabled={submitted || timerWaiting}
          onChange={(e) => setAnswerText(e.target.value)}
        />
        {!isFinalBet && (
          <>
            <div className="ctitle" style={{ marginTop: 12 }}>
              🎯 اختر درجتك
            </div>
            <div className="sniper-score-grid">
              {Array.from({ length: game?.totalQ || 15 }, (_, i) => i + 1).map((n) => {
                const st = me?.board?.[String(n)] || 'available';
                const disabled = submitted || timerWaiting || st !== 'available';
                const burned = st === 'burned';
                const used = st === 'used';
                return (
                  <button
                    key={n}
                    type="button"
                    className={`sniper-score-btn ${chosenScore === n ? 'active' : ''}`}
                    disabled={disabled}
                    onClick={() => setChosenScore(n)}
                  >
                    {burned ? '❌' : used ? '·' : n}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {canUseInsurance && (
          <button
            type="button"
            className={`btn ${insuranceActive ? 'bg' : 'bgh'} mt2`}
            style={{ width: '100%' }}
            onClick={() => setInsuranceActive((v) => !v)}
          >
            🛡️ تأمين ({me.insuranceLeft} متبقية) {insuranceActive ? '— مفعّل' : ''}
          </button>
        )}
        {!submitted && (
          <button
            type="button"
            className="btn bg mt2"
            disabled={submitting || timerWaiting || !answerText.trim() || (!isFinalBet && !chosenScore)}
            onClick={onSubmit}
          >
            {submitting ? '⏳' : '📤 إرسال'}
          </button>
        )}
      </div>

      {submitted && (
        <div className="card">
          <div className="ctitle">📡 البطاقات الحية</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {liveCards.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>بانتظار إجابات الآخرين…</div>
            ) : (
              liveCards.map((c) => <LiveAnswerCard key={c.id} entry={c} isHost={c.isHost} />)
            )}
          </div>
        </div>
      )}
    </>
  );
}
