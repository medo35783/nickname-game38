import HesbahLeaderboardList from './HesbahLeaderboardList';
import HesbahTopNav from './HesbahTopNav';

/** شاشة الترتيب للمتسابق — نفس بطاقة المشرف بدون أزرار التحكم */
export default function HesbahPlayerLeaderboard({
  roomCode,
  players,
  myId,
  game,
  onExitRequest,
}) {
  return (
    <div className="scr hesbah-theme hesbah-player-screen">
      <div className="hesbah-sticky-chrome">
        <HesbahTopNav onBack={onExitRequest} />
      </div>
      <HesbahLeaderboardList
        players={players}
        myId={myId}
        roomCode={roomCode}
        game={game}
      />
      <p className="hesbah-player-wait">⏳ انتظر المشرف للجولة التالية…</p>
    </div>
  );
}
