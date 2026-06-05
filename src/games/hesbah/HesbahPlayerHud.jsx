import { useEffect, useState } from 'react';
import Av from '../../shared/Av';
import LiveConnectionBar from '../titles/LiveConnectionBar';
import HesbahLeaderboardList from './HesbahLeaderboardList';
import { HESBAH_ACCENT_CSS, hesbahPlayerQuestionView } from './HesbahHelpers';
import HesbahTopNav from './HesbahTopNav';

export function getHesbahPlayerAlerts(game, me) {
  const alerts = [];
  if (game?.phase === 'question' && !game?.deadline) {
    const qv = hesbahPlayerQuestionView(game);
    if (qv.mode === 'blind-pick') {
      alerts.push({ key: 'blind-pick', text: '🙈 عميان — اختر درجتك ثم ينكشف السؤال' });
    } else if (qv.mode === 'pending') {
      alerts.push({ key: 'wait-timer', text: '⏳ اختر درجتك — السؤال يظهر عند بدء المؤقت' });
    } else if (qv.oral) {
      alerts.push({ key: 'oral', text: '🎙️ استمع للمشرف — الأسئلة معه فقط' });
    } else {
      alerts.push({ key: 'wait-timer', text: '⏸ انتظر بدء المؤقت لكتابة إجابتك' });
    }
  }
  if (game?.specialRound === 'blind') alerts.push({ key: 'blind', text: '🙈 جولة عميان — التصنيف فقط' });
  if (game?.specialRound === 'speed') alerts.push({ key: 'speed', text: '⚡ سرعة قصوى (10 ث)' });
  if (game?.specialRound === 'double') alerts.push({ key: 'double', text: '✖️2 الدرجة مضاعفة' });
  if (me?.isOnFire) alerts.push({ key: 'fire', text: '🔥 أنت مشتعل — بونص +5 عند الإصابة' });
  if (game?.finalVoteActive) alerts.push({ key: 'vote', text: '🗳️ صوّت للسؤال الحاسم' });
  if (game?.phase === 'grading') {
    alerts.push({ key: 'grade', text: '⏳ انتهى الوقت — المشرف يصحّح' });
    if (me && !me.submitted) {
      alerts.push({ key: 'miss', text: '⏱️ لم تُرسل إجابتك هذه الجولة' });
    }
  }
  if (game?.phase === 'roundResult') alerts.push({ key: 'result', text: '📊 نتيجة الجولة' });
  if (game?.phase === 'leaderboard') alerts.push({ key: 'lb', text: '🏆 ترتيب الجولة' });
  if (game?.finalVoteResult && game?.currentQ > (game?.totalQ || 0)) {
    alerts.push({ key: 'ult', text: `🎲 رهان حاسم: ${game.finalVoteResult} نقطة` });
  }
  return alerts;
}

const PHASE_BADGE = {
  question: 'جولة',
  grading: 'تصحيح',
  roundResult: 'نتيجة',
  leaderboard: 'ترتيب',
  final: 'نهائي',
};

/**
 * غلاف المتسابق — تبويبان: الجولة + الترتيب (شريط رجوع ثابت دائماً)
 */
export default function HesbahPlayerHud({
  roomCode,
  me,
  myId,
  game,
  players,
  children,
  rankFooter,
  initialTab = 'round',
  onExitRequest,
  hideTabs = false,
}) {
  const [playerTab, setPlayerTab] = useState(initialTab);
  const alerts = getHesbahPlayerAlerts(game, me);
  const phase = game?.phase;
  const phaseBadge = PHASE_BADGE[phase] || 'انتظار';

  useEffect(() => {
    if (phase === 'leaderboard') setPlayerTab('rank');
    else if (phase === 'question' || phase === 'grading') setPlayerTab('round');
  }, [phase, game?.currentQ]);

  return (
    <div className="scr hesbah-theme hesbah-player-screen">
      <div className="hesbah-sticky-chrome">
        <LiveConnectionBar connected roomCode={roomCode} />
        <HesbahTopNav onBack={onExitRequest} />

        <header className="hesbah-player-hud hesbah-player-hud--compact">
          <div className="hesbah-player-hud__main">
            <Av p={me} sz={40} />
            <div className="hesbah-player-hud__info">
              <div className="hesbah-player-hud__name">{me?.name || 'متسابق'}</div>
              <div className="hesbah-player-hud__score">
                نقاطك{' '}
                <strong style={{ color: HESBAH_ACCENT_CSS }}>{me?.totalScore ?? 0}</strong>
                {me?.insuranceLeft > 0 && (
                  <span className="hesbah-player-hud__ins"> · 🛡️ {me.insuranceLeft}</span>
                )}
              </div>
            </div>
            <span className="hesbah-player-hud__phase">{phaseBadge}</span>
          </div>
        </header>

        {!hideTabs && (
          <nav className="hesbah-admin-tabs hesbah-player-tabs" aria-label="المتسابق">
            <button
              type="button"
              className={`hesbah-admin-tabs__btn ${playerTab === 'round' ? 'is-active' : ''}`}
              onClick={() => setPlayerTab('round')}
            >
              🎯 الجولة
            </button>
            <button
              type="button"
              className={`hesbah-admin-tabs__btn ${playerTab === 'rank' ? 'is-active' : ''}`}
              onClick={() => setPlayerTab('rank')}
            >
              🏆 الترتيب
            </button>
          </nav>
        )}
      </div>

      <main className="hesbah-player-main">
        {hideTabs || playerTab === 'round' ? (
          <>
            {!hideTabs && alerts.length > 0 && (
              <div className="hesbah-player-alerts">
                {alerts.map((a) => (
                  <div key={a.key} className="hesbah-player-alert">
                    {a.text}
                  </div>
                ))}
              </div>
            )}
            {children}
          </>
        ) : (
          <>
            <HesbahLeaderboardList
              players={players}
              myId={myId}
              roomCode={roomCode}
              game={game}
            />
            {rankFooter}
          </>
        )}
      </main>
    </div>
  );
}
