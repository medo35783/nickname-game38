import HesbahLeaderboardCard from './HesbahLeaderboardCard';

export { sortedHesbahPlayers } from './hesbahHelpers';

/** قائمة الترتيب — بطاقة فاخرة موحّدة */
export default function HesbahLeaderboardList({ players, myId, roomCode, game }) {
  return (
    <HesbahLeaderboardCard players={players} myId={myId} roomCode={roomCode} game={game} />
  );
}
