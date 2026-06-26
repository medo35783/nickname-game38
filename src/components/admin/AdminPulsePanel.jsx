import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { db, ref, onValue } from '../../core/firebaseHelpers';
import {
  collectActiveRooms,
  aggregateSessionsToday,
} from '../../core/adminPulseHelpers';

function pulseStat(value, label, tone = '') {
  return (
    <div className={`admin-pulse-stat admin-pulse-stat--${tone || 'default'}`}>
      <div className="admin-pulse-stat__val">{value}</div>
      <div className="admin-pulse-stat__lbl">{label}</div>
    </div>
  );
}

/**
 * النبض اللحظي — غرف نشطة + جلسات اليوم (صفحة النظرة العامة)
 */
export default function AdminPulsePanel({ codeStatsById = {} }) {
  const [roomSnaps, setRoomSnaps] = useState({ rooms: {}, qrooms: {}, srooms: {} });
  const [roomsError, setRoomsError] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    let alive = true;
    const unsubs = [];

    const authUnsub = onAuthStateChanged(auth, (user) => {
      unsubs.forEach((fn) => fn());
      unsubs.length = 0;
      if (!user) {
        setLoadingRooms(false);
        return;
      }

      setLoadingRooms(true);
      setRoomsError(false);
      ['rooms', 'qrooms', 'srooms'].forEach((rootKey) => {
        const r = ref(db, rootKey);
        const handler = (snap) => {
          if (!alive) return;
          setRoomSnaps((prev) => ({ ...prev, [rootKey]: snap.val() || {} }));
          setLoadingRooms(false);
        };
        const errHandler = () => {
          if (!alive) return;
          setRoomsError(true);
          setLoadingRooms(false);
        };
        const unsub = onValue(r, handler, errHandler);
        unsubs.push(unsub);
      });
    });

    return () => {
      alive = false;
      authUnsub();
      unsubs.forEach((fn) => fn());
    };
  }, []);

  const activeRooms = useMemo(() => collectActiveRooms(roomSnaps), [roomSnaps]);

  const todayStats = useMemo(() => {
    const list = Object.values(codeStatsById).map((e) => e?.data).filter(Boolean);
    return aggregateSessionsToday(list);
  }, [codeStatsById]);

  const gameBreakdown = [
    { key: 'titles', label: '🎭 ألقاب', count: todayStats.byGame.titles },
    { key: 'fameeri', label: '🦅 قميري', count: todayStats.byGame.fameeri },
    { key: 'hesbah', label: '🎯 حسبة', count: todayStats.byGame.hesbah },
  ];

  return (
    <div className="admin-pulse">
      {roomsError && (
        <div className="admin-pulse-alert">
          تعذّر قراءة الغرف المباشرة — انشر قواعد Firebase المحدّثة (صلاحية الأدمن على{' '}
          <code>rooms/</code>).
        </div>
      )}

      <div className="admin-pulse-grid admin-pulse-grid--2">
        <div className="admin-pulse-card admin-pulse-card--live">
          <div className="admin-pulse-card__head">
            <span className="admin-pulse-live-dot" aria-hidden />
            <strong>غرف نشطة الآن</strong>
            <span className="admin-pulse-card__count">{activeRooms.length}</span>
          </div>
          {loadingRooms ? (
            <p className="admin-pulse-empty">جاري المزامنة…</p>
          ) : activeRooms.length === 0 ? (
            <p className="admin-pulse-empty">لا توجد غرف مفتوحة حالياً</p>
          ) : (
            <ul className="admin-pulse-list">
              {activeRooms.slice(0, 12).map((room) => (
                <li key={room.id} className="admin-pulse-room">
                  <span className="admin-pulse-room__game">
                    {room.gameIcon} {room.gameLabel}
                  </span>
                  <span className="admin-pulse-room__code">{room.roomCode}</span>
                  <span className="admin-pulse-room__meta">
                    {room.playerCount} لاعب · {room.phaseLabel}
                    {room.roundNum > 0 ? ` · ج${room.roundNum}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="admin-pulse-card">
          <div className="admin-pulse-card__head">
            <span aria-hidden>📊</span>
            <strong>جلسات اليوم</strong>
            <span className="admin-pulse-card__hint">آخر 24 ساعة</span>
          </div>
          <div className="admin-pulse-stats-row">
            {pulseStat(todayStats.sessions, 'جلسات حقيقية', 'gold')}
            {pulseStat(todayStats.participants, 'مشاركات', 'blue')}
          </div>
          <div className="admin-pulse-breakdown">
            {gameBreakdown.map((g) => (
              <span key={g.key} className="admin-pulse-chip">
                {g.label}: <strong>{g.count}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
