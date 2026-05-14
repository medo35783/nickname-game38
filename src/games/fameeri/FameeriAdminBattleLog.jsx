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
            <div
              key={g.id}
              style={{
                borderRadius: 12,
                padding: 10,
                background: 'linear-gradient(160deg,rgba(240,192,64,.07),#0a0a1c)',
                border: '1px solid rgba(255,255,255,.09)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 900, color: 'var(--gold)', fontSize: 14 }}>{g.name}</span>
                <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 800 }}>{g.totalRemaining ?? 0} 🐦</span>
              </div>
              {rows.length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>لا أحداث بعد</div>
              ) : (
                <div className="sc" style={{ maxHeight: 140 }}>
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
                            <span style={{ color: 'var(--muted)' }}>⚔️ هجوم →</span>{' '}
                            <strong style={{ color: 'var(--red)' }}>{a.targetName}</strong> · 🌳{a.tree} · {a.weaponName} —{' '}
                            {a.result === 'success'
                              ? `🎯 ${a.hunted ?? 0}`
                              : a.result === 'shielded'
                                ? '🛡️ درع'
                                : '❌ فشل'}
                          </>
                        ) : (
                          <>
                            <span style={{ color: 'var(--muted)' }}>🎯 مِن</span>{' '}
                            <strong style={{ color: 'var(--gold)' }}>{a.attackerName}</strong> · 🌳{a.tree} —{' '}
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
