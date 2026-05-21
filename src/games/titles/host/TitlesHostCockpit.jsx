import { useState, useMemo } from 'react';
import Av from '../../../shared/Av';
import { fmtMs } from '../../../core/helpers';
import { ref, set, update, db, gameRef } from '../../../core/firebaseHelpers';
import { silentPendingSummary } from '../silentRoundHelpers';
import HostSetupPanel from './HostSetupPanel';

const HOST_TABS = [
  { id: 'players', icon: '👥', label: 'لاعبون' },
  { id: 'setup', icon: '⚙️', label: 'إعداد وأدوات' },
];

/**
 * كابينة مشرف المسابقة — واجهة موحّدة (انتظار + أثناء الهجوم).
 * لا تغيّر منطق Firebase؛ نفس الدوال الممرَّرة من TitlesGame.
 */
export default function TitlesHostCockpit(props) {
  const {
    roomCode,
    phase,
    roundNum,
    players,
    gameState,
    attacks,
    countdown,
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
    form,
    setForm,
    onAddManualPlayer,
    startRound,
    doReveal,
    extendTime,
    endGame,
    setModal,
    setGameScreen,
    setProxyFor,
    setIsProxyMode,
    setMyNick,
    setMyGuess,
    setMySubmitted,
    notify,
    allSubmitted,
    attacksPerRound,
    onOpenStats,
    onAdvanceSilentRound,
  } = props;

  const [hostTab, setHostTab] = useState('players');
  const [decoyInput, setDecoyInput] = useState('');
  const [decoyAskOpen, setDecoyAskOpen] = useState(false);
  const [showOutPlayers, setShowOutPlayers] = useState(false);

  const playersList = useMemo(
    () => Object.entries(players || {}).map(([id, p]) => ({ ...p, id })),
    [players]
  );
  const activePlayers = useMemo(() => playersList.filter((p) => p.status === 'active'), [playersList]);
  const sidelinedPlayers = useMemo(
    () => playersList.filter((p) => p.status && p.status !== 'active'),
    [playersList]
  );
  const attacksList = useMemo(() => Object.values(attacks || {}), [attacks]);

  const decoyNicks = Array.isArray(gameState?.decoyNicks) ? gameState.decoyNicks : [];
  const isSilentActive =
    phase === 'attacking' ? Boolean(gameState?.silentActive) : Boolean(silentRound);
  const silentPending = gameState?.silentPending;
  const silentSummary = silentPendingSummary(silentPending);
  const canEditDecoys = phase === 'lobby' && (roundNum || 0) === 0;

  const minPlayers = nickMode === 2 ? 4 : 6;
  const canStart = activePlayers.length >= minPlayers;

  const totalMs = () =>
    Math.max((Number(attackDur.h) * 3600 + Number(attackDur.m) * 60 + Number(attackDur.s)) * 1000, 5 * 60 * 1000);

  const playerAttackCounts = {};
  attacksList.forEach((a) => {
    if (a.attackerNick) playerAttackCounts[a.attackerNick] = (playerAttackCounts[a.attackerNick] || 0) + 1;
  });

  const cdi = useMemo(() => {
    if (countdown === null) return { label: '—', urgent: false };
    if (countdown <= 0) return { label: 'انتهى الوقت!', urgent: true };
    return { label: fmtMs(countdown), urgent: countdown < 5 * 60 * 1000 };
  }, [countdown]);

  const setupStep = (() => {
    if (phase !== 'lobby') return null;
    if (activePlayers.length < minPlayers) return 2;
    if (canEditDecoys && decoyNicks.length === 0) return 3;
    return 4;
  })();

  const addDecoy = async () => {
    const v = decoyInput.trim();
    if (!v) return;
    if (!canEditDecoys) {
      notify('التمويه يُضاف قبل بدء أول جولة فقط', 'error');
      return;
    }
    if (decoyNicks.some((d) => d.toLowerCase() === v.toLowerCase())) {
      notify('هذا اللقب موجود في التمويه', 'error');
      return;
    }
    const allRealNicks = playersList.flatMap((p) => [p?.nick, p?.nick2].filter(Boolean));
    if (allRealNicks.some((n) => n?.toLowerCase() === v.toLowerCase())) {
      notify('⚠️ اللقب مستخدم من متسابق — اختر غيره', 'error');
      return;
    }
    await update(gameRef(roomCode), { decoyNicks: [...decoyNicks, v] });
    setDecoyInput('');
    notify(`🎭 أُضيف تمويه: "${v}"`, 'gold');
  };

  const removeDecoy = async (nick) => {
    if (!canEditDecoys) return;
    await update(gameRef(roomCode), { decoyNicks: decoyNicks.filter((n) => n !== nick) });
  };

  const handleStartRound = () => {
    if (phase === 'lobby' && canEditDecoys && decoyNicks.length === 0) {
      setDecoyAskOpen(true);
      return;
    }
    void startRound();
  };

  const elimCheat = async (pid) => {
    const p = playersList.find((pl) => pl.id === pid);
    await update(ref(db, `rooms/${roomCode}/players/${pid}`), {
      status: 'cheater',
      eliminatedRound: roundNum,
      eliminatedBy: 'المشرف',
    });
    notify(`🚫 أُخرج ${p?.name}`, 'error');
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(roomCode);
    notify('تم نسخ الرمز ✓', 'success');
  };

  const fab = (() => {
    if (phase === 'lobby') {
      return {
        label: `🚀 ابدأ الجولة (${activePlayers.length}/${minPlayers}+)`,
        disabled: !canStart,
        onClick: handleStartRound,
        hint: canStart
          ? 'تأكد من أدوات الجولة في تبويب «أدوات» إن رغبت'
          : `تحتاج ${minPlayers - activePlayers.length} لاعبين نشطين`,
      };
    }
    if (phase === 'attacking') {
      if (isSilentActive) {
        const nextRn = (roundNum || 0) + 1;
        return {
          mode: 'silent',
          label: `🤫 ابدأ الجولة ${nextRn} — بدون كشف`,
          disabled: !onAdvanceSilentRound,
          onClick: () => void onAdvanceSilentRound?.(),
          hint: `الجولة ${roundNum} تُحفظ سراً — المتسابقون لا يرون من خرج`,
          secondary: {
            label: silentPending?.silentExits?.length
              ? `🔓 إعلان النتائج (${silentPending.silentExits.length} مخفّي)`
              : '🔓 إعلان النتائج الآن',
            onClick: () => void doReveal(),
          },
        };
      }
      return {
        mode: 'normal',
        label: allSubmitted ? '🔓 كشف النتائج ✓' : '🔓 كشف النتائج',
        disabled: false,
        onClick: () => void doReveal(),
        hint: allSubmitted ? 'الجميع أرسل — جاهز للكشف' : 'يمكنك الكشف حتى لو لم يكتمل الجميع',
      };
    }
    return null;
  })();

  const nextRoundPreview = phase === 'attacking' && isSilentActive ? (roundNum || 0) + 1 : null;

  return (
    <div className="host-cockpit">
      <div className="host-status-bar">
        <button type="button" className="host-stat-chip" onClick={copyCode} title="نسخ الرمز">
          <span className="host-stat-ico">📡</span>
          <span className="host-stat-val">{roomCode}</span>
          <span className="host-stat-lbl">الرمز</span>
        </button>
        <div className="host-stat-chip">
          <span className="host-stat-ico">👥</span>
          <span className="host-stat-val">{activePlayers.length}</span>
          <span className="host-stat-lbl">نشطون</span>
        </div>
        {phase === 'attacking' && (
          <div className={`host-stat-chip${cdi.urgent ? ' urg' : ''}`}>
            <span className="host-stat-ico">{cdi.urgent ? '🔴' : '⏱️'}</span>
            <span className="host-stat-val">{cdi.label}</span>
            <span className="host-stat-lbl">الوقت</span>
          </div>
        )}
        <div className={`host-stat-chip${isSilentActive && phase === 'attacking' ? ' silent-on' : ''}`}>
          <span className="host-stat-ico">{isSilentActive && phase === 'attacking' ? '🤫' : '🎯'}</span>
          <span className="host-stat-val">
            {phase === 'lobby' ? '—' : isSilentActive && nextRoundPreview ? `${roundNum}→${nextRoundPreview}` : roundNum}
          </span>
          <span className="host-stat-lbl">{isSilentActive && phase === 'attacking' ? 'صمت' : 'الجولة'}</span>
        </div>
        {onOpenStats && phase !== 'lobby' && (
          <button type="button" className="host-stat-chip" onClick={onOpenStats} title="إحصائيات">
            <span className="host-stat-ico">📊</span>
            <span className="host-stat-val" style={{ fontSize: 11 }}>
              إحصاء
            </span>
            <span className="host-stat-lbl">السجل</span>
          </button>
        )}
        {onOpenStats && phase === 'lobby' && (
          <button type="button" className="host-stat-chip" onClick={onOpenStats} title="إحصائيات">
            <span className="host-stat-ico">📊</span>
            <span className="host-stat-val" style={{ fontSize: 11 }}>
              —
            </span>
            <span className="host-stat-lbl">إحصاء</span>
          </button>
        )}
      </div>

      <div className="host-crown-banner">
        <div className="host-crown-title">👑 مشرف المسابقة</div>
        <div className="host-crown-sub">
          {phase === 'lobby'
            ? 'انسخ الرمز → سجّل اللاعبين → (اختياري) تمويه → ابدأ'
            : isSilentActive
              ? `وضع الصمت — زر واحد يبدأ الجولة ${nextRoundPreview || ''} دون كشف. الإعلان عندما تنتهي كل الجولات السرية.`
              : 'راقب الإرسال، مدّد الوقت، ثم اكشف النتائج'}
        </div>
      </div>

      {phase === 'lobby' && setupStep && (
        <div className="host-steps">
          {[
            [1, '📡 شارك الرمز'],
            [2, '👥 سجّل اللاعبين'],
            [3, '🎭 تمويه (اختياري)'],
            [4, '🚀 ابدأ'],
          ].map(([n, lbl]) => (
            <div key={n} className={`host-step${setupStep === n ? ' on' : setupStep > n ? ' done' : ''}`}>
              <span className="host-step-n">{n}</span>
              <span className="host-step-lbl">{lbl}</span>
            </div>
          ))}
        </div>
      )}

      <div className="host-cockpit-body">
        {hostTab === 'players' && (
          <>
            {phase === 'lobby' && (
              <>
                <button type="button" className="btn bo bsm host-copy-btn" onClick={copyCode}>
                  📋 نسخ رمز الغرفة للواتساب
                </button>
                {playersList.length === 0 && (
                  <div className="card host-empty-card">
                    <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
                    <div style={{ fontWeight: 800, color: 'var(--gold)' }}>لا مسجّلين بعد</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, lineHeight: 1.6 }}>
                      أرسل الرمز أو أضف لاعبين يدوياً من الأسفل
                    </div>
                  </div>
                )}
              </>
            )}

            {phase === 'attacking' && (
              <div className="counter-bar" style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 14 }}>📨</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>
                    {attacksList.length}/{activePlayers.length * attacksPerRound} هجمة
                    {allSubmitted && <span style={{ color: 'var(--green)' }}> ✓</span>}
                  </div>
                  <div className="counter-track mt2">
                    <div
                      className="counter-fill"
                      style={{
                        width: `${(attacksList.length / Math.max(activePlayers.length * attacksPerRound, 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <div className="ctitle">👥 نشطون ({activePlayers.length})</div>
              <div className="sc" style={{ maxHeight: phase === 'attacking' ? 320 : 240 }}>
                {activePlayers.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, padding: 12 }}>لا يوجد لاعبون نشطون</div>
                ) : (
                  activePlayers.map((p) => {
                    const pNicks = [p.nick, p.nick2].filter(Boolean);
                    const pDone = pNicks.reduce((s, n) => s + (playerAttackCounts[n] || 0), 0);
                    const allDone = phase === 'attacking' && pDone >= attacksPerRound;
                    const isBanned = p.isBannedNextRound && p.isBannedNextRound >= roundNum;
                    return (
                      <div key={p.id} className="pi" style={{ marginBottom: 4 }}>
                        <Av p={p} sz={phase === 'attacking' ? 30 : 36} fs={11} />
                        <div className="pi-info">
                          <div className="pi-name">{p.name}</div>
                          <div className="pi-nick">
                            &quot;{p.nick}&quot;
                            {p.nick2 ? <span style={{ color: 'rgba(240,192,64,.6)' }}> · &quot;{p.nick2}&quot;</span> : ''}
                          </div>
                          {phase === 'attacking' && (
                            <div
                              style={{
                                fontSize: 10,
                                marginTop: 2,
                                color: isBanned ? 'var(--purple)' : allDone ? 'var(--green)' : pDone > 0 ? 'var(--gold)' : 'var(--muted)',
                              }}
                            >
                              {isBanned
                                ? '☠️ محروم'
                                : allDone
                                  ? `✅ ${pDone}/${attacksPerRound}`
                                  : pDone > 0
                                    ? `⚡ ${pDone}/${attacksPerRound}`
                                    : '⏳ لم يرسل'}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                          {phase === 'lobby' && (
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
                          {phase === 'attacking' && !allDone && !isBanned && p.status === 'active' && (
                            <button
                              type="button"
                              className="btn bb bxs"
                              onClick={() => {
                                setProxyFor(p.id);
                                setIsProxyMode(true);
                                setMyNick(null);
                                setMyGuess(null);
                                setMySubmitted(false);
                                setGameScreen('attack');
                              }}
                            >
                              🎮
                            </button>
                          )}
                          {phase === 'attacking' && p.status === 'active' && (
                            <button type="button" className="btn br bxs" onClick={() => void elimCheat(p.id)}>
                              غش
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {sidelinedPlayers.length > 0 && (
              <>
                <button type="button" className="btn bgh bxs host-out-toggle" onClick={() => setShowOutPlayers((v) => !v)}>
                  {showOutPlayers ? '▼' : '▶'} خرجوا من اللعبة ({sidelinedPlayers.length})
                </button>
                {showOutPlayers && (
                  <div className="card" style={{ opacity: 0.85, marginBottom: 10 }}>
                    <div className="sc" style={{ maxHeight: 120 }}>
                      {sidelinedPlayers.map((p) => (
                        <div key={p.id} className="pi" style={{ marginBottom: 4, fontSize: 11 }}>
                          <Av p={p} sz={26} fs={10} />
                          <div className="pi-info">
                            <div className="pi-name">{p.name}</div>
                            <div style={{ color: 'var(--muted)', fontSize: 10 }}>
                              {p.status === 'cheater' ? '🚫 غش' : p.status === 'inactive' ? '😴 خمول' : `خرج ج${p.eliminatedRound || '?'}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {phase === 'lobby' && form && setForm && onAddManualPlayer && (
              <div className="card">
                <div className="ctitle">➕ إضافة يدوياً</div>
                <div className="ig">
                  <label className="lbl">الاسم</label>
                  <input
                    className="inp"
                    placeholder="محمد"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="ig">
                  <label className="lbl">اللقب{nickMode === 2 ? ' الأول' : ''}</label>
                  <input
                    className="inp"
                    placeholder="القناص"
                    value={form.nick}
                    onChange={(e) => setForm((f) => ({ ...f, nick: e.target.value }))}
                  />
                </div>
                {nickMode === 2 && (
                  <div className="ig">
                    <label className="lbl">اللقب الثاني</label>
                    <input
                      className="inp"
                      value={form.nick2}
                      onChange={(e) => setForm((f) => ({ ...f, nick2: e.target.value }))}
                    />
                  </div>
                )}
                <button type="button" className="btn bg" onClick={() => void onAddManualPlayer()}>
                  ➕ إضافة
                </button>
              </div>
            )}

            {phase === 'attacking' && attacksList.length > 0 && (
              <div className="card">
                <div className="ctitle">🕵️ آخر الهجمات</div>
                <div className="sc" style={{ maxHeight: 140 }}>
                  {attacksList.slice(-12).map((a, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '5px 8px',
                        marginBottom: 3,
                        background: '#09091e',
                        borderRadius: 7,
                        borderRight: `3px solid ${a.correct ? 'var(--green)' : 'var(--red)'}`,
                        fontSize: 11,
                      }}
                    >
                      &quot;{a.attackerNick}&quot; → &quot;{a.targetNick}&quot;{' '}
                      <span style={{ color: a.correct ? 'var(--green)' : 'var(--red)' }}>{a.correct ? '✅' : '❌'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {hostTab === 'setup' && (
          <HostSetupPanel
            phase={phase}
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
            canEditDecoys={canEditDecoys}
            decoyNicks={decoyNicks}
            decoyInput={decoyInput}
            setDecoyInput={setDecoyInput}
            onAddDecoy={addDecoy}
            onRemoveDecoy={removeDecoy}
            extendTime={extendTime}
            showExtend={phase === 'attacking'}
            isSilentActive={isSilentActive}
            silentPending={silentPending}
          />
        )}
      </div>

      {fab && (
        <div className={`host-fab-wrap${fab.mode === 'silent' ? ' silent-mode' : ''}`}>
          {fab.mode === 'silent' && (
            <div className="host-silent-pill">
              <span className="host-silent-pill-ico">🤫</span>
              <span>وضع الصمت — الجولة {(roundNum || 0) + 1} بدون إعلان</span>
            </div>
          )}
          {fab.hint && <div className="host-fab-hint">{fab.hint}</div>}
          <button
            type="button"
            className={`btn host-fab ${fab.mode === 'silent' ? 'bb' : 'bg'}`}
            disabled={fab.disabled}
            onClick={fab.onClick}
          >
            {fab.label}
          </button>
          {fab.secondary && (
            <button type="button" className="btn bgh bsm host-fab-secondary" onClick={fab.secondary.onClick}>
              {fab.secondary.label}
            </button>
          )}
        </div>
      )}

      <nav className="host-bnav" aria-label="تبويبات المشرف">
        {HOST_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`host-bnav-item${hostTab === t.id ? ' on' : ''}`}
            onClick={() => setHostTab(t.id)}
          >
            <span className="host-bnav-ico">{t.icon}</span>
            <span className="host-bnav-lbl">{t.label}</span>
          </button>
        ))}
      </nav>

      <button
        type="button"
        className="btn bgh bsm host-end-btn"
        onClick={() => setModal({ type: 'confirm_end' })}
      >
        🛑 إنهاء المسابقة
      </button>

      {decoyAskOpen && (
        <div className="mbg" style={{ zIndex: 180 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="micn">🎭</div>
            <div className="mtitle" style={{ color: 'var(--purple)' }}>
              ألقاب التمويه؟
            </div>
            <div className="msub" style={{ lineHeight: 1.75 }}>
              التمويه <strong>اختياري</strong> لكنه يزيد فرص التخمين ويُضاف <strong>قبل أول جولة فقط</strong>.
              <br />
              هل تريد إضافة ألقاب وهمية قبل البدء؟
            </div>
            <button
              type="button"
              className="btn bg"
              style={{ width: '100%', marginBottom: 8 }}
              onClick={() => {
                setDecoyAskOpen(false);
                setHostTab('setup');
              }}
            >
              ➕ نعم — أضيف تمويه الآن
            </button>
            <button
              type="button"
              className="btn bo"
              style={{ width: '100%', marginBottom: 8 }}
              onClick={() => {
                setDecoyAskOpen(false);
                void startRound();
              }}
            >
              🚀 لا — ابدأ بدون تمويه
            </button>
            <button type="button" className="btn bgh bsm" style={{ width: '100%' }} onClick={() => setDecoyAskOpen(false)}>
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
