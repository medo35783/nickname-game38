import { useMemo, useState } from 'react';
import Av from '../../shared/Av';
import LiveConnectionBar from '../titles/LiveConnectionBar';
import SniperCountdown from './SniperCountdown';
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
} from './sniperHelpers';
import SniperTimerPicker from './SniperTimerPicker';

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

  const timerColumn = (
    <div className="sniper-admin-split__col sniper-admin-split__timer">
      <h4 className="sniper-admin-split__title">⏱ مدة السؤال</h4>
      {timerWaiting ? (
        <>
          <p className="sniper-admin-panel__hint">
            افتراضي: {game?.questionSecs ?? 20} ث
          </p>
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
          <button type="button" className="btn bg sniper-admin-start-timer" onClick={onStartTimer}>
            ▶ بدء المؤقت ({maxSec} ث)
          </button>
        </>
      ) : (
        <div className="sniper-admin-timer-live">
          <p className="sniper-admin-panel__hint">
            {timerRunning ? `متبقي ~${countdown ?? maxSec} ث` : 'انتهى الوقت'}
          </p>
        </div>
      )}
    </div>
  );

  const hostColumn = hostParticipates && (
    <div className="sniper-admin-split__col sniper-admin-split__host">
      <h4 className="sniper-admin-split__title">👑 إجابتك للعرض</h4>
      <p className="sniper-admin-panel__hint">لا تُحسب نقاطاً</p>
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
              <div className="sniper-admin-hero__room" title="رمز الغرفة">
                <span className="sniper-admin-hero__room-label">غرفة</span>
                <strong className="sniper-admin-hero__room-code">{roomCode}</strong>
              </div>
            )}
          </div>
          <SniperCountdown
            remaining={countdown}
            maxSeconds={maxSec}
            size={48}
            waiting={timerWaiting}
          />
        </div>
        <div className="sniper-admin-hero__progress" aria-hidden>
          <div className="sniper-admin-hero__progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="sniper-admin-hero__meta">
          <span className="sniper-admin-hero__q">
            سؤال <strong>{currentQ}</strong>
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
        <SniperAdminLeaderboard players={players} />
      ) : (
        <>
          <section className="sniper-admin-panel sniper-admin-question">
            {timerWaiting && (
              <div className="sniper-admin-banner sniper-admin-banner--wait">
                ⏸ اقرأ السؤال ثم ابدأ المؤقت
              </div>
            )}
            {timerRunning && (
              <div className="sniper-admin-banner sniper-admin-banner--run">
                ⏱ العدّ جارٍ
              </div>
            )}
            {grading && (
              <div className="sniper-admin-banner sniper-admin-banner--grade">
                ✋ صنّف الإجابات
              </div>
            )}
            <p className="sniper-admin-question__text">{game?.questionText}</p>
            {game?.questionCategory && (
              <span className="sniper-admin-question__cat">{game.questionCategory}</span>
            )}
            {supervisorNotes?.trim() && (
              <div
                className="sniper-admin-panel"
                style={{
                  marginTop: 10,
                  padding: '10px 12px',
                  background: 'rgba(240,192,64,.08)',
                  border: '1px solid rgba(240,192,64,.28)',
                  borderRadius: 10,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gold)', marginBottom: 6 }}>
                  📝 ملاحظات المشرف — لا تظهر للاعبين
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {supervisorNotes}
                </p>
              </div>
            )}
          </section>

          {phase === 'question' && (
            <section className="sniper-admin-panel sniper-admin-deck">
              <SniperAdminTools
                activeSpecial={special}
                timerRunning={timerRunning}
                onSetSpecial={onSetSpecial}
                onEndTimer={onEndTimer}
              />
              <div
                className={`sniper-admin-split ${!hostParticipates ? 'sniper-admin-split--solo' : ''}`}
              >
                {timerColumn}
                {hostColumn}
              </div>
            </section>
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
