import { useState, useEffect } from 'react';
import { ref as dbRef, update } from 'firebase/database';
import { db } from '../../firebase';
import { Q_TREES, Q_WEAPONS } from '../../core/constants';
import { playSound } from '../../core/helpers';
import { applySpeedRoundWrong } from './fameeriSpeedRound';
import { startAttackTimer, resolveAttackFail, continueAfterReveal, beginShieldWindow, finalizeShieldWindowIfDue, SHIELD_WINDOW_SEC } from './fameeriAdminResolve';
import FameeriAdminStepper from './FameeriAdminStepper';
import FameeriAdminAttack from './FameeriAdminAttack';
import FameeriAdminBattleLog from './FameeriAdminBattleLog';
import FameeriAdminRibbon from './FameeriAdminRibbon';
import FameeriAdminGroupDetail from './FameeriAdminGroupDetail';
import FameeriAdminDuel from './FameeriAdminDuel';
import FameeriGroupForest from './FameeriGroupForest';
import FameeriRevealOverlay from './FameeriRevealOverlay';
import AdminQuestionView from '../../question-bank/AdminQuestionView';

const TIMER_PRESETS = [15, 30, 45, 60];
const SPEED_PRESETS = [10, 20, 35];

export default function FameeriAdminPlay({
  qRoom,
  qGameState,
  qGList,
  qGroups,
  qAttacks,
  qReveal,
  setQReveal,
  qCountdown,
  qActiveQuestion,
  qActiveAnswer,
  qAdminGroupAnswers,
  qAdminPendingGroups,
  toggleQuestionReveal,
  drawNextQuestion,
  qPool,
  speedWinSelect,
  setSpeedWinSelect,
  speedRoundSecs,
  setSpeedRoundSecs,
  qCustomTimer,
  setQCustomTimer,
  notify,
  accent,
  recordRoundCompleted,
  onEndGame,
  onOpenReport,
}) {
  const [tab, setTab] = useState('control');
  const [endConfirm, setEndConfirm] = useState(false);

  const turnGroupId = qGameState?.turnGroup;
  const turnGroup = qGList.find((g) => g.id === turnGroupId);
  const qCurrentAttack = qGameState?.currentAttack;
  const qTimer = qGameState?.timer;
  const shieldWindow = qGameState?.shieldWindow;
  const assistMode = !!qGameState?.assistMode;
  const playMode = qGameState?.playMode || 'sequential';
  const isSpeed = playMode === 'speed';
  const claimIds = Object.keys(qGameState?.speedClaims || {});
  const needPickWinner = claimIds.length > 1;
  const canStartSpeedTimer = !needPickWinner || !!speedWinSelect;

  const sorted = [...qGList].sort((a, b) => (b.totalRemaining || 0) - (a.totalRemaining || 0));
  const leader = sorted[0];

  const [shieldCountdown, setShieldCountdown] = useState(null);

  useEffect(() => {
    const dl = shieldWindow?.deadline;
    if (!dl) {
      setShieldCountdown(null);
      return;
    }
    const tick = () => {
      const rem = Math.ceil((dl - Date.now()) / 1000);
      setShieldCountdown(rem <= 0 ? 0 : rem);
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [shieldWindow?.deadline]);

  useEffect(() => {
    if (!shieldWindow?.deadline || !qRoom) return;
    const remaining = shieldWindow.deadline - Date.now();
    const run = () => {
      void finalizeShieldWindowIfDue({
        qRoom,
        qGameState,
        qGList,
        qGroups,
        recordRoundCompleted,
      }).then(() => playSound('explosion'));
    };
    if (remaining <= 0) {
      run();
      return undefined;
    }
    const t = setTimeout(run, remaining + 120);
    return () => clearTimeout(t);
  }, [shieldWindow?.deadline, qRoom]);

  const speedWinId =
    shieldWindow?.winnerGroupId ||
    (claimIds.length === 1 ? claimIds[0] : speedWinSelect) ||
    null;
  const shieldTargetAttack =
    qCurrentAttack ||
    (speedWinId && qGameState?.speedClaims?.[speedWinId]) ||
    null;
  const shieldTargetGroup = shieldTargetAttack
    ? qGList.find((g) => g.id === shieldTargetAttack.targetId)
    : null;

  const setPlayMode = async (mode) => {
    await update(dbRef(db, `qrooms/${qRoom}/game`), {
      playMode: mode,
      speedBatchActive: false,
      speedClaims: {},
    });
  };

  const setTurn = async (gid) => {
    await update(dbRef(db, `qrooms/${qRoom}/game`), { turnGroup: gid });
  };

  const handleContinueReveal = async () => {
    const lrSnap = qGameState?.lastResult;
    setQReveal(null);
    await continueAfterReveal({
      qRoom,
      qGameState,
      qGList,
      lrSnap,
      recordRoundCompleted,
    });
  };

  const tabs = [
    ['control', '⚔️ التحكم'],
    ['stats', '📊 الإحصائيات'],
    ['log', '📜 السجل'],
  ];

  const statusLabel = (() => {
    if (qReveal) return '🎬 عرض النتيجة';
    if (shieldWindow) return '🛡️ نافذة الدرع';
    if (qCurrentAttack && qTimer) return '⏱️ حسم الهجوم';
    if (qCurrentAttack) return '⚔️ هجوم وارد';
    if (isSpeed && qGameState?.speedBatchActive) return '⚡ حسم السرعة';
    if (isSpeed && claimIds.length) return '📨 طلبات السرعة';
    if (isSpeed) return '⚡ انتظار طلبات';
    return `📋 دور ${turnGroup?.name || '—'}`;
  })();

  return (
    <div className="fameeri-admin-play">
      {qReveal && (
        <FameeriRevealOverlay
          qReveal={qReveal}
          showContinue={qReveal.phase === 'result'}
          onContinue={() => void handleContinueReveal()}
        />
      )}

      <FameeriAdminStepper phase="playing" roomCode={qRoom} assistMode={assistMode} />

      {/* شريط الحالة */}
      <div className="fameeri-admin-status card">
        <div className="fameeri-admin-status__main">{statusLabel}</div>
        {!isSpeed && (
          <div className="fameeri-admin-status__sub">
            الجولة {qGameState?.round || 1} · {qGList.length} مجموعات
          </div>
        )}
        {isSpeed && (
          <div className="fameeri-admin-status__sub">وضع السرعة — الجميع يُرسل ثم المشرف يحسم</div>
        )}
      </div>

      {qActiveQuestion && (
        <AdminQuestionView
          current={qActiveQuestion}
          answer={qActiveAnswer}
          groupAnswers={qAdminGroupAnswers}
          pendingGroups={qAdminPendingGroups}
          onToggleRevealQuestion={() => void toggleQuestionReveal('revealToPlayers')}
          onToggleRevealOptions={() => void toggleQuestionReveal('revealOptions')}
          onDrawNext={qPool.length ? () => void drawNextQuestion() : undefined}
          accent={accent}
        />
      )}

      {/* شريط المجموعات — مصدر واحد بدون تكرار */}
      <div className="card fameeri-admin-ribbon-wrap">
        <div className="fameeri-admin-ribbon-wrap__head">
          <span className="ctitle" style={{ margin: 0 }}>🏟️ الميدان</span>
          {tab === 'control' && !isSpeed && !qCurrentAttack && (
            <span className="fameeri-admin-ribbon-wrap__hint">اضغط لتغيير الدور</span>
          )}
        </div>
        <FameeriAdminRibbon
          groups={sorted}
          turnGroupId={turnGroupId}
          onSelectTurn={tab === 'control' && !isSpeed ? setTurn : undefined}
          selectable={tab === 'control' && !isSpeed && !qCurrentAttack}
        />
      </div>

      {/* تبويبات */}
      <div className="fameeri-admin-tabs">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`fameeri-admin-tab${tab === id ? ' on' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'control' && (
        <>
          {/* ══ منطقة الإجراء الرئيسي ══ */}
          <div className="fameeri-admin-action-card card">
            {/* هجوم جاري */}
            {qCurrentAttack && (
              <>
                <div className="fameeri-admin-action-card__tag attack">⚔️ هجوم نشط</div>
                <FameeriAdminDuel
                  attackerName={qCurrentAttack.attackerName}
                  targetName={qCurrentAttack.targetName}
                  tree={qCurrentAttack.tree}
                  weaponName={qCurrentAttack.weaponName}
                  weaponIcon={Q_WEAPONS.find((w) => w.id === qCurrentAttack.weapon)?.icon}
                  size="lg"
                />
                {(() => {
                  const atkG = qGList.find((g) => g.id === qCurrentAttack.attackerId);
                  const tgtG = qGList.find((g) => g.id === qCurrentAttack.targetId);
                  const wId = qCurrentAttack.weapon;
                  const wDef = Q_WEAPONS.find((w) => w.id === wId);
                  const atkQty = atkG?.weapons?.[wId] ?? 0;
                  const treeQty = tgtG?.trees?.[qCurrentAttack.tree] ?? 0;
                  return (
                    <>
                      <div className="fameeri-admin-attack-intel">
                        <span>🔫 {wDef?.icon} {atkQty} {wDef?.name} متبقٍ للمهاجِم</span>
                        <span>🌳 {treeQty} قميري على شجرة {qCurrentAttack.tree}</span>
                        {tgtG?.shield === qCurrentAttack.tree && (
                          <span className="fameeri-admin-attack-intel__shield">🛡️ الدرع مُفعّل على هذه الشجرة!</span>
                        )}
                      </div>
                      {tgtG && (
                        <FameeriGroupForest
                          group={tgtG}
                          groupId={tgtG.id}
                          attacks={qAttacks}
                          underAttackTree={qCurrentAttack.tree}
                          shieldTree={tgtG.shield}
                          title={`🌳 أشجار الهدف — ${tgtG.name}`}
                          showHint={false}
                          compact
                        />
                      )}
                    </>
                  );
                })()}

                {!qTimer && !shieldWindow && (
                  <div className="fameeri-admin-timer-setup">
                    <div className="lbl">⏱️ مدة المؤقت</div>
                    <div className="fameeri-admin-pills">
                      {TIMER_PRESETS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className="btn bg bsm"
                          onClick={async () => {
                            await startAttackTimer(qRoom, s);
                            playSound('suspense');
                          }}
                        >
                          {s}ث
                        </button>
                      ))}
                    </div>
                    <div className="fameeri-admin-inline-form" style={{ marginTop: 8 }}>
                      <input
                        type="number"
                        className="inp"
                        placeholder="مخصص (ث)"
                        value={qCustomTimer}
                        onChange={(e) => setQCustomTimer(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn bg bsm"
                        onClick={async () => {
                          const s = parseInt(qCustomTimer, 10) || 30;
                          await startAttackTimer(qRoom, s);
                          setQCustomTimer('');
                          playSound('suspense');
                        }}
                      >
                        ⏱️
                      </button>
                    </div>
                  </div>
                )}

                {qTimer && !shieldWindow && (
                  <>
                    <div className="fameeri-admin-timer-display">
                      {qCountdown !== null ? (qCountdown > 0 ? qCountdown : '⏰') : '...'}
                    </div>
                    <div className="fameeri-admin-verdict">
                      <button
                        type="button"
                        className="btn bv fameeri-admin-verdict__btn"
                        onClick={async () => {
                          await beginShieldWindow(qRoom);
                          playSound('suspense');
                        }}
                      >
                        ✅ صح — نجاح
                      </button>
                      <button
                        type="button"
                        className="btn br fameeri-admin-verdict__btn"
                        onClick={async () => {
                          await resolveAttackFail({ qRoom, qCurrentAttack, qGroups });
                          playSound('countdown_last');
                        }}
                      >
                        ❌ خطأ — فشل
                      </button>
                    </div>
                  </>
                )}

                {shieldWindow && shieldTargetAttack && (
                  <div className="fameeri-admin-shield-window">
                    <div className="fameeri-admin-action-card__tag shield">🛡️ نافذة الدرع ({SHIELD_WINDOW_SEC}ث)</div>
                    <div className="fameeri-admin-shield-window__count">
                      {shieldCountdown !== null ? (shieldCountdown > 0 ? shieldCountdown : '⏰') : '...'}
                    </div>
                    <div className="fameeri-admin-shield-window__hint">
                      {shieldTargetGroup?.name} لديها {shieldCountdown ?? SHIELD_WINDOW_SEC} ثانية لتفعيل الدرع (مرة واحدة)
                    </div>
                    {shieldTargetGroup?.shield === shieldTargetAttack.tree && (
                      <div className="fameeri-admin-attack-intel__shield">🛡️ الدرع مُفعّل على 🌳{shieldTargetAttack.tree}!</div>
                    )}
                    {!shieldTargetGroup?.shieldUsed && !shieldTargetGroup?.shield && (
                      <div className="fameeri-admin-shield-window__wait">⏳ بانتظار قرار المدافع…</div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* حسم السرعة */}
            {!qCurrentAttack && isSpeed && qGameState?.speedBatchActive && qTimer && !shieldWindow && (
              <>
                <div className="fameeri-admin-action-card__tag speed">⚡ حسم السرعة</div>
                <div className="fameeri-admin-timer-display">{qCountdown !== null ? (qCountdown > 0 ? qCountdown : '⏰') : '...'}</div>
                <div className="fameeri-admin-verdict">
                  <button
                    type="button"
                    className="btn bv fameeri-admin-verdict__btn"
                    disabled={claimIds.length > 1 && !speedWinSelect}
                    onClick={async () => {
                      const ids = claimIds;
                      if (ids.length > 1 && !speedWinSelect) return;
                      const win = ids.length === 1 ? ids[0] : speedWinSelect;
                      await beginShieldWindow(qRoom, { winnerGroupId: win });
                      playSound('suspense');
                    }}
                  >
                    ✅ صح
                  </button>
                  <button
                    type="button"
                    className="btn br fameeri-admin-verdict__btn"
                    onClick={async () => {
                      await applySpeedRoundWrong({ qRoom, qGameState, qGroups });
                      playSound('countdown_last');
                    }}
                  >
                    ❌ خطأ
                  </button>
                </div>
              </>
            )}

            {/* نافذة الدرع — وضع السرعة */}
            {!qCurrentAttack && shieldWindow && shieldTargetAttack && (
              <div className="fameeri-admin-shield-window">
                <div className="fameeri-admin-action-card__tag shield">🛡️ نافذة الدرع — سرعة</div>
                <FameeriAdminDuel
                  attackerName={shieldTargetAttack.attackerName}
                  targetName={shieldTargetAttack.targetName}
                  tree={shieldTargetAttack.tree}
                  weaponName={shieldTargetAttack.weaponName}
                  size="lg"
                />
                <div className="fameeri-admin-shield-window__count">
                  {shieldCountdown !== null ? (shieldCountdown > 0 ? shieldCountdown : '⏰') : '...'}
                </div>
                <div className="fameeri-admin-shield-window__hint">
                  {shieldTargetGroup?.name} — {shieldCountdown ?? SHIELD_WINDOW_SEC}ث لتفعيل الدرع (مرة واحدة)
                </div>
                {shieldTargetGroup?.shield === shieldTargetAttack.tree && (
                  <div className="fameeri-admin-attack-intel__shield">🛡️ الدرع مُفعّل على 🌳{shieldTargetAttack.tree}!</div>
                )}
              </div>
            )}

            {/* طلبات السرعة */}
            {!qCurrentAttack && !qReveal && isSpeed && !qGameState?.speedBatchActive && claimIds.length > 0 && (
              <>
                <div className="fameeri-admin-action-card__tag speed">📨 طلبات السرعة ({claimIds.length})</div>
                {Object.entries(qGameState.speedClaims || {}).map(([gid, c]) => (
                  <div key={gid} className="fameeri-admin-claim-row">
                    <FameeriAdminDuel
                      attackerName={c.attackerName}
                      targetName={c.targetName}
                      tree={c.tree}
                      weaponName={c.weaponName}
                      size="sm"
                    />
                  </div>
                ))}
                {needPickWinner && (
                  <div className="ig" style={{ marginTop: 10 }}>
                    <label className="lbl">المجموعة الفائزة (عند «صح»)</label>
                    <select className="inp" value={speedWinSelect} onChange={(e) => setSpeedWinSelect(e.target.value)}>
                      <option value="">— اختر —</option>
                      {claimIds.map((gid) => (
                        <option key={gid} value={gid}>
                          {qGList.find((x) => x.id === gid)?.name || gid}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="ig" style={{ marginTop: 10 }}>
                  <label className="lbl">مدة المؤقت (5–35 ث)</label>
                  <div className="fameeri-admin-pills">
                    {SPEED_PRESETS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`btn ${speedRoundSecs === s ? 'bg' : 'bgh'} bsm`}
                        onClick={() => setSpeedRoundSecs(s)}
                      >
                        {s}ث
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={5}
                    max={35}
                    className="inp"
                    style={{ width: 80, textAlign: 'center', marginTop: 6 }}
                    value={speedRoundSecs}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (Number.isNaN(v)) return;
                      setSpeedRoundSecs(Math.min(35, Math.max(5, v)));
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="btn bg mt2 fameeri-admin-primary-btn"
                  disabled={!canStartSpeedTimer}
                  onClick={async () => {
                    await update(dbRef(db, `qrooms/${qRoom}/game`), {
                      speedBatchActive: true,
                      timer: { deadline: Date.now() + speedRoundSecs * 1000 },
                    });
                    playSound('suspense');
                  }}
                >
                  ⏱️ بدء المؤقت ({speedRoundSecs}ث)
                </button>
              </>
            )}

            {/* انتظار — اختيار الدور */}
            {!qCurrentAttack && !qReveal && !(isSpeed && (claimIds.length || qGameState?.speedBatchActive)) && (
              <>
                <div className="fameeri-admin-action-card__tag idle">🎯 الخطوة التالية</div>

                {/* وضع اللعب */}
                <div className="fameeri-admin-mode-switch">
                  <button
                    type="button"
                    className={`fameeri-admin-mode-btn${!isSpeed ? ' on' : ''}`}
                    onClick={() => void setPlayMode('sequential')}
                  >
                    📋 تسلسلي
                  </button>
                  <button
                    type="button"
                    className={`fameeri-admin-mode-btn${isSpeed ? ' on' : ''}`}
                    onClick={() => void setPlayMode('speed')}
                  >
                    ⚡ سرعة
                  </button>
                </div>
                <div className="fameeri-admin-mode-hint">
                  {isSpeed
                    ? 'الجميع يُرسل هجومه — ثم تبدأ المؤقت وتحسم'
                    : 'بعد كل هجوم ينتقل الدور تلقائياً للمجموعة التالية'}
                </div>

                {!assistMode && !isSpeed && (
                  <div className="fameeri-admin-wait-hint">
                    ⏳ انتظر قائد <strong>{turnGroup?.name || '—'}</strong> يرسل الهجوم
                  </div>
                )}

                {assistMode && !isSpeed && turnGroupId && (
                  <FameeriAdminAttack
                    mode="sequential"
                    attacker={turnGroup}
                    groups={qGList}
                    qRoom={qRoom}
                    sandstorm={qGameState?.sandstorm}
                    notify={notify}
                    accent={accent}
                  />
                )}

                {assistMode && isSpeed && (
                  <FameeriAdminAttack
                    mode="speed"
                    groups={qGList}
                    qRoom={qRoom}
                    sandstorm={qGameState?.sandstorm}
                    notify={notify}
                    accent={accent}
                  />
                )}

                {!assistMode && isSpeed && (
                  <div className="fameeri-admin-wait-hint">⏳ انتظر المجموعات تُرسل طلباتها</div>
                )}
              </>
            )}
          </div>

          {/* أدوات المشرف */}
          <div className="card fameeri-admin-tools">
            <div className="ctitle">🎲 أدوات المشرف</div>
            <div className="fameeri-admin-tools__grid">
              <div className="fameeri-admin-tool">
                <label className="lbl">☠️ الشجرة المسمومة</label>
                <select
                  className="inp"
                  value={qGameState?.cursedTree || ''}
                  onChange={async (e) => {
                    await update(dbRef(db, `qrooms/${qRoom}/game`), { cursedTree: e.target.value || null });
                  }}
                >
                  <option value="">بدون</option>
                  {Q_TREES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fameeri-admin-tool">
                <label className="lbl">🌪️ العاصفة</label>
                <button
                  type="button"
                  className={`btn ${qGameState?.sandstorm ? 'bb' : 'bgh'} bsm`}
                  style={{ width: '100%' }}
                  onClick={async () => {
                    await update(dbRef(db, `qrooms/${qRoom}/game`), { sandstorm: !qGameState?.sandstorm });
                  }}
                >
                  {qGameState?.sandstorm ? '🌪️ مُفعّلة — إيقاف' : '🌪️ تفعيل العاصفة'}
                </button>
              </div>
              <div className="fameeri-admin-tool">
                <label className="lbl">📱 بدون جوالات</label>
                <button
                  type="button"
                  className={`btn ${assistMode ? 'bb' : 'bgh'} bsm`}
                  style={{ width: '100%' }}
                  onClick={async () => {
                    await update(dbRef(db, `qrooms/${qRoom}/game`), { assistMode: !assistMode });
                  }}
                >
                  {assistMode ? 'مُفعّل ✓' : 'تفعيل'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'stats' && (
        <div className="fameeri-admin-stats">
          {sorted.map((g, i) => (
            <FameeriAdminGroupDetail
              key={g.id}
              group={g}
              turnGroupId={turnGroupId}
              cursedTree={qGameState?.cursedTree}
              rank={i + 1}
              attacks={qAttacks}
            />
          ))}
        </div>
      )}

      {tab === 'log' && <FameeriAdminBattleLog qGList={qGList} qAttacks={qAttacks} />}

      {/* إنهاء المسابقة */}
      <div className="fameeri-admin-footer">
        {!endConfirm ? (
          <>
            <button type="button" className="btn br fameeri-admin-end-btn" onClick={() => setEndConfirm(true)}>
              🏆 إنهاء وإعلان الفائز
            </button>
            <button type="button" className="btn bgh mt2" onClick={onOpenReport}>
              📄 تقرير (طباعة / PDF)
            </button>
          </>
        ) : (
          <div className="fameeri-admin-end-confirm card">
            <div className="fameeri-admin-end-confirm__title">🏆 إعلان الفائز</div>
            {leader && (
              <div className="fameeri-admin-end-confirm__winner">
                <div className="fameeri-admin-end-confirm__crown">👑</div>
                <div className="fameeri-group-name" style={{ fontSize: 18 }}>
                  {leader.name}
                </div>
                <div className="fameeri-admin-end-confirm__score">{leader.totalRemaining || 0} قميري متبقٍ</div>
              </div>
            )}
            <div className="fameeri-admin-end-confirm__actions">
              <button type="button" className="btn bg" onClick={() => void onEndGame()}>
                ✅ تأكيد الإنهاء
              </button>
              <button type="button" className="btn bgh" onClick={() => setEndConfirm(false)}>
                ↩️ متابعة اللعب
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
