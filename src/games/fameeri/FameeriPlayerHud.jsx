/** شريط علوي — اسم المجموعة، القميري، دور اللاعب */
export default function FameeriPlayerHud({ groupName, birds, isLeader, leaderName, playMode, round }) {
  return (
    <header className="fameeri-player-hud">
      <div className="fameeri-player-hud__left">
        <div className="fameeri-player-hud__group">{groupName || '—'}</div>
        <div className="fameeri-player-hud__role">
          {isLeader ? (
            <span className="fameeri-player-badge leader">👑 قائد — تتحكم بالهجوم والدرع</span>
          ) : (
            <span className="fameeri-player-badge member">
              🎯 متسابق{leaderName ? ` · القائد: ${leaderName}` : ' — اقترح للقائد'}
            </span>
          )}
        </div>
      </div>
      <div className="fameeri-player-hud__score">
        <span className="fameeri-player-hud__birds">{birds ?? 0}</span>
        <span className="fameeri-player-hud__birds-ico">🐦</span>
      </div>
      {playMode && (
        <div className="fameeri-player-hud__mode">
          {playMode === 'speed' ? '⚡ وضع السرعة' : `📋 جولة ${round || 1}`}
        </div>
      )}
    </header>
  );
}
