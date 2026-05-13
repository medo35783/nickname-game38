import { useState } from 'react';
import Av from '../../shared/Av';
import { fmtMs } from '../../core/helpers';
import { db, ref, set, update, gameRef } from '../../core/firebaseHelpers';

export default function TitlesLobby(props) {
  const {
    roomCode,
    role,
    players,
    gameState,
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
    startRound,
    notify,
    myId,
  } = props;

  const [decoyInput, setDecoyInput] = useState('');
  const decoyNicks = Array.isArray(gameState?.decoyNicks) ? gameState.decoyNicks : [];

  const addDecoy = async () => {
    const v = decoyInput.trim();
    if (!v) return;
    if (decoyNicks.some((d) => d.toLowerCase() === v.toLowerCase())) {
      notify('هذا اللقب موجود بالفعل في قائمة التمويه', 'error');
      return;
    }
    const allRealNicks = Object.values(players || {}).flatMap((p) => [p?.nick, p?.nick2].filter(Boolean));
    if (allRealNicks.some((n) => n?.toLowerCase() === v.toLowerCase())) {
      notify('⚠️ هذا اللقب مستخدم من قِبَل أحد المتسابقين — اختر لقبًا مختلفًا', 'error');
      return;
    }
    await update(gameRef(roomCode), { decoyNicks: [...decoyNicks, v] });
    setDecoyInput('');
    notify(`🎭 أُضيف لقب تمويه: "${v}"`, 'gold');
  };

  const removeDecoy = async (nick) => {
    await update(gameRef(roomCode), { decoyNicks: decoyNicks.filter((n) => n !== nick) });
  };

  const playersList = Object.entries(players || {}).map(([id, p]) => ({ ...p, id }));
  const activePlayers = playersList.filter((p) => p.status === 'active');

  const isAdmin = role === 'admin';

  /* ── شاشة انتظار المتسابق (لا تكشف ألقاب اللاعبين الآخرين) ── */
  if (!isAdmin) {
    const me = playersList.find((p) => p.id === myId);
    return (
      <>
        <div style={{ textAlign: 'center', padding: '24px 16px 12px' }}>
          <div style={{ fontSize: 56, marginBottom: 10 }}>⏳</div>
          <div className="ptitle">في انتظار المشرف</div>
          <div className="psub">
            انضممت للغرفة بنجاح!
            <br />
            انتظر حتى يبدأ المشرف اللعبة
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div className="ctitle">
            📡 رمز الغرفة <span className="online-dot" />
          </div>
          <div className="room-code-big">{roomCode}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            <span className="online-dot" /> {activePlayers.length} لاعب في الغرفة الآن
          </div>
        </div>

        {me && (
          <div className="card">
            <div className="ctitle">👤 معلوماتك</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
              <Av p={me} sz={44} fs={14} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{me.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  لقبك:{' '}
                  <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
                    "{me.nick}"
                    {me.nick2 ? <span style={{ color: 'rgba(240,192,64,.6)' }}> · "{me.nick2}"</span> : ''}
                  </span>
                </div>
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                marginTop: 8,
                padding: '8px 10px',
                background: 'rgba(240,192,64,.06)',
                borderRadius: 8,
                border: '1px solid rgba(240,192,64,.15)',
              }}
            >
              💡 لقبك لن يظهر لأحد حتى تبدأ اللعبة — ألقاب بقية اللاعبين مخفية عنك أيضاً
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
          الصفحة تتحدث تلقائياً عند بدء اللعبة 🚀
        </div>
      </>
    );
  }

  const activePoisonNick = gameState?.poisonNick ?? poisonNick;
  const activeSpecialRound = gameState?.specialRound ?? specialRound;
  const isSilentActive = gameState?.silentActive ?? silentRound;

  const totalMs = () =>
    Math.max((Number(attackDur.h) * 3600 + Number(attackDur.m) * 60 + Number(attackDur.s)) * 1000, 5 * 60 * 1000);

  const minPlayers = nickMode === 2 ? 4 : 6;
  const canStart = activePlayers.length >= minPlayers;

  return (
    <>
      <div className="card">
        <div className="ctitle">
          📡 رمز الغرفة <span className="online-dot" />
        </div>
        <div className="room-code-big">{roomCode}</div>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
          أرسل هذا الرمز للمتسابقين — {activePlayers.length} منضم الآن
        </div>
        <button
          type="button"
          className="btn bo bsm"
          style={{ width: 'auto', margin: '0 auto' }}
          onClick={() => {
            navigator.clipboard?.writeText(roomCode);
            notify('تم النسخ ✓', 'success');
          }}
        >
          📋 نسخ الرمز
        </button>
      </div>

      {isAdmin && (
        <div className="card">
          <div className="ctitle">⚙️ إعدادات اللعبة</div>
          <div className="lbl mb2">عدد الألقاب لكل لاعب</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
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
          <div className="lbl mb2">⏱️ مدة كل جولة</div>
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
            مدة الجولة: <strong style={{ color: 'var(--gold)' }}>{fmtMs(totalMs())}</strong>
          </div>
        </div>
      )}

      {isAdmin && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg,rgba(240,192,64,.05),rgba(155,89,182,.03))',
            border: '1px solid rgba(240,192,64,.15)',
            marginBottom: 8,
          }}
        >
          <div className="ctitle" style={{ fontSize: 12 }}>
            ⚗️ أدوات الجولة القادمة
          </div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {[
              [1, '🗡️ عادية'],
              [2, '⚔️ مزدوجة'],
              [3, '⚡ اندفاع'],
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
            <span style={{ fontSize: 10, color: 'var(--purple)', flexShrink: 0 }}>☠️</span>
            <select
              className="inp"
              style={{ flex: 1, fontSize: 11, padding: '4px 8px' }}
              value={activePoisonNick || ''}
              onChange={async (e) => {
                const v = e.target.value;
                setPoisonNick(v);
                await update(gameRef(roomCode), { poisonNick: v || null });
              }}
            >
              <option value="">بدون مسموم</option>
              {playersList
                .filter((p) => p.status === 'active')
                .flatMap((p) => [p.nick, p.nick2].filter(Boolean))
                .map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className={`btn ${isSilentActive ? 'bb' : 'bgh'} bxs`}
              style={{ flex: 1 }}
              onClick={async () => {
                const v = !isSilentActive;
                setSilentRound(v);
                await update(gameRef(roomCode), { silentActive: v });
              }}
            >
              {isSilentActive ? '🤫 صمت مفعّل — إلغاء' : '🔕 تفعيل الصمت'}
            </button>
          </div>
        </div>
      )}

      {/* ── ألقاب التمويه (اختياري — للمشرف فقط) ── */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg,rgba(155,89,182,.06),rgba(79,163,224,.03))',
          border: '1px solid rgba(155,89,182,.18)',
        }}
      >
        <div className="ctitle" style={{ fontSize: 12 }}>
          🎭 ألقاب التمويه <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 10 }}>(اختياري — لإضافة إثارة)</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.6 }}>
          ألقاب وهمية تظهر في لوحة الألقاب — ليس لها صاحب حقيقي، والهجوم عليها يفشل دائماً. تُكشف في نهاية المسابقة.
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input
            className="inp"
            style={{ flex: 1, fontSize: 12, padding: '6px 10px' }}
            placeholder="مثلاً: الشبح، النمر..."
            value={decoyInput}
            onChange={(e) => setDecoyInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void addDecoy();
              }
            }}
          />
          <button type="button" className="btn bg bxs" style={{ width: 'auto', padding: '6px 14px' }} onClick={() => void addDecoy()}>
            ➕ إضافة
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
                  border: '1px solid rgba(155,89,182,.3)',
                  borderRadius: 12,
                  fontSize: 11,
                  color: 'var(--purple)',
                }}
              >
                🎭 &quot;{n}&quot;
                <button
                  type="button"
                  onClick={() => void removeDecoy(n)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--red)',
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: '0 2px',
                  }}
                  aria-label={`حذف ${n}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {playersList.length > 0 && (
        <div className="card">
          <div className="ctitle">👥 المسجلون ({playersList.length})</div>
          <div className="sc">
            {playersList.map((p) => (
              <div key={p.id} className="pi">
                <Av p={p} />
                <div className="pi-info">
                  <div className="pi-name">{p.name}</div>
                  <div className="pi-nick">
                    &quot;{p.nick}&quot;
                    {p.nick2 ? (
                      <span style={{ color: 'rgba(240,192,64,.6)' }}>
                        {' '}
                        · &quot;{p.nick2}&quot;
                      </span>
                    ) : (
                      ''
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    className="btn bgh bxs"
                    onClick={async () => {
                      await set(ref(db, `rooms/${roomCode}/players/${p.id}`), null);
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sg">
        <div className="sbox">
          <div className="snum">{playersList.length}</div>
          <div className="slbl">مسجلون</div>
        </div>
        <div className="sbox">
          <div className="snum" style={{ color: 'var(--green)' }}>
            {activePlayers.length}
          </div>
          <div className="slbl">نشطون</div>
        </div>
      </div>

      {activePlayers.length < minPlayers && playersList.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--red)', textAlign: 'center', marginBottom: 9 }}>
          يلزم {minPlayers - activePlayers.length} لاعب إضافي
        </div>
      )}

      <button
        type="button"
        className="btn bg"
        disabled={!canStart}
        style={{ marginBottom: 8 }}
        onClick={() => void startRound()}
      >
        🚀 بدء الجولة ({activePlayers.length}/{minPlayers}+)
      </button>
    </>
  );
}
