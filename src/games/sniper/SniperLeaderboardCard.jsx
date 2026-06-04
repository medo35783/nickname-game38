import { useMemo } from 'react';
import Av from '../../shared/Av';
import SniperRoomMeta from './SniperRoomMeta';
import { SNIPER_BRAND, sniperRoundDisplay, sortedSniperPlayers } from './sniperHelpers';

const PODIUM_ORDER = [1, 0, 2];
const PODIUM_HEIGHT = { 0: 76, 1: 58, 2: 46 };
const PODIUM_MEDAL = ['🥇', '🥈', '🥉'];
const PODIUM_CLASS = ['sniper-lb-podium__slot--gold', 'sniper-lb-podium__slot--silver', 'sniper-lb-podium__slot--bronze'];

function PodiumTop3({ top3 }) {
  if (!top3.length) return null;
  return (
    <div className="sniper-lb-podium" aria-hidden={top3.length < 2}>
      {PODIUM_ORDER.filter((idx) => top3[idx]).map((idx) => {
        const p = top3[idx];
        return (
          <div key={p.id} className={`sniper-lb-podium__slot ${PODIUM_CLASS[idx]}`}>
            <div className="sniper-lb-podium__medal">{PODIUM_MEDAL[idx]}</div>
            <Av p={p} sz={idx === 0 ? 44 : 36} />
            <div className="sniper-lb-podium__name">{p.name}</div>
            <div
              className="sniper-lb-podium__bar"
              style={{ height: PODIUM_HEIGHT[idx] || 40 }}
            >
              {p.totalScore || 0}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeaderboardRow({ p, rank, isMe }) {
  return (
    <div className={`sniper-lb-row ${isMe ? 'sniper-lb-row--me' : ''}`}>
      <span className="sniper-lb-row__rank">{rank}</span>
      <Av p={p} sz={34} />
      <div className="sniper-lb-row__info">
        <span className="sniper-lb-row__name">
          {p.name}
          {p.isOnFire && <span className="sniper-lb-row__fire">🔥</span>}
        </span>
        {isMe && <span className="sniper-lb-row__you">أنت</span>}
      </div>
      <span className="sniper-lb-row__pts">{p.totalScore || 0}</span>
    </div>
  );
}

/**
 * بطاقة ترتيب فاخرة — هوية اللعبة + منصة + قائمة (مناسبة للترويج والمشاركة)
 */
export default function SniperLeaderboardCard({
  players,
  myId,
  roomCode,
  game,
  showMeta = true,
}) {
  const list = sortedSniperPlayers(players);
  const top3 = list.slice(0, 3);
  const rest = list.slice(3);
  const leader = list[0];
  const myRank = myId ? list.findIndex((p) => p.id === myId) + 1 : 0;
  const onFire = list.filter((p) => p.isOnFire).length;
  const currentQ = game?.currentQ || 0;
  const totalQ = game?.totalQ || 0;
  const round = useMemo(() => sniperRoundDisplay(currentQ, totalQ), [currentQ, totalQ]);
  const roundProgress = useMemo(() => {
    if (!round) return null;
    return (
      <span className="sniper-room-meta__q">
        {round.phase === 'playing' ? `جولة ${round.value}` : `${round.value} ${round.label}`}
      </span>
    );
  }, [round]);

  if (!list.length) {
    return (
      <div className="sniper-lb-card sniper-lb-card--empty">
        <div className="sniper-lb-card__brand">
          <span className="sniper-lb-card__emoji">{SNIPER_BRAND.emoji}</span>
          <div>
            <h2 className="sniper-lb-card__title">{SNIPER_BRAND.title}</h2>
            <p className="sniper-lb-card__tagline">{SNIPER_BRAND.tagline}</p>
          </div>
        </div>
        <p className="sniper-lb-card__empty">بانتظار اللاعبين…</p>
      </div>
    );
  }

  return (
    <article className="sniper-lb-card">
      <header className="sniper-lb-card__header">
        <div className="sniper-lb-card__brand">
          <span className="sniper-lb-card__emoji" aria-hidden>
            {SNIPER_BRAND.emoji}
          </span>
          <div>
            <p className="sniper-lb-card__arena">{SNIPER_BRAND.arena}</p>
            <h2 className="sniper-lb-card__title">{SNIPER_BRAND.title}</h2>
            <p className="sniper-lb-card__tagline">{SNIPER_BRAND.tagline}</p>
          </div>
        </div>
        {showMeta && roomCode && (
          <SniperRoomMeta
            roomCode={roomCode}
            className="sniper-room-meta--lb"
            roundProgress={roundProgress}
          />
        )}
      </header>

      <div className="sniper-lb-card__stats">
        {round && (
          <div className="sniper-lb-stat sniper-lb-stat--round">
            <span className="sniper-lb-stat__val">{round.value}</span>
            <span className="sniper-lb-stat__lbl">{round.label}</span>
          </div>
        )}
        <div className="sniper-lb-stat">
          <span className="sniper-lb-stat__val">{list.length}</span>
          <span className="sniper-lb-stat__lbl">لاعب</span>
        </div>
        {leader && (
          <div className="sniper-lb-stat sniper-lb-stat--lead">
            <span className="sniper-lb-stat__val">{leader.totalScore || 0}</span>
            <span className="sniper-lb-stat__lbl">نقاط المتصدر</span>
            <span className="sniper-lb-stat__sub">{leader.name}</span>
          </div>
        )}
        {onFire > 0 && (
          <div className="sniper-lb-stat sniper-lb-stat--fire">
            <span className="sniper-lb-stat__val">🔥 {onFire}</span>
            <span className="sniper-lb-stat__lbl">مشتعل</span>
          </div>
        )}
      </div>

      {myRank > 0 && (
        <div className="sniper-lb-card__my-rank">
          مركزك <strong>{myRank}</strong> من {list.length}
        </div>
      )}

      <PodiumTop3 top3={top3} />

      {list.length <= 2 && (
        <div className="sniper-lb-card__list">
          {list.map((p, i) => (
            <LeaderboardRow key={p.id} p={p} rank={i + 1} isMe={p.id === myId} />
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div className="sniper-lb-card__list sniper-lb-card__list--rest">
          {rest.map((p, i) => (
            <LeaderboardRow key={p.id} p={p} rank={i + 4} isMe={p.id === myId} />
          ))}
        </div>
      )}

      <footer className="sniper-lb-card__foot">
        <span>🏆 ترتيب مباشر</span>
        <span className="sniper-lb-card__foot-dot">·</span>
        <span>{SNIPER_BRAND.title}</span>
      </footer>
    </article>
  );
}
