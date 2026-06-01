import { useState, useEffect, useRef } from 'react';
import FameeriRevealOverlay from './FameeriRevealOverlay';
import FameeriGroupChat from './FameeriGroupChat';
import FameeriPlayerHud from './FameeriPlayerHud';
import FameeriPlayerArsenal from './FameeriPlayerArsenal';
import FameeriPlayerShieldPanel from './FameeriPlayerShieldPanel';
import FameeriPlayerAttackPanel from './FameeriPlayerAttackPanel';
import FameeriGroupForest from './FameeriGroupForest.jsx';
import FameeriPlayerTabs from './FameeriPlayerTabs';
import PlayerQuestionView from '../../question-bank/PlayerQuestionView';
import FameeriVerdictBanner from './FameeriVerdictBanner';
import FameeriAttackDisplay from './FameeriAttackDisplay';
import { Q_TREES } from '../../core/constants';

function WaitCard({ icon, title, sub }) {
  return (
    <div className="card fameeri-wait-card">
      <div className="fameeri-wait-card__icon">{icon}</div>
      <div className="fameeri-wait-card__title">{title}</div>
      {sub && <div className="fameeri-wait-card__sub">{sub}</div>}
    </div>
  );
}

function SentCard({ title, detail, hint }) {
  return (
    <div className="card fameeri-attack-sent">
      <div className="fameeri-attack-sent__title">{title}</div>
      <div className="fameeri-attack-sent__detail">{detail}</div>
      <div className="fameeri-attack-sent__hint">{hint}</div>
    </div>
  );
}

