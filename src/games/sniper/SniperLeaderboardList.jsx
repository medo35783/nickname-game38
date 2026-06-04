import SniperLeaderboardCard from './SniperLeaderboardCard';

export { sortedSniperPlayers } from './sniperHelpers';

/** قائمة الترتيب — بطاقة فاخرة موحّدة */
export default function SniperLeaderboardList({ players, myId, roomCode, game }) {
  return (
    <SniperLeaderboardCard players={players} myId={myId} roomCode={roomCode} game={game} />
  );
}
