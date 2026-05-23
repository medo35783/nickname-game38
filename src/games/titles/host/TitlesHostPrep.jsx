import HostSetupPanel from './HostSetupPanel';

/** بين الجولات: إعداد + أدوات + زر بدء ثابت (لا يختفي). */
export default function TitlesHostPrep({
  roundNum,
  playersList,
  activePlayers,
  gameState,
  roomCode,
  nickMode,
  setNickMode,
  attackDur,
  setAttackDur,
  specialRound,
  setSpecialRound,
  poisonNick,
  setPoisonNick,
  silentRound,
  setSilentRound,
  remainingTitles,
  onStartNextRound,
  onOpenStats,
  setGameScreen,
}) {
  const nextRn = roundNum + 1;
  const canStart = remainingTitles > 2;

  return (
    <div className="host-prep-scr">
      <div className="host-prep-scroll">
        <button type="button" className="btn bgh bsm" style={{ width: 'auto', marginBottom: 10 }} onClick={() => setGameScreen('results')}>
          ← الكشف
        </button>

        <div className="host-crown-banner" style={{ marginBottom: 12 }}>
          <div className="host-crown-title">⚗️ تجهيز الجولة {nextRn}</div>
          <div className="host-crown-sub">
            اختر المدة والأدوات ثم اضغط الزر الذهبي بالأسفل — يبقى{' '}
            <strong style={{ color: 'var(--green)' }}>{remainingTitles}</strong>{' '}
            {remainingTitles === 1 ? 'لقب' : 'ألقاب'} في الساحة
          </div>
        </div>

        <HostSetupPanel
          phase="revealing"
          roundNum={roundNum}
          roomCode={roomCode}
          nickMode={nickMode}
          setNickMode={setNickMode}
          attackDur={attackDur}
          setAttackDur={setAttackDur}
          playersList={playersList}
          activePlayers={activePlayers}
          gameState={gameState}
          specialRound={specialRound}
          setSpecialRound={setSpecialRound}
          poisonNick={poisonNick}
          setPoisonNick={setPoisonNick}
          silentRound={silentRound}
          setSilentRound={setSilentRound}
          canEditDecoys={false}
          decoyNicks={[]}
          decoyInput=""
          setDecoyInput={() => {}}
          onAddDecoy={() => {}}
          onRemoveDecoy={() => {}}
        />

        <button type="button" className="btn bo bsm" style={{ width: '100%', marginBottom: 8 }} onClick={onOpenStats}>
          📊 إحصائيات المسابقة
        </button>
      </div>

      <div className="host-prep-fab-bar">
        {!canStart && (
          <div style={{ fontSize: 11, color: 'var(--gold)', textAlign: 'center', marginBottom: 8, lineHeight: 1.5 }}>
            بقي {remainingTitles === 1 ? 'لقب واحد' : `${remainingTitles} ألقاب`} — القواعد تعتبر المسابقة منتهية
          </div>
        )}
        <button
          type="button"
          className={`btn ${canStart ? 'bg' : 'br'} host-fab`}
          onClick={() => void onStartNextRound()}
        >
          {canStart ? `▶️ ابدأ الجولة ${nextRn}` : '🏆 إعلان الفائز وإنهاء المسابقة'}
        </button>
      </div>
    </div>
  );
}