/** شاشة اللعب — تبويبان: مجموعتي | الهجوم والأدوات */
export default function FameeriPlayerPlay({
  qReveal,
  qTurnOverlay,
  qTimer,
  qCountdown,
  qCurrentAttack,
  qGameState,
  qAnswerPhaseDuringTimer,
  qMyGroup,
  qGroupId,
  isLeader,
  qActiveQuestion,
  qCanAnswer,
  qMyPick,
  qGroupFinal,
  qGroupTally,
  suggestAnswer,
  confirmAnswer,
  accent,
  qRoom,
  qMyName,
  authUid,
  qAttacks,
  qOtherGroups,
  qAttackTarget,
  setQAttackTarget,
  submitFameeriAttack,
  qMySpeedClaim,
  shieldWindow,
  shieldCountdown,
  shieldUsed,
  shieldAttack,
  onActivateShield,
  shieldActivating,
  myAtks,
}) {
  const prevTreesRef = useRef(null);
  const [hitFlash, setHitFlash] = useState(null);
  const [tab, setTab] = useState('group');

  useEffect(() => {
    const trees = qMyGroup?.trees;
    if (!trees) return;
    const prev = prevTreesRef.current;
    prevTreesRef.current = { ...trees };
    if (!prev) return;

    for (const tree of Q_TREES) {
      const before = parseInt(prev[tree], 10) || 0;
      const after = parseInt(trees[tree], 10) || 0;
      if (after < before) {
        setHitFlash({ tree, lost: before - after, at: Date.now() });
        setTab('group');
        const t = setTimeout(() => setHitFlash(null), 8000);
        return () => clearTimeout(t);
      }
    }
  }, [qMyGroup?.trees]);

  const underAttackTree =
    qCurrentAttack?.targetId === qGroupId ? qCurrentAttack.tree : null;
  const shieldTreeActive = qMyGroup?.shield || null;
  const isTarget = shieldAttack?.targetId === qGroupId || qCurrentAttack?.targetId === qGroupId;
  const isAttacker = qCurrentAttack?.attackerId === qGroupId;
  const shieldActive = !!qMyGroup?.shield;
  const showShieldPanel =
    shieldWindow && isTarget && shieldAttack && !qReveal;

  const canAttack =
    isLeader &&
    !qCurrentAttack &&
    !qMySpeedClaim &&
    !qGameState?.showResult &&
    !qReveal &&
    !shieldWindow &&
    (qGameState?.playMode === 'speed'
      ? !qGameState?.speedBatchActive
      : qGameState?.turnGroup === qGroupId);

  const waitingSpeedResolve =
    isLeader &&
    !qCurrentAttack &&
    !qReveal &&
    qGameState?.playMode === 'speed' &&
    qGameState?.speedBatchActive &&
    !shieldWindow;

  const waitingTurn =
    isLeader &&
    !qCurrentAttack &&
    !qReveal &&
    qGameState?.playMode !== 'speed' &&
    qGameState?.turnGroup !== qGroupId &&
    !shieldWindow;

  const ann = qGameState?.announcement;
  const showAnn = ann && Date.now() - ann.timestamp < 10000;
  const answerVerdict = qGameState?.answerVerdict;

  const showQuestionDock =
    !!qActiveQuestion &&
    !qActiveQuestion.adminOnly &&
    !qReveal &&
    !qGameState?.showResult &&
    (qAnswerPhaseDuringTimer || qActiveQuestion.revealToPlayers);

  const battleBadge = (() => {
    if (showQuestionDock && qCanAnswer) return '❓';
    if (showShieldPanel && isLeader) return '🛡️';
    if (canAttack) return '⚔️';
    if (isLeader && (qMySpeedClaim || qCurrentAttack?.attackerId === qGroupId)) return '⏳';
    return null;
  })();

  const groupBadge = hitFlash ? `-${hitFlash.lost}` : isTarget && !showShieldPanel ? '🎯' : null;

  useEffect(() => {
    if (showQuestionDock) setTab('battle');
  }, [showQuestionDock, qActiveQuestion?.id]);

  useEffect(() => {
    if (showShieldPanel && isLeader) setTab('battle');
  }, [showShieldPanel, isLeader]);

  useEffect(() => {
    if (canAttack && isLeader) setTab('battle');
  }, [canAttack, isLeader]);

  return (
    <div className="scr fameeri-player-play">
      {qReveal && <FameeriRevealOverlay qReveal={qReveal} showContinue={false} />}

      {/* ── رأس ثابت: HUD + تنبيهات ── */}
      <div className="fameeri-player-sticky">
        <FameeriPlayerHud
          groupName={qMyGroup?.name}
          birds={qMyGroup?.totalRemaining}
          isLeader={isLeader}
          playMode={qGameState?.phase === 'playing' ? qGameState?.playMode : null}
          round={qGameState?.round}
        />

        {showAnn && (
          <div className="ann ag fameeri-player-ann">
            <div style={{ fontSize: 13, fontWeight: 700 }}>{ann.msg}</div>
          </div>
        )}

        {answerVerdict && !qReveal && <FameeriVerdictBanner verdict={answerVerdict} />}

        {qTimer && !qReveal && qCountdown !== null && (qCurrentAttack || qGameState?.speedBatchActive) && (
          <div className="fameeri-player-timer-bar" aria-live="polite">
            <span className="fameeri-player-timer-bar__num">{qCountdown > 0 ? qCountdown : '⏰'}</span>
            <span className="fameeri-player-timer-bar__txt">
              {qGameState?.speedBatchActive && !qCurrentAttack
                ? '⚡ جولة السرعة — قرار المشرف'
                : qAnswerPhaseDuringTimer
                  ? isLeader
                    ? '⏱️ أرسل اعتمادك قبل انتهاء الوقت'
                    : '⏱️ اقترح إجابة للقائد 👑'
                  : `مهاجِم: ${qCurrentAttack?.attackerName} · هدف: ${qCurrentAttack?.targetName}`}
            </span>
          </div>
        )}

        {showShieldPanel && (
          <FameeriPlayerShieldPanel
            attack={shieldAttack}
            countdown={shieldCountdown}
            isLeader={isLeader}
            shieldUsed={shieldUsed}
            onActivate={onActivateShield}
            activating={shieldActivating}
          />
        )}

        {qCurrentAttack && !showShieldPanel && (
          <FameeriAttackDisplay
            attack={qCurrentAttack}
            badge="⚔️ هجوم جاري"
            isTarget={isTarget}
            isAttacker={isAttacker}
            treeCount={
              isTarget ? parseInt(qMyGroup?.trees?.[qCurrentAttack.tree], 10) || 0 : null
            }
          />
        )}

        {canAttack && isLeader && (
          <div className="fameeri-player-your-turn" role="status">
            <span className="fameeri-player-your-turn__icon">👑</span>
            <span>دورك للهجوم — افتح تبويب «الهجوم» وأكمل الخطوات</span>
          </div>
        )}

        <FameeriPlayerTabs
          active={tab}
          onChange={setTab}
          groupBadge={groupBadge}
          battleBadge={battleBadge}
        />
      </div>

      {/* ── محتوى التبويب ── */}
      <div className="fameeri-player-tab-body">
        {tab === 'group' && (
          <div className="fameeri-player-tab-pane">
            <FameeriGroupForest
              group={qMyGroup}
              groupId={qGroupId}
              attacks={qAttacks}
              hitFlash={hitFlash}
              shieldTree={shieldTreeActive}
              underAttackTree={underAttackTree}
              highlightTree={qReveal?.tree}
            />
            <div className="card fameeri-player-log">
              <div className="ctitle">📋 سجل مجموعتي</div>
              {myAtks.length === 0 ? (
                <div className="fameeri-log-empty">لا أحداث بعد — اصطد قميري الخصم!</div>
              ) : (
                myAtks.slice(0, 12).map((a, i) => (
                  <div
                    key={i}
                    className={`feed-item fameeri-log-item${a.result === 'shielded' ? ' shield' : ''}`}
                    style={{
                      borderColor:
                        a.attackerId === qGroupId
                          ? a.result === 'success'
                            ? 'var(--green)'
                            : 'var(--red)'
                          : 'var(--red)',
                    }}
                  >
                    {a.attackerId === qGroupId
                      ? `${a.result === 'success' ? '🎯' : '❌'} هاجمت ${a.targetName} / 🌳${a.tree} — ${
                          a.result === 'success' ? 'نجاح' : 'فشل'
                        }`
                      : `⚔️ هاجمتكم ${a.attackerName} على 🌳${a.tree}${
                          a.result === 'success'
                            ? ` — صُيد ${a.hunted ?? 0} قميري 🐦`
                            : a.result === 'shielded'
                              ? ' — 🛡️ صد الدرع!'
                              : ' — لم يصب'
                        }`}
                  </div>
                ))
              )}
            </div>
            {qGroupId && (
              <FameeriGroupChat
                qRoom={qRoom}
                groupId={qGroupId}
                me={{ uid: authUid, name: qMyName }}
                accent={accent}
              />
            )}
          </div>
        )}

        {tab === 'battle' && (
          <div className="fameeri-player-tab-pane">
            {showQuestionDock && (
              <div className="fameeri-question-dock card">
                <div className="fameeri-question-dock__head">
                  <span className="ctitle">❓ السؤال</span>
                  {qCanAnswer && (
                    <span className="fameeri-question-dock__pill">
                      {qGameState?.playMode === 'speed'
                        ? '⚡ الجميع يجيبون'
                        : isLeader
                          ? '👑 اعتمد الإجابة'
                          : '🎯 اقترح'}
                    </span>
                  )}
                </div>
                <PlayerQuestionView
                  current={qActiveQuestion}
                  accent={accent}
                  interactive={qCanAnswer}
                  isLeader={isLeader}
                  myPick={qMyPick}
                  finalOpt={qGroupFinal}
                  tally={qGroupTally}
                  onSuggest={suggestAnswer}
                  onConfirm={confirmAnswer}
                />
              </div>
            )}

            <FameeriPlayerArsenal
              weapons={qMyGroup?.weapons}
              shieldUsed={qMyGroup?.shieldUsed}
              shieldActive={shieldActive}
              shieldTree={qMyGroup?.shield}
            />

            {isLeader && qMySpeedClaim && !qCurrentAttack && !qGameState?.speedBatchActive && !qReveal && (
              <SentCard
                title="✅ هجومك مُرسَل"
                detail={`→ ${qMySpeedClaim.targetName} · 🌳 ${qMySpeedClaim.tree} · ${qMySpeedClaim.weaponName}`}
                hint="انتظر المشرف يبدأ المؤقت ويحسم الجولة"
              />
            )}

            {isLeader &&
              qCurrentAttack?.attackerId === qGroupId &&
              !qTimer &&
              !qReveal &&
              !shieldWindow && (
                <SentCard
                  title="✅ الهجوم قيد الحسم"
                  detail={`→ ${qCurrentAttack.targetName} · 🌳 ${qCurrentAttack.tree} · ${qCurrentAttack.weaponName}`}
                  hint="انتظر المشرف يفعّل المؤقت ثم يعلن النتيجة"
                />
              )}

            {canAttack && (
              <FameeriPlayerAttackPanel
                playMode={qGameState?.playMode}
                otherGroups={qOtherGroups}
                attackTarget={qAttackTarget}
                setAttackTarget={setQAttackTarget}
                myWeapons={qMyGroup?.weapons}
                sandstorm={qGameState?.sandstorm}
                onSubmit={submitFameeriAttack}
              />
            )}

            {waitingSpeedResolve && (
              <WaitCard icon="⏳" title="جاري حسم السرعة" sub="انتظر قرار المشرف" />
            )}

            {waitingTurn && (
              <WaitCard icon="🦅" title="ليس دورك" sub="راقب غابة مجموعتك وناقشوا مع القائد" />
            )}

            {!isLeader &&
              !canAttack &&
              !waitingTurn &&
              !waitingSpeedResolve &&
              !showQuestionDock &&
              qGameState?.phase === 'playing' && (
                <WaitCard
                  icon="👑"
                  title="دور القائد"
                  sub="اقترح هدفاً أو إجابة — القائد يقرر الهجوم والدرع"
                />
              )}
          </div>
        )}
      </div>
    </div>
  );
}
