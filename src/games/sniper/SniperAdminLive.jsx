import { useEffect, useMemo, useState } from 'react';
import Av from '../../shared/Av';
import LiveConnectionBar from '../titles/LiveConnectionBar';
import SniperCountdown from './SniperCountdown';
import SniperRoomMeta from './SniperRoomMeta';
import SniperAdminTools from './SniperAdminTools';
import SniperAdminLeaderboard from './SniperAdminLeaderboard';
import {
  groupDuplicateAnswers,
  uniqueAnswerEntries,
  normalizeAnswer,
  questionDurationSec,
  activeRoundSecs,
  SNIPER_SPECIAL_TOOLS,
  SNIPER_ACCENT_CSS,
  SNIPER_SCORE_BG_CSS,
  SNIPER_BORDER_CSS,
  sniperHostQuestionFlags,
} from './sniperHelpers';
import SniperQuestionPanel from './SniperQuestionPanel';
import SniperTimerPicker from './SniperTimerPicker';
import { SniperPanelTitle, SNIPER_HOST_ANSWER_HELP, SNIPER_LIVE_HOST_HELP, SNIPER_LIVE_OPS_HELP, SNIPER_SUBMIT_COUNTER_HELP } from './SniperHelpTip';
import SniperLiveAnswersPanel, {
  SniperAdminSubmitCounter,
  useSniperLiveAnswers,
} from './SniperLiveAnswers';

const PHASE_LABELS = {
  question: 'جولة سؤال',
  grading: 'تصحيح',
  roundResult: 'نتيجة',
  leaderboard: 'ترتيب',
};

function activeSpecialLabel(id) {
  return SNIPER_SPECIAL_TOOLS.find((t) => t.id === id)?.title;
}

