/**
 * ملخص نهاية المسابقة — موحّد للمشرف والمتسابق (سجل كامل + رسوم ثم مسار).
 */
import useWinnerPrize from '../../hooks/useWinnerPrize';
import WinnerPrizeCertificate from '../../shared/WinnerPrizeCertificate';

export default function TitlesGameSummary({
  role,
  players,
  gameState,
  allRoundsData,
  renderStatsPanel,
  downloadPDFReport,
  setTab,
  setSelectedGame,
  onCreateAccount,
  roomCode,
  myId,
  notify,
}) {
  const playersList = Object.entries(players || {}).map(([id, p]) => ({ ...p, id }));
  const activePlayers = playersList.filter((p) => p.status === 'active');
  const primaryWinner = activePlayers[0];
  const roundNum = gameState?.roundNum || 0;

  const adminEntry = playersList.find((p) => p.role === 'admin' || p.isAdmin);
  const { award, loading: prizeLoading } = useWinnerPrize({
    enabled: Boolean(primaryWinner?.name),
    canAward: role === 'admin' || primaryWinner?.id === myId,
    gameType: 'titles',
    roomCode: roomCode || gameState?.roomCode,
    winnerName: primaryWinner?.name,
    playerCount: playersList.length,
    totalRounds: roundNum,
    completed: true,
    adminName: adminEntry?.name || '—',
    participantLabels: playersList.map((p) => p.name || p.nick).filter(Boolean),
    sessionTs: gameState?.sessionEnd || gameState?.endedAt,
  });

  const isWinnerView =
    role === 'admin' || activePlayers.some((p) => p.id === myId);
  const allRoundsList = Object.values(allRoundsData || {}).sort((a, b) => a.round - b.round);
  const allAttacksFlat = allRoundsList.flatMap((r) => Object.values(r.attacks || {}));
  const totalCorrect = allAttacksFlat.filter((a) => a.correct).length;
  const isHost = role === 'admin';

  const attackerRankGlobal = playersList
    .map((p) => {
      const nicks = [p.nick, p.nick2].filter(Boolean);
      const atks = allAttacksFlat.filter((a) => nicks.includes(a.attackerNick));
      return {
        id: p.id,
        nick: p.nick,
        hits: atks.filter((a) => a.correct).length,
        count: atks.length,
      };
    })
    .filter((p) => p.count > 0)
    .sort((a, b) => b.hits - a.hits || b.count - a.count);

  const goHome = () => {
    localStorage.removeItem('ng_session');
    localStorage.removeItem('ng_admin_session');
    setSelectedGame(null);
  };

  return (
    <div className="scr summary-screen">
      <div style={{ textAlign: 'center', padding: '20px 0 12px' }}>
        <div style={{ fontSize: 72, animation: 'bnc 1s infinite' }}>🏆</div>
        <div
          style={{
            fontFamily: 'Cairo',
            fontSize: 24,
            fontWeight: 900,
            background: 'linear-gradient(135deg,var(--gold),var(--brand-orange-light))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          انتهت المسابقة
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, lineHeight: 1.6 }}>
          سجل اللعبة الكامل — نفس الملخص للجميع
        </div>
      </div>

      {activePlayers.map((w, i) => (
        <div
          key={w.id}
          className="wcard"
          style={{
            animation: 'fi .5s ease',
            marginBottom: 10,
            borderWidth: i === 0 ? 2 : 1,
          }}
        >
          <div style={{ fontSize: 40 }}>{i === 0 ? '👑' : '🥈'}</div>
          <div style={{ fontFamily: 'Cairo', fontSize: 20, fontWeight: 900, color: 'var(--gold)' }}>{w.name}</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            &quot;{w.nick}&quot;
            {w.nick2 ? <span style={{ color: 'var(--titles-primary-light)' }}> · &quot;{w.nick2}&quot;</span> : ''}
          </div>
        </div>
      ))}

      <WinnerPrizeCertificate
        award={award}
        loading={prizeLoading}
        isWinnerView={isWinnerView}
        notify={notify}
      />

      <div className="summary-overview-grid">
        <div className="summary-ov-cell">
          <div className="summary-ov-num">{roundNum}</div>
          <div className="summary-ov-lbl">جولات</div>
        </div>
        <div className="summary-ov-cell">
          <div className="summary-ov-num">{allAttacksFlat.length}</div>
          <div className="summary-ov-lbl">هجمات</div>
        </div>
        <div className="summary-ov-cell">
          <div className="summary-ov-num" style={{ color: 'var(--green)' }}>
            {totalCorrect}
          </div>
          <div className="summary-ov-lbl">إصابات</div>
        </div>
        <div className="summary-ov-cell">
          <div className="summary-ov-num">{playersList.length}</div>
          <div className="summary-ov-lbl">مشاركون</div>
        </div>
      </div>

      {attackerRankGlobal.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="ctitle">⚔️ أبرز المنافسين</div>
          {attackerRankGlobal.slice(0, 3).map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 12 }}>
              <span style={{ fontWeight: 900, color: i === 0 ? 'var(--gold)' : 'var(--muted)' }}>{i === 0 ? '👑' : i + 1}</span>
              <span style={{ color: 'var(--gold)', fontWeight: 700, flex: 1 }}>&quot;{p.nick}&quot;</span>
              <span style={{ color: 'var(--green)' }}>{p.hits} ✅</span>
            </div>
          ))}
        </div>
      )}

      {isHost ? (
        <div className="stats-tab-hint">
          📊 تبويب <strong>«المتبقون»</strong> للحالة الحية — و<strong>«مسار اللعبة»</strong> للتفصيل
        </div>
      ) : (
        <div className="stats-tab-hint">
          📊 تبويب <strong>«المتبقون»</strong> — قفل 🔒 حتى يُكشف اللقب
        </div>
      )}

      {renderStatsPanel?.({ embedded: true })}

      {isHost ? (
        <>
          <button type="button" className="btn bg mt2" onClick={downloadPDFReport}>
            📄 تقرير PDF
          </button>
          <button type="button" className="btn bo mt2" onClick={goHome}>
            🏠 القائمة الرئيسية
          </button>
        </>
      ) : (
        <div className="summary-cta-card">
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎭</div>
          <div style={{ fontFamily: 'Cairo', fontSize: 16, fontWeight: 900, color: 'var(--gold)', marginBottom: 6 }}>
            انضم لنا — كن مشرف مسابقتك القادمة
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 14 }}>
            أنشئ حسابك، فعّل كود اشتراك، وادِر غرفتك بدل المجموعات — تحكم كامل بلعبة الألقاب.
          </div>
          <button
            type="button"
            className="btn bg"
            onClick={() => {
              if (onCreateAccount) onCreateAccount();
              else setTab?.('account');
            }}
          >
            📝 إنشاء حساب
          </button>
          <button type="button" className="btn bgh mt2" onClick={goHome}>
            🏠 العودة لساحة الألعاب
          </button>
        </div>
      )}
    </div>
  );
}
