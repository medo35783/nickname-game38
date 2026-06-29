import { useEffect, useState } from 'react';
import Av from '../../shared/Av';
import { playSound } from '../../core/helpers';
import { HESBAH_ACCENT_CSS, HESBAH_THEME, sortedHesbahPlayers } from './HesbahHelpers';
import { downloadHesbahVictoryImage, shareHesbahVictoryImage } from './hesbahVictoryShare';
import HesbahTopNav from './HesbahTopNav';
import EndGameJoinSection from '../../components/codes/EndGameJoinSection';
import useWinnerPrize from '../../hooks/useWinnerPrize';
import WinnerPrizeCertificate from '../../shared/WinnerPrizeCertificate';

function ConfettiBurst() {
  const [bits] = useState(() =>
    Array.from({ length: 64 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.4,
      dur: 2.4 + Math.random() * 1.6,
      w: 5 + Math.random() * 7,
      h: 8 + Math.random() * 12,
      rot: Math.random() * 360,
      shape: i % 3,
      color: [
        HESBAH_THEME.accent,
        HESBAH_THEME.gold,
        HESBAH_THEME.secondary,
        HESBAH_THEME.accentLight,
        '#ffd54f',
        '#fff',
      ][i % 6],
    }))
  );

  return (
    <div className="hesbah-confetti hesbah-confetti--victory" aria-hidden>
      {bits.map((b) => (
        <span
          key={b.id}
          className={`hesbah-confetti__bit hesbah-confetti__bit--${b.shape}`}
          style={{
            left: `${b.left}%`,
            background: b.color,
            width: b.w,
            height: b.h,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.dur}s`,
            transform: `rotate(${b.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function Sparkles() {
  const [dots] = useState(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: 8 + Math.random() * 84,
      top: 6 + Math.random() * 42,
      delay: Math.random() * 2,
    }))
  );
  return (
    <div className="hesbah-victory-sparkles" aria-hidden>
      {dots.map((d) => (
        <span key={d.id} className="hesbah-victory-sparkle" style={{ left: `${d.left}%`, top: `${d.top}%`, animationDelay: `${d.delay}s` }} />
      ))}
    </div>
  );
}

export default function HesbahFinal({
  players,
  roomCode,
  game,
  earlyEnd = false,
  notify,
  onHome,
  onExitRequest,
  hideExitBar = false,
  joinCta = null,
  myId = null,
  role = 'player',
}) {
  const list = sortedHesbahPlayers(players);
  const top3 = list.slice(0, 3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const winner = top3[0];
  const [sharing, setSharing] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const participantLabels = list.map((p) => p.name).filter(Boolean);
  const { award, loading: prizeLoading } = useWinnerPrize({
    enabled: Boolean(winner?.name),
    canAward: role === 'admin' || winner?.id === myId,
    gameType: 'hesbah',
    roomCode,
    winnerName: winner?.name,
    playerCount: list.length,
    totalRounds: Number(game?.currentQ) || Number(game?.totalRounds) || 0,
    completed: true,
    adminName: game?.adminName || '—',
    participantLabels,
    sessionTs: game?.sessionEnd || game?.endedAt,
  });

  const isWinnerView = role === 'admin' || winner?.id === myId;

  useEffect(() => {
    playSound('victory');
    const t1 = setTimeout(() => playSound('victory_chime'), 520);
    const t2 = setTimeout(() => setRevealed(true), 120);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const shareOpts = { players, roomCode, game, earlyEnd: earlyEnd || game?.endedEarly };

  const handleShare = async () => {
    setSharing(true);
    try {
      const method = await shareHesbahVictoryImage(shareOpts);
      notify?.(
        method === 'share' ? '✅ تم فتح المشاركة — اختر واتساب' : '✅ حُمّلت الصورة — أرفقها في واتساب',
        'success'
      );
    } catch {
      notify?.('تعذّر مشاركة الصورة — جرّب «حفظ الصورة»', 'error');
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = async () => {
    setSharing(true);
    try {
      await downloadHesbahVictoryImage(shareOpts);
      notify?.('✅ حُفظت صورة النتائج بدقة عالية', 'success');
    } catch {
      notify?.('تعذّر حفظ الصورة', 'error');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className={`scr hesbah-theme hesbah-final ${revealed ? 'hesbah-final--revealed' : ''}`}>
      {!hideExitBar && typeof onExitRequest === 'function' && (
        <div className="hesbah-sticky-chrome">
          <HesbahTopNav onBack={onExitRequest} />
        </div>
      )}
      <ConfettiBurst />
      <Sparkles />

      <div className="hesbah-final__hero">
        <div className="hesbah-final__trophy" aria-hidden>
          🏆
        </div>
        <div className="ptitle hesbah-final__title">تتويج حَسْبة</div>
        {(earlyEnd || game?.endedEarly) && (
          <span className="hesbah-final__early-badge">إنهاء مبكر — النتائج النهائية</span>
        )}
        {winner && (
          <div className="hesbah-final__winner-card">
            <span className="hesbah-final__winner-crown">👑</span>
            <Av p={winner} sz={56} />
            <div className="hesbah-final__winner-name">{winner.name}</div>
            <div className="hesbah-final__winner-score">{winner.totalScore || 0} نقطة</div>
          </div>
        )}
      </div>

      <WinnerPrizeCertificate
        award={award}
        loading={prizeLoading}
        isWinnerView={isWinnerView}
        notify={notify}
      />

      <div className="hesbah-podium hesbah-podium--victory">
        {podiumOrder.map((p) => {
          const rank = p === top3[0] ? 1 : p === top3[1] ? 2 : 3;
          const heights = { 1: 120, 2: 88, 3: 72 };
          return (
            <div key={p.id} className={`hesbah-podium-slot hesbah-podium-slot--rank-${rank}`}>
              <span className="hesbah-podium-slot__medal">{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</span>
              <Av p={p} sz={rank === 1 ? 52 : 40} />
              <div style={{ fontWeight: 900, fontSize: 13, marginTop: 6 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: HESBAH_ACCENT_CSS }}>{p.totalScore} نقطة</div>
              <div
                className="hesbah-podium-bar"
                style={{
                  height: heights[rank],
                  background:
                    rank === 1
                      ? 'linear-gradient(180deg, var(--hesbah-gold), var(--hesbah-accent), var(--hesbah-secondary))'
                      : 'var(--surface)',
                }}
              >
                {rank}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card hesbah-final__list">
        {list.map((p, i) => (
          <div key={p.id} className={`hesbah-result-row ${i === 0 ? 'hesbah-result-row--winner' : ''}`}>
            <span style={{ width: 22, color: i === 0 ? 'var(--hesbah-gold)' : 'var(--muted)' }}>
              {i === 0 ? '👑' : i + 1}
            </span>
            <Av p={p} sz={30} />
            <span style={{ flex: 1 }}>{p.name}</span>
            <span style={{ fontWeight: 900, color: i === 0 ? HESBAH_ACCENT_CSS : undefined }}>
              {p.totalScore}
            </span>
          </div>
        ))}
      </div>

      <div className="hesbah-victory-share">
        <p className="hesbah-victory-share__hint">شارك النتائج بصورة فاخرة عالية الدقة</p>
        <div className="hesbah-victory-share__actions">
          <button type="button" className="btn bg" disabled={sharing} onClick={() => void handleShare()}>
            {sharing ? '⏳…' : '💬 واتساب / مشاركة'}
          </button>
          <button type="button" className="btn bo" disabled={sharing} onClick={() => void handleDownload()}>
            📥 حفظ الصورة
          </button>
        </div>
      </div>

      {joinCta && (
        <EndGameJoinSection
          playerStats={joinCta.playerStats}
          isGuest={joinCta.isGuest}
          arenaReward={joinCta.arenaReward}
          onArenaSignup={joinCta.onArenaSignup}
          onTryFree={joinCta.onTryFree}
          onPackages={joinCta.onPackages}
        />
      )}

      <button type="button" className="btn bgh hesbah-final__home" onClick={onHome}>
        🏟️ العودة لساحة الألعاب
      </button>
    </div>
  );
}