export default function SniperAdminLive({
  roomCode,
  game,
  players,
  answers,
  supervisorNotes = '',
  hostAnswer,
  countdown,
  onSetSpecial,
  onHostSubmit,
  hostDraft,
  setHostDraft,
  verdicts,
  setVerdicts,
  duplicateMarked,
  setDuplicateMarked,
  onShowResult,
  onLeaderboard,
  onNextQuestion,
  onStartTimer,
  onEndTimer,
  onRoundSecsChange,
  onClearRoundSecs,
  hostParticipates,
}) {
  const [adminTab, setAdminTab] = useState('round');
  const phase = game?.phase || 'question';
  const grading = phase === 'grading';
  const timerWaiting = phase === 'question' && !game?.deadline;
  const timerRunning = !!(game?.deadline && game.deadline > Date.now());
  const maxSec = questionDurationSec(game);
  const roundSecsUi = activeRoundSecs(game);
  const hasRoundOverride = game?.roundSecs != null && game?.specialRound !== 'speed';
  const totalQ = game?.totalQ || 15;
  const currentQ = game?.currentQ || 1;
  const special = game?.specialRound;
  const progressPct = Math.min(100, Math.round((currentQ / totalQ) * 100));
  const hostQuestion =
    game?.hostQuestionText?.trim() || game?.questionText?.trim() || '';
  const hostFlags = sniperHostQuestionFlags(game);

  useEffect(() => {
    if (phase === 'question' || phase === 'grading') setAdminTab('round');
  }, [phase, currentQ]);

  const dupGroups = useMemo(
    () => groupDuplicateAnswers(answers, players, hostParticipates ? hostAnswer : null),
    [answers, players, hostAnswer, hostParticipates]
  );
  const dupKeys = useMemo(
    () => new Set(dupGroups.map((g) => normalizeAnswer(g.answer))),
    [dupGroups]
  );
  const uniques = useMemo(
    () => uniqueAnswerEntries(answers, players, dupKeys),
    [answers, players, dupKeys]
  );

  const allGraded = useMemo(() => {
    const ids = Object.keys(answers || {});
    if (!ids.length) return true;
    return ids.every((id) => {
      const key = normalizeAnswer(answers[id]?.answer);
      if (dupKeys.has(key)) return duplicateMarked[key] !== undefined;
      return verdicts[id] === 'correct' || verdicts[id] === 'wrong';
    });
  }, [answers, dupKeys, duplicateMarked, verdicts]);

  const toggleVerdict = (pid, v) => {
    setVerdicts((prev) => ({
      ...prev,
      [pid]: prev[pid] === v ? null : v,
    }));
  };

  const markDuplicate = (answerKey, marked) => {
    setDuplicateMarked((prev) => ({ ...prev, [answerKey]: marked }));
  };

  const { liveCards, totalContestants, submittedCount, hostSent } = useSniperLiveAnswers(
    answers,
    players,
    hostAnswer,
    hostParticipates
  );

  const timerNeedsStart = timerWaiting && phase === 'question';

  const timerColumn = (
    <div
      className={`sniper-admin-split__col sniper-admin-split__timer ${
        timerNeedsStart ? 'sniper-admin-split__timer--attention' : ''
      }`}
    >
      <SniperPanelTitle>⏱ المؤقت</SniperPanelTitle>
      {timerWaiting ? (
        <>
          {hostFlags.oralHidden ? (
            <p className="sniper-admin-timer-hint sniper-admin-timer-hint--oral">🎙️ بدون نص للاعبين — استمعوا لك</p>
          ) : hostFlags.revealsOnTimer ? (
            <p className="sniper-admin-timer-hint">📱 السؤال يظهر للاعبين بعد «بدء المؤقت»</p>
          ) : null}
          <p className="sniper-admin-micro">افتراضي {game?.questionSecs ?? 20} ث</p>
          {game?.specialRound !== 'speed' && (
            <>
              <SniperTimerPicker compact activeSecs={roundSecsUi} onSelect={onRoundSecsChange} />
              {hasRoundOverride && (
                <button type="button" className="btn bgh bsm sniper-admin-reset-secs" onClick={onClearRoundSecs}>
                  ↩ افتراضي
                </button>
              )}
            </>
          )}
          <button
            type="button"
            className="btn bg sniper-admin-start-timer sniper-admin-start-timer--attention"
            onClick={onStartTimer}
          >
            ▶ بدء المؤقت ({maxSec} ث)
          </button>
        </>
      ) : (
        <div className="sniper-admin-timer-live">
          <SniperCountdown
            remaining={countdown}
            maxSeconds={maxSec}
            size={44}
            waiting={false}
          />
          <p className="sniper-admin-micro">
            {timerRunning ? 'العدّ جارٍ' : 'انتهى الوقت'}
          </p>
        </div>
      )}
    </div>
  );

  const hostColumn = hostParticipates && (
    <div className="sniper-admin-split__col sniper-admin-split__host">
      <SniperPanelTitle help={SNIPER_HOST_ANSWER_HELP} helpLabel="إجابة العرض">
        👑 إجابتك
      </SniperPanelTitle>
      <input
        className="inp sniper-admin-host-inp"
        placeholder="إجابتك…"
        value={hostDraft.answer}
        onChange={(e) => setHostDraft((d) => ({ ...d, answer: e.target.value }))}
      />
      <button
        type="button"
        className="btn bgh bsm sniper-admin-host-send"
        disabled={!hostDraft.answer?.trim()}
        onClick={onHostSubmit}
      >
        📤 إرسال
      </button>
    </div>
  );

  return (
    <div className="scr sniper-theme sniper-admin">
      <LiveConnectionBar connected roomCode={roomCode} />

      <header className="sniper-admin-hero">
        <div className="sniper-admin-hero__top">
          <div className="sniper-admin-hero__left">
            <div className="sniper-admin-hero__badge">{PHASE_LABELS[phase] || phase}</div>
            {roomCode && (
              <SniperRoomMeta roomCode={roomCode} className="sniper-room-meta--hero" />
            )}
          </div>
          {timerWaiting && phase === 'question' && (
            <span className="sniper-admin-hero__timer-pill sniper-admin-hero__timer-pill--wait">
              ⏸ لم يبدأ
            </span>
          )}
          {timerRunning && (
            <span className="sniper-admin-hero__timer-pill">⏱ {countdown ?? maxSec} ث</span>
          )}
        </div>
        <div className="sniper-admin-hero__progress" aria-hidden>
          <div className="sniper-admin-hero__progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="sniper-admin-hero__meta">
          <span className="sniper-admin-hero__q">
            جولة <strong>{currentQ}</strong>
            <span className="sniper-admin-hero__sep">/</span>
            {totalQ}
          </span>
          {special && (
            <span className="sniper-admin-hero__special">{activeSpecialLabel(special)}</span>
          )}
        </div>
      </header>

      <nav className="sniper-admin-tabs" aria-label="لوحة المشرف">
        <button
          type="button"
          className={`sniper-admin-tabs__btn ${adminTab === 'round' ? 'is-active' : ''}`}
          onClick={() => setAdminTab('round')}
        >
          🎯 الجولة
        </button>
        <button
          type="button"
          className={`sniper-admin-tabs__btn ${adminTab === 'rank' ? 'is-active' : ''}`}
          onClick={() => setAdminTab('rank')}
        >
          🏆 الترتيب
        </button>
      </nav>

      {adminTab === 'rank' ? (
        <SniperAdminLeaderboard players={players} roomCode={roomCode} game={game} />
      ) : (
        <>
          {phase === 'question' && (
            <section className="sniper-admin-panel sniper-admin-tools-panel">
              <SniperAdminTools
                activeSpecial={special}
                timerRunning={timerRunning}
                onSetSpecial={onSetSpecial}
                onEndTimer={onEndTimer}
              />
            </section>
          )}

          <SniperQuestionPanel
            role="host"
            questionText={hostQuestion}
            hostOralHidden={hostFlags.oralHidden}
            supervisorNotes={supervisorNotes}
            status={
              timerRunning || grading ? (
                <div
                  className={`sniper-admin-status ${
                    grading ? 'sniper-admin-status--grade' : 'sniper-admin-status--run'
                  }`}
                >
                  {grading ? '✋ تصحيح' : '⏱ جارٍ'}
                </div>
              ) : null
            }
          />

          {phase === 'question' && (
            <section className="sniper-admin-panel sniper-admin-controls">
              <div
                className={`sniper-admin-split ${!hostParticipates ? 'sniper-admin-split--solo' : ''}`}
              >
                {timerColumn}
                {hostColumn}
              </div>
            </section>
          )}

          {phase === 'question' && !hostParticipates && (
            <SniperLiveAnswersPanel
              highlight
              title="📡 مباشر"
              help={SNIPER_LIVE_OPS_HELP}
              cards={liveCards}
              emptyMessage={
                timerRunning
                  ? 'بانتظار أول إجابة…'
                  : 'بعد بدء المؤقت تظهر الإجابات هنا مباشرة'
              }
            />
          )}

          {phase === 'question' && hostParticipates && !hostSent && (
            <SniperAdminSubmitCounter
              submitted={submittedCount}
              total={totalContestants}
              help={SNIPER_SUBMIT_COUNTER_HELP}
            />
          )}

          {phase === 'question' && hostParticipates && hostSent && (
            <SniperLiveAnswersPanel
              title="📡 حيّ"
              help={SNIPER_LIVE_HOST_HELP}
              cards={liveCards}
              emptyMessage="بانتظار إجابات الآخرين…"
            />
          )}

          {grading && (
            <>
              {hostParticipates && hostAnswer?.answer?.trim() && (
                <section
                  className="sniper-admin-panel sniper-admin-ref"
                  style={{
                    borderColor: SNIPER_ACCENT_CSS,
                    background: SNIPER_SCORE_BG_CSS,
                  }}
                >
                  <h3 className="sniper-admin-panel__title">👑 مرجع المشرف</h3>
                  <p className="sniper-admin-ref__answer">{hostAnswer.answer}</p>
                </section>
              )}

              {dupGroups.length > 0 && (
                <section className="sniper-admin-panel">
                  <h3 className="sniper-admin-panel__title">🔁 إجابات مكررة</h3>
                  {dupGroups.map((g) => {
                    const key = normalizeAnswer(g.answer);
                    const marked = duplicateMarked[key];
                    return (
                      <div
                        key={key}
                        className={`sniper-grade-box sniper-admin-grade ${marked ? 'is-marked-dup' : ''}`}
                      >
                        <div className="sniper-admin-grade__answer">{g.answer}</div>
                        <div className="sniper-admin-grade__who">
                          {g.items.map((it) =>
                            it.isHost
                              ? `👑 ${it.name} (عرض)`
                              : `${it.name} · درجة ${it.chosenScore ?? '—'}`
                          ).join(' · ')}
                        </div>
                        {g.items.some((it) => it.isHost) && (
                          <div className="sniper-admin-grade__warn">⚠ تطابق مع المشرف</div>
                        )}
                        <button
                          type="button"
                          className={`btn bsm ${marked ? 'bg' : 'bgh'}`}
                          style={marked ? { background: 'var(--red)' } : undefined}
                          onClick={() => markDuplicate(key, !marked)}
                        >
                          {marked ? '✓ مكرر — صفر' : 'اعتماد كتكرار'}
                        </button>
                      </div>
                    );
                  })}
                </section>
              )}

              <section className="sniper-admin-panel">
                <h3 className="sniper-admin-panel__title">✨ إجابات فريدة</h3>
                {uniques.length === 0 ? (
                  <p className="sniper-admin-panel__hint">لا توجد إجابات فريدة</p>
                ) : (
                  uniques.map((u) => {
                    const v = verdicts[u.playerId];
                    return (
                      <div
                        key={u.playerId}
                        className={`sniper-grade-box sniper-admin-grade ${
                          v === 'correct' ? 'is-correct' : v === 'wrong' ? 'is-wrong' : ''
                        }`}
                      >
                        <div className="sniper-admin-grade__row">
                          <Av p={u.player} sz={36} />
                          <div>
                            <div className="sniper-admin-grade__name">{u.player?.name}</div>
                            <div className="sniper-admin-grade__answer">{u.answer}</div>
                            <div className="sniper-admin-grade__score">درجة: {u.chosenScore}</div>
                          </div>
                        </div>
                        <div className="sniper-admin-grade__actions">
                          <button
                            type="button"
                            className={`btn bsm ${v === 'correct' ? 'bg' : 'bgh'}`}
                            onClick={() => toggleVerdict(u.playerId, 'correct')}
                          >
                            ✅ صحيح
                          </button>
                          <button
                            type="button"
                            className={`btn bsm ${v === 'wrong' ? 'bg' : 'bgh'}`}
                            style={v === 'wrong' ? { background: 'var(--red)' } : undefined}
                            onClick={() => toggleVerdict(u.playerId, 'wrong')}
                          >
                            ❌ خطأ
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </section>

              {!allGraded && (
                <p className="sniper-admin-footnote">صنّف الكل ثم أظهر النتيجة</p>
              )}
              <button type="button" className="btn bg sniper-admin-cta" disabled={!allGraded} onClick={onShowResult}>
                📊 إظهار النتيجة
              </button>
            </>
          )}

          {phase === 'roundResult' && (
            <button type="button" className="btn bg sniper-admin-cta" onClick={onLeaderboard}>
              🏆 عرض الترتيب للجميع
            </button>
          )}

          {phase === 'leaderboard' && (
            <button type="button" className="btn bg sniper-admin-cta" onClick={onNextQuestion}>
              ➡ السؤال التالي
            </button>
          )}
        </>
      )}
    </div>
  );
}
