import { useEffect, useState } from 'react';
import { formatSniperDateTime } from './sniperHelpers';

/** رمز الغرفة + التاريخ والوقت */
export default function SniperRoomMeta({
  roomCode,
  className = '',
  roundProgress,
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  if (!roomCode) return null;

  return (
    <div className={`sniper-room-meta ${className}`.trim()}>
      <span className="sniper-room-meta__label">رمز الغرفة</span>
      <strong className="sniper-room-meta__code" aria-label={`رمز الغرفة ${roomCode}`}>
        {roomCode}
      </strong>
      <time className="sniper-room-meta__time" dateTime={now.toISOString()}>
        {formatSniperDateTime(now)}
      </time>
      {roundProgress}
    </div>
  );
}
