import { useState, useEffect, useRef } from 'react';
import FameeriPlayerHud from './FameeriPlayerHud';
import FameeriGroupLog from './FameeriGroupLog';
import FameeriGroupRoster from './FameeriGroupRoster';
import FameeriPlayerArsenal from './FameeriPlayerArsenal';
import FameeriPlayerShieldPanel from './FameeriPlayerShieldPanel';
import FameeriPlayerAttackPanel from './FameeriPlayerAttackPanel';
import FameeriGroupForest from './FameeriGroupForest.jsx';
import FameeriPlayerTabs from './FameeriPlayerTabs';
import PlayerQuestionView from '../../question-bank/PlayerQuestionView';
import FameeriVerdictBanner from './FameeriVerdictBanner';
import FameeriAttackDisplay from './FameeriAttackDisplay';
import { Q_TREES, Q_WEAPONS } from '../../core/constants';

function WaitCard({ icon, title, sub }) {
  return (
    <div className="card fameeri-wait-card">
      <div className="fameeri-wait-card__icon">{icon}</div>
      <div className="fameeri-wait-card__title">{title}</div>
      {sub && <div className="fameeri-wait-card__sub">{sub}</div>}
    </div>
  );
}

function AttackSentCard({ title, targetName, tree, weaponName, weaponId, hint }) {
  const wDef = weaponId ? Q_WEAPONS.find((w) => w.id === weaponId) : null;
  const weaponLabel = weaponName || wDef?.name || '—';
  const weaponIcon = wDef?.icon || '⚔️';

  return (
    <div className="card fameeri-attack-sent">
      <div className="fameeri-attack-sent__title">{title}</div>
      <div className="fameeri-attack-sent__summary">
        <div className="fameeri-attack-sent__chip fameeri-attack-sent__chip--target">
          <span className="fameeri-attack-sent__chip-label">الهدف</span>
          <span className="fameeri-attack-sent__chip-value">{targetName || '—'}</span>
        </div>
        <div className="fameeri-attack-sent__chip fameeri-attack-sent__chip--tree">
          <span className="fameeri-attack-sent__chip-label">الشجرة</span>
          <span className="fameeri-attack-sent__chip-value">🌳 {tree || '—'}</span>
        </div>
        <div className="fameeri-attack-sent__chip fameeri-attack-sent__chip--weapon">
          <span className="fameeri-attack-sent__chip-label">السلاح</span>
          <span className="fameeri-attack-sent__chip-value">
            {weaponIcon} {weaponLabel}
          </span>
        </div>
      </div>
      {hint && <div className="fameeri-attack-sent__hint">{hint}</div>}
    </div>
  );
}

/** شاشة اللعب — تبويبات: مجموعتي | الفريق | الهجوم */
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
  qGroupMembers,
  qMyId,
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
      {/* ── رأس ثابت: HUD + تنبيهات ── */}
      <div className="fameeri-player-sticky">
        <FameeriPlayerHud
          groupName={qMyGroup?.name}
          birds={qMyGroup?.totalRemaining}
          isLeader={isLeader}
          leaderName={qGroupMembers?.find((m) => m.role === 'leader')?.name}
          playMode={qGameState?.phase === 'playing' ? qGameState?.playMode : null}
          round={qGameState?.round}
        />

        {showAnn && (
          <div className="ann ag fameeri-player-ann">
            <div style={{ fontSize: 13, fontWeight: 700 }}>{ann.msg}</div>
          </div>
        )}

        {answerVerdict && !qReveal && !qGameState?.showResult && (
          <FameeriVerdictBanner verdict={answerVerdict} />
        )}

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
          teamBadge={qGroupMembers?.length > 1 ? String(qGroupMembers.length) : null}
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
            <FameeriGroupLog
              attacks={qAttacks}
              groupId={qGroupId}
              groupName={qMyGroup?.name}
            />
          </div>
        )}

        {tab === 'team' && (
          <div className="fameeri-player-tab-pane">
            <FameeriGroupRoster
              members={qGroupMembers}
              groupName={qMyGroup?.name}
              meUid={authUid}
              meMemberId={qMyId}
              qRoom={qRoom}
              groupId={qGroupId}
              meName={qMyName}
              accent={accent}
            />
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
                        ? '⚡ أجب بسرعة'
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
              <AttackSentCard
                title="✅ هجومك مُرسَل"
                targetName={qMySpeedClaim.targetName}
                tree={qMySpeedClaim.tree}
                weaponName={qMySpeedClaim.weaponName}
                weaponId={qMySpeedClaim.weapon}
                hint="انتظر المشرف يبدأ المؤقت ويحسم الجولة"
              />
            )}

            {isLeader &&
              qCurrentAttack?.attackerId === qGroupId &&
              !qTimer &&
              !qReveal &&
              !shieldWindow && (
                <AttackSentCard
                  title="✅ الهجوم قيد الحسم"
                  targetName={qCurrentAttack.targetName}
                  tree={qCurrentAttack.tree}
                  weaponName={qCurrentAttack.weaponName}
                  weaponId={qCurrentAttack.weapon}
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
