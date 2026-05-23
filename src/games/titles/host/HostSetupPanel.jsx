import { update, gameRef } from '../../../core/firebaseHelpers';
import { fmtMs } from '../../../core/helpers';
import { silentPendingSummary } from '../silentRoundHelpers';
import HostToolsPanel from './HostToolsPanel';
import { DECOY_NICK_PLACEHOLDER } from '../../../core/formLabels';

/**
 * إعداد + أدوات — تبويب واحد للمشرف (قبل وبعد بدء المسابقة).
 */
export default function HostSetupPanel({
  phase,
  roundNum,
  roomCode,
  nickMode,
  setNickMode,
  attackDur,
  setAttackDur,
  playersList,
  activePlayers,
  gameState,
  specialRound,
  setSpecialRound,
  poisonNick,
  setPoisonNick,
  silentRound,
  setSilentRound,
  canEditDecoys,
  decoyNicks,
  decoyInput,
  setDecoyInput,
  onAddDecoy,
  onRemoveDecoy,
  extendTime,
  showExtend = false,
  isSilentActive = false,
  silentPending = null,
}) {
  const totalMs = () =>
    Math.max((Number(attackDur.h) * 3600 + Number(attackDur.m) * 60 + Number(attackDur.s)) * 1000, 5 * 60 * 1000);

  const silentSummary = silentPendingSummary(silentPending);

  return (
    <>
      {phase === 'attacking' && isSilentActive && (
        <div className="host-silent-status-card">
          <div className="host-silent-status-title">🤫 وضع الصمت مفعّل</div>
          <p className="host-silent-status-line">
            الصمت <strong>لهذه الجولة فقط</strong>. الزر الأسفل يبدأ الجولة <strong>{(roundNum || 0) + 1}</strong> دون كشف — ثم ينتهي وضع الصمت تلقائياً.
          </p>
          {silentSummary ? (
            <div className="silent-badge">
              <span>📦</span>
              <span>مخزّن للإعلان لاحقاً: {silentSummary}</span>
            </div>
          ) : (
            <p className="host-silent-status-muted">لا خروج مخزّن بعد — بعد الهجمات اضغط الزر السفلي.</p>
          )}
        </div>
      )}

      {phase === 'lobby' ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="ctitle">① قواعد المسابقة</div>
          <div className="lbl mb2">عدد الألقاب لكل لاعب</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2].map((n) => (
              <button
                key={n}
                type="button"
                className={`btn ${nickMode === n ? 'bg' : 'bgh'}`}
                style={{ flex: 1 }}
                onClick={async () => {
                  setNickMode(n);
                  if (roomCode) await update(gameRef(roomCode), { nickMode: n });
                }}
              >
                {n === 1 ? 'لقب واحد' : 'لقبان'}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="card"
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            fontSize: 12,
            color: 'var(--muted)',
            lineHeight: 1.6,
            background: 'rgba(255,255,255,.03)',
          }}
        >
          <div className="ctitle" style={{ marginBottom: 4 }}>
            ① قواعد المسابقة
          </div>
          🔒 وضع الألقاب: <strong style={{ color: 'var(--gold)' }}>{nickMode === 2 ? 'لقبان' : 'لقب واحد'}</strong>
        </div>
      )}

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="ctitle">② مدة الجولة {phase !== 'lobby' ? 'القادمة' : ''}</div>
        <div className="tpick">
          {[
            ['h', 'ساعات'],
            ['m', 'دقائق'],
            ['s', 'ثواني'],
          ].map(([k, l]) => (
            <div key={k} className="tunit">
              <label>{l}</label>
              <input
                type="number"
                min="0"
                max={k === 'h' ? 999 : 59}
                value={attackDur[k]}
                onChange={(e) => setAttackDur((p) => ({ ...p, [k]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 7 }}>
          المدة: <strong style={{ color: 'var(--gold)' }}>{fmtMs(totalMs())}</strong>
        </div>
      </div>

      {canEditDecoys && (
        <div
          className="card"
          style={{
            marginBottom: 12,
            background: 'linear-gradient(135deg,rgba(155,89,182,.06),rgba(79,163,224,.03))',
            border: '1px solid rgba(155,89,182,.18)',
          }}
        >
          <div className="ctitle">③ ألقاب التمويه (قبل أول جولة)</div>
          <div style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 8, lineHeight: 1.55 }}>
            {nickMode === 2
              ? 'إلزامي في وضع اللقبين — يُضاف قبل أول جولة فقط'
              : 'اختياري — يُضاف قبل أول جولة فقط'}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input
              className="inp"
              style={{ flex: 1, fontSize: 12 }}
              placeholder={DECOY_NICK_PLACEHOLDER}
              value={decoyInput}
              onChange={(e) => setDecoyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void onAddDecoy();
                }
              }}
            />
            <button type="button" className="btn bg bxs" style={{ width: 'auto' }} onClick={() => void onAddDecoy()}>
              ➕
            </button>
          </div>
          {decoyNicks.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {decoyNicks.map((n) => (
                <span
                  key={n}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 9px',
                    background: 'rgba(155,89,182,.12)',
                    borderRadius: 12,
                    fontSize: 11,
                    color: 'var(--purple)',
                  }}
                >
                  🎭 {n}
                  <button type="button" onClick={() => void onRemoveDecoy(n)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {!canEditDecoys && decoyNicks.length > 0 && (
        <div className="card" style={{ marginBottom: 12, fontSize: 12, color: 'var(--muted)' }}>
          🎭 {decoyNicks.length} لقب تمويه مفعّل
        </div>
      )}

      <div className="card" style={{ marginBottom: 0, paddingBottom: 4 }}>
        <div className="ctitle">{phase === 'lobby' ? '④' : '③'} أدوات الجولة القادمة</div>
      </div>
      <HostToolsPanel
        roomCode={roomCode}
        phase={phase}
        playersList={playersList}
        activePlayers={activePlayers}
        gameState={gameState}
        specialRound={specialRound}
        setSpecialRound={setSpecialRound}
        poisonNick={poisonNick}
        setPoisonNick={setPoisonNick}
        silentRound={silentRound}
        setSilentRound={setSilentRound}
        compact
      />

      {showExtend && extendTime && (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="ctitle">⏱️ تمديد الوقت (الجولة الحالية)</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {[5, 15, 30].map((m) => (
              <button key={m} type="button" className="btn bg bxs" style={{ flex: 1 }} onClick={() => extendTime(m * 60 * 1000)}>
                +{m}د
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
