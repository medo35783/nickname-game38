export default function FameeriAdminBattleLog({ qGList, qAttacks }) {
  return (
    <div className="card">
      <div className="ctitle">📜 سجل الهجمات — لكل مجموعة</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {qGList.map((g) => {
          const rows = Object.values(qAttacks || {})
            .filter((a) => a.attackerId === g.id || a.targetId === g.id)
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          return (
            <div key={g.id} className="fameeri-battle-group">
              <div className="fameeri-battle-group__head">
                <span className="fameeri-group-name" style={{ fontSize: 14 }}>
                  {g.name}
                </span>
                <span className="fameeri-battle-group__score">{g.totalRemaining ?? 0} 🐦</span>
              </div>
              {rows.length === 0 ? (
                <div className="fameeri-battle-empty">لا أحداث بعد</div>
              ) : (
                <div className="sc fameeri-battle-feed" style={{ maxHeight: 140 }}>
                  {rows.map((a, idx) => {
                    const outgoing = a.attackerId === g.id;
                    const ok = a.result === 'success' || a.result === 'shielded';
                    return (
                      <div
                        key={idx}
                        className="feed-item"
                        style={{
                          borderColor: outgoing ? (ok ? 'var(--green)' : 'var(--red)') : 'var(--red)',
                          fontSize: 11,
                          marginBottom: 4,
                        }}
                      >
                        {outgoing ? (
                          <>
                            <span style={{ color: 'var(--fameeri-muted)' }}>⚔️ هجوم →</span>{' '}
                            <strong style={{ color: 'var(--red)' }}>{a.targetName}</strong> · 🌳{a.tree} ·{' '}
                            {a.weaponName} —{' '}
                            {a.result === 'success'
                              ? `🎯 ${a.hunted ?? 0}`
                              : a.result === 'shielded'
                                ? '🛡️ درع'
                                : '❌ فشل'}
                          </>
                        ) : (
                          <>
                            <span style={{ color: 'var(--fameeri-muted)' }}>🎯 مِن</span>{' '}
                            <strong className="fameeri-group-name">{a.attackerName}</strong> · 🌳{a.tree} —{' '}
                            {a.result === 'success'
                              ? `خسارة ${a.hunted ?? 0}`
                              : a.result === 'shielded'
                                ? '🛡️ صد الدرع'
                                : '❌ لم يصب'}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
