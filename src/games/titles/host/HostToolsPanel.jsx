import { update, gameRef } from '../../../core/firebaseHelpers';

/**
 * أدوات الجولة القادمة — مشتركة بين الكابينة وتجهيز ما بين الجولات.
 */
export default function HostToolsPanel({
  roomCode,
  phase = 'lobby',
  playersList,
  activePlayers,
  gameState,
  specialRound,
  setSpecialRound,
  poisonNick,
  setPoisonNick,
  silentRound,
  setSilentRound,
  compact = false,
}) {
  const activePoisonNick = gameState?.poisonNick ?? poisonNick;
  const activeSpecialRound = gameState?.specialRound ?? specialRound;
  const silentThisRound = phase === 'attacking' && Boolean(gameState?.silentActive);
  const silentNextPrep = Boolean(silentRound);

  const toggleSilentPrep = () => {
    const v = !silentRound;
    setSilentRound(v);
  };

  return (
    <div
      className="card"
      style={{
        background: 'linear-gradient(135deg,rgba(240,192,64,.05),rgba(155,89,182,.03))',
        border: '1px solid rgba(240,192,64,.15)',
        marginBottom: compact ? 10 : 8,
      }}
    >
      <div className="ctitle" style={{ fontSize: compact ? 12 : 14 }}>
        ⚗️ أدوات الجولة القادمة
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.55 }}>
        {silentThisRound ? (
          <>
            <strong style={{ color: 'var(--blue)' }}>هذه الجولة صامتة</strong> — ينتهي الصمت تلقائياً بعدها. لتفعيل صمت جولة أخرى فعّل
            الخيار بالأسفل <strong>قبل</strong> بدء تلك الجولة.
          </>
        ) : (
          <>
            فعّل ما تريد <strong>قبل</strong> بدء الجولة التالية — مسموم، صمت، جولة مزدوجة…
          </>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {[
          [1, '🗡️ عادية'],
          [2, '⚔️ مزدوجة'],
          [3, '⚡ مفاجئ'],
        ].map(([n, label]) => (
          <button
            key={n}
            type="button"
            className={`btn ${activeSpecialRound === n ? 'bg' : 'bgh'} bxs`}
            style={{ flex: 1, fontSize: 10 }}
            onClick={async () => {
              setSpecialRound(n);
              await update(gameRef(roomCode), { specialRound: n });
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: 'var(--purple)' }}>☠️ مسموم</span>
        <select
          className="inp"
          style={{ flex: 1, fontSize: 11 }}
          value={activePoisonNick || ''}
          onChange={async (e) => {
            const v = e.target.value;
            setPoisonNick(v);
            await update(gameRef(roomCode), { poisonNick: v || null });
          }}
        >
          <option value="">بدون مسموم</option>
          {activePlayers
            .flatMap((p) => [p.nick, p.nick2])
            .filter(Boolean)
            .map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
        </select>
      </div>
      {silentThisRound && (
        <div className="silent-badge" style={{ marginBottom: 8 }}>
          <span>🤫</span>
          <span>وضع الصمت نشط الآن — للجولة {gameState?.roundNum || '?'}</span>
        </div>
      )}
      <button
        type="button"
        className={`btn ${silentNextPrep ? 'bb' : 'bgh'} bxs`}
        style={{ width: '100%' }}
        onClick={toggleSilentPrep}
      >
        {silentNextPrep
          ? '🔕 إلغاء صمت الجولة القادمة'
          : silentThisRound
            ? '🔕 تفعيل صمت للجولة التي بعدها'
            : '🔕 تفعيل جولة الصمت (للجولة القادمة)'}
      </button>
      {!compact && activePlayers.length > 0 && (
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>
          {activePlayers.length} لاعب نشط
        </div>
      )}
    </div>
  );
}
