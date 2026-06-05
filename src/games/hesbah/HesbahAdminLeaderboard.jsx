import HesbahLeaderboardCard from './HesbahLeaderboardCard';

/** تبويب الترتيب للمشرف */
export default function HesbahAdminLeaderboard({ players, roomCode, game }) {
  return (
    <HesbahLeaderboardCard
      players={players}
      roomCode={roomCode}
      game={game}
      showMeta
    />
  );
}
