import SniperLeaderboardCard from './SniperLeaderboardCard';

/** تبويب الترتيب للمشرف */
export default function SniperAdminLeaderboard({ players, roomCode, game }) {
  return (
    <SniperLeaderboardCard
      players={players}
      roomCode={roomCode}
      game={game}
      showMeta
    />
  );
}
