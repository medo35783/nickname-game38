import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchAwardBySessionKey } from '../core/prizeAwards';
import { tryAwardWinnerPrize } from '../core/winnerPrizeFlow';

function buildSessionKey(sessionTs) {
  if (typeof localStorage === 'undefined') return `guest_${sessionTs || 0}`;
  try {
    const raw = JSON.parse(localStorage.getItem('code_active_pfcc') || '{}');
    const codeId = raw.id || raw.codeId || 'guest';
    return `${codeId}_${sessionTs || 0}`;
  } catch {
    return `guest_${sessionTs || 0}`;
  }
}

/**
 * شهادة الفائز — المشرف/الفائز يُنشئ الجائزة، الباقي يقرأ السجل فقط
 */
export default function useWinnerPrize({
  enabled = false,
  canAward = false,
  gameType,
  roomCode,
  winnerName,
  playerCount = 0,
  totalRounds = 0,
  completed = true,
  adminName,
  participantLabels = [],
  sessionTs,
}) {
  const [award, setAward] = useState(null);
  const [loading, setLoading] = useState(false);
  const ranRef = useRef(false);
  const sessionKey = useMemo(() => buildSessionKey(sessionTs), [sessionTs]);

  useEffect(() => {
    if (!enabled || !winnerName) return;
    let cancelled = false;
    setLoading(true);

    const loadExisting = async () => {
      const existing = await fetchAwardBySessionKey(sessionKey);
      if (!cancelled && existing?.winnerName) setAward(existing);
      return existing;
    };

    void (async () => {
      try {
        const existing = await loadExisting();
        if (cancelled) return;

        if (canAward && !ranRef.current && !existing?.winnerName) {
          ranRef.current = true;
          const created = await tryAwardWinnerPrize({
            gameType,
            roomCode,
            winnerName,
            playerCount,
            totalRounds,
            completed,
            adminName,
            participantLabels,
            sessionTs: sessionTs || Date.now(),
          });
          if (!cancelled && created) setAward(created);
        } else if (!existing?.winnerName) {
          const retry = await fetchAwardBySessionKey(sessionKey);
          if (!cancelled && retry) setAward(retry);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    canAward,
    gameType,
    roomCode,
    winnerName,
    playerCount,
    totalRounds,
    completed,
    adminName,
    participantLabels,
    sessionTs,
    sessionKey,
  ]);

  return { award, loading };
}
