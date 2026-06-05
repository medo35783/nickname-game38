import { useEffect, useState } from 'react';
import { formatHesbahDateTime } from './hesbahHelpers';

/** رمز الغرفة + التاريخ والوقت */
export default function HesbahRoomMeta({
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
    <div className={`hesbah-room-meta ${className}`.trim()}>
      <span className="hesbah-room-meta__label">رمز الغرفة</span>
      <strong className="hesbah-room-meta__code" aria-label={`رمز الغرفة ${roomCode}`}>
        {roomCode}
      </strong>
      <time className="hesbah-room-meta__time" dateTime={now.toISOString()}>
        {formatHesbahDateTime(now)}
      </time>
      {roundProgress}
    </div>
  );
}
