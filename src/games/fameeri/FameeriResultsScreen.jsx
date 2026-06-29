import useWinnerPrize from '../../hooks/useWinnerPrize';
import WinnerPrizeCertificate from '../../shared/WinnerPrizeCertificate';

/**
 * شاشة نتائج القميري — مع شهادة الفائز
 */
export default function FameeriResultsScreen({
  groups,
  attacks = {},
  roomCode,
  gameState,
  myGroupId,
  role = 'player',
  notify,
  onHome,
}) {
  const sorted = [...groups].sort((a, b) => (b.totalRemaining || 0) - (a.totalRemaining || 0));
  const winner = sorted[0];
  const participantLabels = groups.map((g) => g.name).filter(Boolean);

  const { award, loading: prizeLoading } = useWinnerPrize({
    enabled: Boolean(winner?.name),
    canAward: role === 'admin' || winner?.id === myGroupId,
    gameType: 'fameeri',
    roomCode,
    winnerName: winner?.name,
    playerCount: groups.length,
    totalRounds: Number(gameState?.totalRounds) || 0,
    completed: true,
    adminName: gameState?.adminName || '—',
    participantLabels,
    sessionTs: gameState?.sessionEnd || gameState?.endedAt,
  });

  const isWinnerView = role === 'admin' || winner?.id === myGroupId;

  return (
    <div className="scr">
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div style={{ fontSize: 60, animation: 'bnc 1s infinite' }}>🏆</div>
        <div className="ptitle" style={{ fontSize: 24 }}>
          نتائج الجولة
        </div>
      </div>

      <div className="sg sg3" style={{ marginBottom: 12 }}>
        <div className="sbox">
          <div className="snum">{sorted.length}</div>
          <div className="slbl">مجموعات</div>
        </div>
        <div className="sbox">
          <div className="snum" style={{ color: 'var(--red)' }}>
            {Object.values(attacks || {})
              .filter((a) => a.result === 'success')
              .reduce((s, a) => s + (a.hunted || 0), 0)}
          </div>
          <div className="slbl">قميري صيدت</div>
        </div>
        <div className="sbox">
          <div className="snum" style={{ color: 'var(--green)' }}>
            {Object.keys(attacks || {}).length}
          </div>
          <div className="slbl">هجمات</div>
        </div>
      </div>

      {[...sorted].reverse().map((g) => {
        const rank = sorted.length - sorted.findIndex((x) => x.id === g.id);
        const isWinner = rank === 1;
        return (
          <div
            key={g.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              background: isWinner
                ? 'linear-gradient(135deg,rgba(36,143,85,.2),rgba(201,127,26,.1))'
                : 'var(--surface)',
              border: isWinner ? '2px solid var(--fameeri-primary)' : '1px solid var(--border-faint)',
              borderRadius: 14,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontFamily: 'Cairo',
                fontSize: isWinner ? 28 : 20,
                fontWeight: 900,
                width: 34,
                color: isWinner ? 'var(--fameeri-primary)' : 'var(--muted)',
              }}
            >
              {isWinner ? '👑' : rank}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: isWinner ? 16 : 14 }}>{g.name}</div>
            </div>
            <div
              style={{
                fontFamily: 'Cairo',
                fontSize: isWinner ? 28 : 20,
                fontWeight: 900,
                color: isWinner ? 'var(--fameeri-primary)' : 'var(--text)',
              }}
            >
              {g.totalRemaining || 0}
            </div>
          </div>
        );
      })}

      <WinnerPrizeCertificate
        award={award}
        loading={prizeLoading}
        isWinnerView={isWinnerView}
        notify={notify}
      />

      <button type="button" className="btn bgh mt3" onClick={onHome}>
        🏟️ ساحة الألعاب
      </button>
    </div>
  );
}
