import { useState, useEffect } from 'react';
import { ref as dbRef, update } from 'firebase/database';
import { db } from '../../firebase';
import { Q_TREES } from '../../core/constants';
import { playSound } from '../../core/helpers';
import { applySpeedRoundWrong } from './fameeriSpeedRound';
import { startAttackTimer, resolveAttackFail, continueAfterReveal, beginShieldWindow, finalizeShieldWindowIfDue, SHIELD_WINDOW_SEC } from './fameeriAdminResolve';
import { poolStats } from './fameeriQuestionPool';
import FameeriAdminStepper from './FameeriAdminStepper';
import FameeriAdminAttack from './FameeriAdminAttack';
import FameeriAdminBattleLog from './FameeriAdminBattleLog';
import FameeriAdminRibbon from './FameeriAdminRibbon';
import FameeriAdminGroupDetail from './FameeriAdminGroupDetail';
import FameeriAdminDuel from './FameeriAdminDuel';
import FameeriRevealOverlay from './FameeriRevealOverlay';
import FameeriVerdictBanner from './FameeriVerdictBanner';
import FameeriAdminCommandCenter, { isCommandCenterActive } from './FameeriAdminCommandCenter';
import AdminQuestionView from '../../question-bank/AdminQuestionView';
import QuestionSourceSetup from '../../question-bank/QuestionSourceSetup';

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
  qAdminAnswerContext,
  qAdminPendingGroups,
  toggleQuestionReveal,
  hideQuestionFromPlayers,
  drawNextQuestion,
  qPool,
  qEffectiveSource,
  onOpenQuestionSetup,
  onCancelAttack,
  qSetupOpen,
  setQSetupOpen,
  applyQuestionSetup,
  QB_GAME_TYPE,
  authUid,
  onGoAccount,
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

  /** حسم فوري عند تفعيل الدرع — لا ننتظر انتهاء العدّ */
  useEffect(() => {
    if (!shieldWindow || !qRoom || !shieldTargetAttack || !shieldTargetGroup) return;
    if (shieldTargetGroup.shield !== shieldTargetAttack.tree) return;
    void finalizeShieldWindowIfDue({
      qRoom,
      qGameState,
      qGList,
      qGroups,
      recordRoundCompleted,
    }).then(() => playSound('explosion'));
  }, [shieldWindow?.deadline, shieldTargetGroup?.shield, shieldTargetAttack?.tree, qRoom]);

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

  const liveMode = isCommandCenterActive({
    qCurrentAttack,
    qActiveQuestion,
    shieldWindow,
    isSpeed,
    claimIds,
    qTimer,
    speedBatchActive: qGameState?.speedBatchActive,
  });

  const attackFocusKey = qCurrentAttack?.timestamp || qCurrentAttack?.attackerId || null;

  useEffect(() => {
    if (liveMode) {
      setTab((t) => (['qflow', 'field', 'stats'].includes(t) ? (attackFocusKey ? 'qflow' : t) : 'qflow'));
    } else {
      setTab((t) => (t === 'qflow' || t === 'field' ? 'control' : t));
    }
  }, [liveMode, attackFocusKey]);

  const tabs = liveMode
    ? [
        ['qflow', '❓ السؤال والحسم'],
        ['field', '🏟️ الميدان'],
        ['stats', '📊 الإحصائيات'],
      ]
    : [
        ['control', '⚔️ التحكم'],
        ['stats', '📊 الإحصائيات'],
        ...(qCurrentAttack || shieldWindow ? [] : [['log', '📜 السجل']]),
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

  const drawWeapon =
    qCurrentAttack?.weapon ||
    (speedWinSelect && qGameState?.speedClaims?.[speedWinSelect]?.weapon) ||
    (claimIds.length === 1 ? qGameState?.speedClaims?.[claimIds[0]]?.weapon : null);

  const poolTotal = poolStats(qPool).total;
  const questionStuck = liveMode && !!qCurrentAttack && !qActiveQuestion;

  const showRibbonInTab = liveMode ? tab === 'field' : tab === 'control';

  return (
    <div className={`fameeri-admin-play${liveMode ? ' fameeri-admin-play--live' : ''}`}>
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

      {qGameState?.answerVerdict && !qReveal && (
        <FameeriVerdictBanner verdict={qGameState.answerVerdict} />
      )}

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

      {qSetupOpen && (
        <QuestionSourceSetup
          gameType={QB_GAME_TYPE}
          accent={accent}
          notify={notify}
          onApply={applyQuestionSetup}
          onClose={() => setQSetupOpen(false)}
          authUid={authUid}
          onGoAccount={onGoAccount}
          initialSource={qEffectiveSource}
          initialPoolStructured={qPool}
          initialPlannedGroups={Math.max(2, qGList.length || 0)}
        />
      )}

      {liveMode && tab === 'qflow' && (
        <FameeriAdminCommandCenter
          qCurrentAttack={qCurrentAttack}
          qActiveQuestion={qActiveQuestion}
          qActiveAnswer={qActiveAnswer}
          qAdminGroupAnswers={qAdminGroupAnswers}
          qAdminAnswerContext={qAdminAnswerContext}
          qAdminPendingGroups={qAdminPendingGroups}
          qCountdown={qCountdown}
          shieldCountdown={shieldCountdown}
          shieldWindow={shieldWindow}
          shieldTargetAttack={shieldTargetAttack}
          shieldTargetGroup={shieldTargetGroup}
          qTimer={qTimer}
          isSpeed={isSpeed}
          speedClaims={qGameState?.speedClaims}
          claimIds={claimIds}
          speedBatchActive={!!qGameState?.speedBatchActive}
          qGList={qGList}
          speedWinSelect={speedWinSelect}
          setSpeedWinSelect={setSpeedWinSelect}
          canStartSpeedTimer={canStartSpeedTimer}
          qCustomTimer={qCustomTimer}
          setQCustomTimer={setQCustomTimer}
          onToggleRevealQuestion={() => void toggleQuestionReveal('revealToPlayers')}
          onToggleRevealOptions={() => void toggleQuestionReveal('revealOptions')}
          onHideAll={() => void hideQuestionFromPlayers?.()}
          onStartActingChallenge={() => {
            if (!qActiveQuestion?.revealToPlayers) void toggleQuestionReveal('revealToPlayers');
          }}
          onEndActingChallenge={() => {
            if (qActiveQuestion?.revealToPlayers) void toggleQuestionReveal('revealToPlayers');
          }}
          onDrawNext={
            drawWeapon ? () => void drawNextQuestion(drawWeapon) : undefined
          }
          poolHasQuestions={poolTotal > 0}
          questionSource={qEffectiveSource}
          onOpenQuestionSetup={onOpenQuestionSetup}
          onCancelAttack={onCancelAttack}
          onStartTimer={async (s) => {
            await startAttackTimer(qRoom, s);
            setQCustomTimer('');
            playSound('suspense');
          }}
          onStartSpeedTimer={async (s) => {
            if (!canStartSpeedTimer) return;
            await update(dbRef(db, `qrooms/${qRoom}/game`), {
              speedBatchActive: true,
              timer: { deadline: Date.now() + s * 1000 },
            });
            setSpeedRoundSecs(s);
            playSound('suspense');
          }}
          onVerdictOk={async () => {
            await beginShieldWindow(qRoom, {
              attack: qCurrentAttack,
              revealedAnswer: qActiveQuestion?.adminOnly ? qActiveAnswer || undefined : undefined,
            });
            playSound('suspense');
          }}
          onVerdictFail={async () => {
            await resolveAttackFail({ qRoom, qCurrentAttack, qGroups });
            playSound('countdown_last');
          }}
          onSpeedVerdictOk={async () => {
            const ids = claimIds;
            if (ids.length > 1 && !speedWinSelect) return;
            const win = ids.length === 1 ? ids[0] : speedWinSelect;
            await beginShieldWindow(qRoom, {
              winnerGroupId: win,
              attack: qGameState?.speedClaims?.[win],
            });
            playSound('suspense');
          }}
          onSpeedVerdictFail={async () => {
            await applySpeedRoundWrong({ qRoom, qGameState, qGroups });
            playSound('countdown_last');
          }}
          accent={accent}
        />
      )}

      {!liveMode && qActiveQuestion && tab === 'control' && (
          <AdminQuestionView
            current={qActiveQuestion}
            answer={qActiveAnswer}
            groupAnswers={qAdminGroupAnswers}
            answerContext={qAdminAnswerContext}
            pendingGroups={qAdminPendingGroups}
            onToggleRevealQuestion={() => void toggleQuestionReveal('revealToPlayers')}
            onToggleRevealOptions={() => void toggleQuestionReveal('revealOptions')}
            onHideAll={() => void hideQuestionFromPlayers?.()}
            onStartActingChallenge={() => {
              if (!qActiveQuestion?.revealToPlayers) void toggleQuestionReveal('revealToPlayers');
            }}
            onEndActingChallenge={() => {
              if (qActiveQuestion?.revealToPlayers) void toggleQuestionReveal('revealToPlayers');
            }}
            onDrawNext={
              poolStats(qPool).total
                ? () => {
                    const w =
                      qCurrentAttack?.weapon ||
                      (speedWinSelect && qGameState?.speedClaims?.[speedWinSelect]?.weapon) ||
                      (Object.keys(qGameState?.speedClaims || {}).length === 1
                        ? qGameState.speedClaims[Object.keys(qGameState.speedClaims)[0]]?.weapon
                        : null);
                    void drawNextQuestion(w);
                  }
                : undefined
            }
            accent={accent}
          />
      )}

      {showRibbonInTab && (
        <div className="card fameeri-admin-ribbon-wrap">
          <div className="fameeri-admin-ribbon-wrap__head">
            <span className="ctitle" style={{ margin: 0 }}>🏟️ الميدان</span>
            {!isSpeed && !qCurrentAttack && (
              <span className="fameeri-admin-ribbon-wrap__hint">اضغط مجموعة لتغيير الدور</span>
            )}
            {liveMode && qCurrentAttack && (
              <span className="fameeri-admin-ribbon-wrap__hint">متابعة الوضع — الهجوم جارٍ في تبويب السؤال</span>
            )}
          </div>
          <FameeriAdminRibbon
            groups={sorted}
            turnGroupId={turnGroupId}
            onSelectTurn={!isSpeed && !qCurrentAttack ? setTurn : undefined}
            selectable={!isSpeed && !qCurrentAttack}
          />
        </div>
      )}

      {tab === 'control' && !liveMode && (
        <>
          <div className="fameeri-admin-action-card card">
            <div className="fameeri-admin-action-card__tag idle">🎯 الخطوة التالية</div>

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

            {isSpeed && !qGameState?.speedBatchActive && claimIds.length > 0 && (
              <>
                <div className="fameeri-admin-action-card__tag speed" style={{ marginTop: 12 }}>
                  📨 طلبات السرعة ({claimIds.length})
                </div>
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
                    <label className="lbl">المجموعة الفائزة عند «صح»</label>
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
              </>
            )}
          </div>

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
          {qCurrentAttack && (
            <div className="fameeri-admin-stats-banner card">
              ⚔️ هجوم على <strong>{qCurrentAttack.targetName}</strong> — شجرة{' '}
              <strong>{qCurrentAttack.tree}</strong> مُعلّمة بالأحمر
            </div>
          )}
          {sorted.map((g, i) => (
            <FameeriAdminGroupDetail
              key={g.id}
              group={g}
              turnGroupId={turnGroupId}
              cursedTree={qGameState?.cursedTree}
              rank={i + 1}
              attacks={qAttacks}
              highlightTree={
                qCurrentAttack?.targetId === g.id ? qCurrentAttack.tree : undefined
              }
            />
          ))}
        </div>
      )}

      {tab === 'log' && <FameeriAdminBattleLog qGList={qGList} qAttacks={qAttacks} />}

      {/* إنهاء المسابقة — مخفي أثناء حسم السؤال لتقليل التشتيت */}
      <div className={`fameeri-admin-footer${liveMode && tab === 'qflow' && qActiveQuestion ? ' fameeri-admin-footer--hidden' : ''}`}>
        {questionStuck && (
          <div className="fameeri-admin-stuck-hint card">
            <div className="fameeri-admin-stuck-hint__title">⚠️ السؤال لم يظهر؟</div>
            <p className="fameeri-admin-stuck-hint__text">
              {poolTotal > 0
                ? 'اضغط «سحب سؤال» في الأعلى، أو احكم يدوياً، أو ألغِ الهجوم.'
                : 'لم يُحمّل مخزون الأسئلة — افتح «إعداد الأسئلة» أو احكم يدوياً بدون سؤال.'}
            </p>
          </div>
        )}

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
