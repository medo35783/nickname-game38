import { useState } from 'react';
import Av from '../../shared/Av';
import LiveConnectionBar from '../titles/LiveConnectionBar';
import SniperLeaderboardList from './SniperLeaderboardList';
import { SNIPER_ACCENT_CSS } from './sniperHelpers';

export function getSniperPlayerAlerts(game, me) {
  const alerts = [];
  if (game?.specialRound === 'blind') alerts.push({ key: 'blind', text: '🙈 جولة عميان — التصنيف فقط' });
  if (game?.specialRound === 'speed') alerts.push({ key: 'speed', text: '⚡ سرعة قصوى (10 ث)' });
  if (game?.specialRound === 'double') alerts.push({ key: 'double', text: '✖️2 الدرجة مضاعفة' });
  if (me?.isOnFire) alerts.push({ key: 'fire', text: '🔥 أنت مشتعل — بونص +5 عند الإصابة' });
  if (game?.finalVoteActive) alerts.push({ key: 'vote', text: '🗳️ صوّت للسؤال الحاسم' });
  if (game?.phase === 'grading') alerts.push({ key: 'grade', text: '⏳ انتهى الوقت — المشرف يصحّح' });
  if (game?.phase === 'roundResult') alerts.push({ key: 'result', text: '📊 نتيجة الجولة' });
  if (game?.phase === 'leaderboard') alerts.push({ key: 'lb', text: '🏆 ترتيب الجولة' });
  if (game?.finalVoteResult && game?.currentQ > (game?.totalQ || 0)) {
    alerts.push({ key: 'ult', text: `🎲 رهان حاسم: ${game.finalVoteResult} نقطة` });
  }
  return alerts;
}

/** شريط علوي للمتسابق: الاسم، رمز الغرفة، الجولة، الترتيب */
export default function SniperPlayerHud({ roomCode, me, myId, game, players, children }) {
  const [lbOpen, setLbOpen] = useState(false);
  const alerts = getSniperPlayerAlerts(game, me);
  const currentQ = game?.currentQ || 0;
  const totalQ = game?.totalQ || 0;
  const phase = game?.phase;

  const phaseLabel =
    phase === 'question'
      ? 'جولة سؤال'
      : phase === 'grading'
        ? 'تصحيح'
        : phase === 'roundResult'
          ? 'نتيجة'
          : phase === 'leaderboard'
            ? 'ترتيب'
            : phase === 'final'
              ? 'نهائي'
              : 'انتظار';

  return (
    <div className="scr sniper-theme sniper-player-screen">
      <LiveConnectionBar connected roomCode={roomCode} />

      <div className="sniper-player-hud">
        <div className="sniper-player-hud__main">
          <Av p={me} sz={44} />
          <div className="sniper-player-hud__info">
            <div className="sniper-player-hud__name">{me?.name || 'متسابق'}</div>
            <div className="sniper-player-hud__meta">
              <span>
                غرفة <strong className="sniper-player-hud__code">{roomCode}</strong>
              </span>
              {currentQ > 0 && (
                <span>
                  · سؤال <strong>{currentQ}</strong>/{totalQ}
                </span>
              )}
              <span> · {phaseLabel}</span>
            </div>
            <div className="sniper-player-hud__score">
              نقاطك: <strong style={{ color: SNIPER_ACCENT_CSS }}>{me?.totalScore ?? 0}</strong>
              {me?.insuranceLeft > 0 && (
                <span style={{ marginRight: 8, fontSize: 11, color: 'var(--muted)' }}>
                  · 🛡️ {me.insuranceLeft}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="sniper-player-hud__trophy"
            title="الترتيب"
            aria-label="فتح الترتيب"
            onClick={() => setLbOpen(true)}
          >
            🏆
          </button>
        </div>

        {alerts.length > 0 && (
          <div className="sniper-player-alerts">
            {alerts.map((a) => (
              <div key={a.key} className="sniper-player-alert">
                {a.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {children}

      {lbOpen && (
        <div className="modal-bg" onClick={() => setLbOpen(false)} role="presentation">
          <div className="modal-box card sniper-lb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ctitle">🏆 الترتيب الحالي</div>
            <SniperLeaderboardList players={players} myId={myId} />
            <button type="button" className="btn bgh mt2" onClick={() => setLbOpen(false)}>
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
