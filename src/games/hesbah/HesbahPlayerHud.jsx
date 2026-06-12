import { useEffect, useState } from 'react';
import Av from '../../shared/Av';
import LiveConnectionBar from '../titles/LiveConnectionBar';
import HesbahLeaderboardList from './HesbahLeaderboardList';
import {
  HESBAH_ACCENT_CSS,
  hesbahPlayerQuestionView,
  siegeMinScore,
  isTimerRunning,
} from './HesbahHelpers';
import HesbahTopNav from './HesbahTopNav';

export function getHesbahPlayerAlerts(game, me) {
  const alerts = [];
  if (game?.phase === 'question' && !game?.deadline) {
    const qv = hesbahPlayerQuestionView(game);
    if (qv.mode === 'pending') {
      alerts.push({ key: 'wait-timer', text: '⏳ اختر درجتك — السؤال يظهر عند بدء المؤقت' });
    } else if (qv.oral) {
      alerts.push({ key: 'oral', text: '🎙️ استمع للمشرف — الأسئلة معه فقط' });
    } else if (game?.specialRound === 'lucky' || game?.specialRound === 'siege') {
      alerts.push({ key: 'scoreless', text: '⏸ انتظر بدء المؤقت لكتابة إجابتك' });
    } else {
      alerts.push({ key: 'wait-timer', text: '⏸ انتظر بدء المؤقت لكتابة إجابتك' });
    }
  }
  if (game?.specialRound === 'risk2x') {
    alerts.push({ key: 'risk2x', text: '🔥 خطر 2X — الخطأ أو التكرار يخصم ضعف درجتك!' });
  }
  if (game?.specialRound === 'risk') {
    alerts.push({ key: 'risk', text: '🔥 كرت خطر — الخطأ أو التكرار يخصم نقاط درجتك!' });
  }
  if (game?.specialRound === 'triple') {
    alerts.push({ key: 'triple', text: '💎 كرت ثلاثي — X3 للإجابة الصحيحة' });
  }
  if (game?.specialRound === 'lucky') {
    alerts.push({ key: 'lucky', text: '🎲 كرت حظ — درجتك تُسحب عند الإرسال' });
  }
  if (game?.specialRound === 'siege') {
    alerts.push({ key: 'siege', text: `⚔️ كرت حصار — أعلى درجة ${siegeMinScore(game?.totalQ || 15)}+ تلقائياً` });
  }
  if (game?.specialRound === 'dark') {
    alerts.push({ key: 'dark', text: '🕶️ كرت ظلام — الإجابات بعد انتهاء الوقت' });
  }
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

const COMPACT_SKIP_ALERTS = new Set([
  'wait-timer',
  'scoreless',
  'risk',
  'risk2x',
  'triple',
  'lucky',
  'siege',
  'dark',
  'grade',
]);

const SPECIAL_UNTIL_TIMER = new Set(['risk', 'risk2x', 'triple', 'lucky', 'siege', 'dark']);

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
  onOpenGuide,
  compactAlerts = false,
}) {
  const [playerTab, setPlayerTab] = useState(initialTab);
  const alerts = getHesbahPlayerAlerts(game, me).filter((a) => {
    if (!isTimerRunning(game) && SPECIAL_UNTIL_TIMER.has(a.key)) return false;
    return !compactAlerts || !COMPACT_SKIP_ALERTS.has(a.key);
  });
  const phase = game?.phase;
  const qNum = game?.currentQ;
  const qTotal = game?.totalQ || 15;

  useEffect(() => {
    if (phase === 'leaderboard') setPlayerTab('rank');
    else if (phase === 'question' || phase === 'grading') setPlayerTab('round');
  }, [phase, game?.currentQ]);

  return (
    <div className="scr hesbah-theme hesbah-player-screen">
      <div className="hesbah-sticky-chrome">
        <LiveConnectionBar connected roomCode={roomCode} />

        <div className="hesbah-player-topbar">
          <HesbahTopNav onBack={onExitRequest} />
          {onOpenGuide && (
            <button
              type="button"
              className="hesbah-hud-guide-btn"
              onClick={onOpenGuide}
              aria-label="دليل اللعبة"
            >
              📖
            </button>
          )}
        </div>

        <header className="hesbah-player-hud hesbah-player-hud--slim">
          <Av p={me} sz={34} />
          <div className="hesbah-player-hud__meta">
            <span className="hesbah-player-hud__name">{me?.name || 'متسابق'}</span>
            <span className="hesbah-player-hud__dot" aria-hidden="true">·</span>
            <span className="hesbah-player-hud__round">
              س{qNum || '—'}/{qTotal}
            </span>
            <span className="hesbah-player-hud__dot" aria-hidden="true">·</span>
            <span className="hesbah-player-hud__pts">
              <strong style={{ color: HESBAH_ACCENT_CSS }}>{me?.totalScore ?? 0}</strong>
              <span> نقطة</span>
            </span>
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
                  <div
                    key={a.key}
                    className={`hesbah-player-alert ${a.key === 'risk2x' ? 'hesbah-player-alert--risk2x' : ''}`}
                  >
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
