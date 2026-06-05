import { useMemo } from 'react';
import Av from '../../shared/Av';
import HesbahRoomMeta from './HesbahRoomMeta';
import { HESBAH_BRAND, hesbahRoundDisplay, sortedHesbahPlayers } from './hesbahHelpers';

const PODIUM_ORDER = [1, 0, 2];
const PODIUM_HEIGHT = { 0: 76, 1: 58, 2: 46 };
const PODIUM_MEDAL = ['🥇', '🥈', '🥉'];
const PODIUM_CLASS = ['hesbah-lb-podium__slot--gold', 'hesbah-lb-podium__slot--silver', 'hesbah-lb-podium__slot--bronze'];

function PodiumTop3({ top3 }) {
  if (!top3.length) return null;
  return (
    <div className="hesbah-lb-podium" aria-hidden={top3.length < 2}>
      {PODIUM_ORDER.filter((idx) => top3[idx]).map((idx) => {
        const p = top3[idx];
        return (
          <div key={p.id} className={`hesbah-lb-podium__slot ${PODIUM_CLASS[idx]}`}>
            <div className="hesbah-lb-podium__medal">{PODIUM_MEDAL[idx]}</div>
            <Av p={p} sz={idx === 0 ? 44 : 36} />
            <div className="hesbah-lb-podium__name">{p.name}</div>
            <div
              className="hesbah-lb-podium__bar"
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
    <div className={`hesbah-lb-row ${isMe ? 'hesbah-lb-row--me' : ''}`}>
      <span className="hesbah-lb-row__rank">{rank}</span>
      <Av p={p} sz={34} />
      <div className="hesbah-lb-row__info">
        <span className="hesbah-lb-row__name">
          {p.name}
          {p.isOnFire && <span className="hesbah-lb-row__fire">🔥</span>}
        </span>
        {isMe && <span className="hesbah-lb-row__you">أنت</span>}
      </div>
      <span className="hesbah-lb-row__pts">{p.totalScore || 0}</span>
    </div>
  );
}

/**
 * بطاقة ترتيب فاخرة — هوية اللعبة + منصة + قائمة (مناسبة للترويج والمشاركة)
 */
export default function HesbahLeaderboardCard({
  players,
  myId,
  roomCode,
  game,
  showMeta = true,
}) {
  const list = sortedHesbahPlayers(players);
  const top3 = list.slice(0, 3);
  const rest = list.slice(3);
  const leader = list[0];
  const myRank = myId ? list.findIndex((p) => p.id === myId) + 1 : 0;
  const onFire = list.filter((p) => p.isOnFire).length;
  const currentQ = game?.currentQ || 0;
  const totalQ = game?.totalQ || 0;
  const round = useMemo(() => hesbahRoundDisplay(currentQ, totalQ), [currentQ, totalQ]);
  const roundProgress = useMemo(() => {
    if (!round) return null;
    return (
      <span className="hesbah-room-meta__q">
        {round.phase === 'playing' ? `جولة ${round.value}` : `${round.value} ${round.label}`}
      </span>
    );
  }, [round]);

  if (!list.length) {
    return (
      <div className="hesbah-lb-card hesbah-lb-card--empty">
        <div className="hesbah-lb-card__brand">
          <span className="hesbah-lb-card__emoji">{HESBAH_BRAND.emoji}</span>
          <div>
            <h2 className="hesbah-lb-card__title">{HESBAH_BRAND.title}</h2>
            <p className="hesbah-lb-card__tagline">{HESBAH_BRAND.tagline}</p>
          </div>
        </div>
        <p className="hesbah-lb-card__empty">بانتظار اللاعبين…</p>
      </div>
    );
  }

  return (
    <article className="hesbah-lb-card">
      <header className="hesbah-lb-card__header">
        <div className="hesbah-lb-card__brand">
          <span className="hesbah-lb-card__emoji" aria-hidden>
            {HESBAH_BRAND.emoji}
          </span>
          <div>
            <p className="hesbah-lb-card__arena">{HESBAH_BRAND.arena}</p>
            <h2 className="hesbah-lb-card__title">{HESBAH_BRAND.title}</h2>
            <p className="hesbah-lb-card__tagline">{HESBAH_BRAND.tagline}</p>
          </div>
        </div>
        {showMeta && roomCode && (
          <HesbahRoomMeta
            roomCode={roomCode}
            className="hesbah-room-meta--lb"
            roundProgress={roundProgress}
          />
        )}
      </header>

      <div className="hesbah-lb-card__stats">
        {round && (
          <div className="hesbah-lb-stat hesbah-lb-stat--round">
            <span className="hesbah-lb-stat__val">{round.value}</span>
            <span className="hesbah-lb-stat__lbl">{round.label}</span>
          </div>
        )}
        <div className="hesbah-lb-stat">
          <span className="hesbah-lb-stat__val">{list.length}</span>
          <span className="hesbah-lb-stat__lbl">لاعب</span>
        </div>
        {leader && (
          <div className="hesbah-lb-stat hesbah-lb-stat--lead">
            <span className="hesbah-lb-stat__val">{leader.totalScore || 0}</span>
            <span className="hesbah-lb-stat__lbl">نقاط المتصدر</span>
            <span className="hesbah-lb-stat__sub">{leader.name}</span>
          </div>
        )}
        {onFire > 0 && (
          <div className="hesbah-lb-stat hesbah-lb-stat--fire">
            <span className="hesbah-lb-stat__val">🔥 {onFire}</span>
            <span className="hesbah-lb-stat__lbl">مشتعل</span>
          </div>
        )}
      </div>

      {myRank > 0 && (
        <div className="hesbah-lb-card__my-rank">
          مركزك <strong>{myRank}</strong> من {list.length}
        </div>
      )}

      <PodiumTop3 top3={top3} />

      {list.length <= 2 && (
        <div className="hesbah-lb-card__list">
          {list.map((p, i) => (
            <LeaderboardRow key={p.id} p={p} rank={i + 1} isMe={p.id === myId} />
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div className="hesbah-lb-card__list hesbah-lb-card__list--rest">
          {rest.map((p, i) => (
            <LeaderboardRow key={p.id} p={p} rank={i + 4} isMe={p.id === myId} />
          ))}
        </div>
      )}

      <footer className="hesbah-lb-card__foot">
        <span>🏆 ترتيب مباشر</span>
        <span className="hesbah-lb-card__foot-dot">·</span>
        <span>{HESBAH_BRAND.title}</span>
      </footer>
    </article>
  );
}
