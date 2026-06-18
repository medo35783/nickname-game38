import { ref as dbRef, set, update, push } from 'firebase/database';
import { db } from '../../firebase';
import { Q_WEAPONS, Q_TOTAL } from '../../core/constants';
import WhatsAppLogoIcon from '../../components/icons/WhatsAppLogoIcon';
import QuestionSourceSetup from '../../question-bank/QuestionSourceSetup';
import { QSOURCE, QSOURCE_LABELS } from '../../question-bank/questionSession';
import { poolStats, QUMAIRI_SET_QUOTAS } from './fameeriQuestionPool';
import { isFameeriQuestionSetupReady } from './fameeriQuestionSetup';
import FameeriAdminDistribute from './FameeriAdminDistribute';
import FameeriAdminStepper from './FameeriAdminStepper';
import FameeriAdminGroupHead from './FameeriAdminGroupHead';
import {
  renameFameeriGroup,
  deleteFameeriGroup,
  removeFameeriMemberFromGroup,
  moveFameeriMemberToGroup,
  demoteFameeriLeader,
} from './fameeriAdminLobbyManage';
import GameGuideOpenButton from '../../shared/GameGuideOpenButton';

export default function FameeriAdminLobby({
  qRoom,
  qPhase,
  qGameState,
  qGList,
  qMList,
  qGroupName,
  setQGroupName,
  notify,
  accent,
  shareRoomInvite,
  qSetupOpen,
  setQSetupOpen,
  qEffectiveSource,
  qPool,
  qBankMeta,
  applyQuestionSetup,
  assignGroupLeader,
  QB_GAME_TYPE,
  authUid,
  onGoAccount,
  onOpenGuide,
}) {
  const unassigned = qMList.filter((m) => !m.groupId);
  const assistMode = !!qGameState?.assistMode;
  const canManageSetup = qPhase === 'lobby' || qPhase === 'distributing';
  const questionSetup = isFameeriQuestionSetupReady(qEffectiveSource, qPool);

  const distReady =
    qGList.length >= 2 &&
    questionSetup.ok &&
    (assistMode ||
      qGList.every((g) => {
        const ms = qMList.filter((m) => m.groupId === g.id);
        return ms.length > 0 && ms.some((m) => m.role === 'leader');
      }));

  const allDist = qGList.length >= 2 && qGList.every((g) => g.distributed);
  const canStartGame = allDist && questionSetup.ok;

  const toggleAssist = async () => {
    await update(dbRef(db, `qrooms/${qRoom}/game`), { assistMode: !assistMode });
    notify(assistMode ? 'تم إلغاء وضع بدون جوالات' : '✅ وضع بدون جوالات — أنت تتحكم بالكامل', 'gold');
  };

  const createGroup = async () => {
    if (!qGroupName.trim()) return;
    if (qGList.length >= 6) return;
    const initW = {};
    Q_WEAPONS.forEach((w) => {
      initW[w.id] = w.qty;
    });
    const nRef = push(dbRef(db, `qrooms/${qRoom}/groups`));
    await set(nRef, {
      name: qGroupName.trim(),
      trees: {},
      weapons: initW,
      totalRemaining: Q_TOTAL,
      distributed: false,
      shieldUsed: false,
    });
    setQGroupName('');
    notify('✅ تم إنشاء المجموعة', 'success');
  };

  const startDistribution = async () => {
    await update(dbRef(db, `qrooms/${qRoom}/game`), { phase: 'distributing' });
    notify('🌳 بدء التوزيع', 'gold');
  };

  const startGame = async () => {
    await update(dbRef(db, `qrooms/${qRoom}/game`), {
      phase: 'playing',
      round: 1,
      roundMax: qGList.length,
      currentAttack: null,
      timer: null,
      turnGroup: qGList[0]?.id,
      speedClaims: {},
      speedBatchActive: false,
      playMode: qGameState?.playMode === 'speed' ? 'speed' : 'sequential',
    });
    notify('⚔️ اللعبة بدأت!', 'gold');
  };

  const handleRenameGroup = async (groupId, name) => {
    try {
      const ok = await renameFameeriGroup(qRoom, groupId, name);
      if (!ok) {
        notify('أدخل اسماً صالحاً', 'error');
        return false;
      }
      notify('✅ تم تغيير اسم المجموعة', 'success');
      return true;
    } catch {
      notify('تعذر تغيير الاسم', 'error');
      return false;
    }
  };

  const handleDeleteGroup = async (group) => {
    const members = qMList.filter((m) => m.groupId === group.id);
    const msg =
      members.length > 0
        ? `حذف "${group.name}"؟ سيُزال ${members.length} عضو من المجموعة ويعودون لقائمة غير الموزّعين.`
        : `حذف "${group.name}"؟`;
    if (!window.confirm(msg)) return;
    try {
      await deleteFameeriGroup(qRoom, group.id, qMList);
      notify('🗑️ تم حذف المجموعة', 'success');
    } catch {
      notify('تعذر حذف المجموعة', 'error');
    }
  };

  const handleRemoveMember = async (group, member) => {
    if (!window.confirm(`إزالة "${member.name}" من ${group.name}؟`)) return;
    try {
      await removeFameeriMemberFromGroup(qRoom, group.id, member, group);
      notify('↩️ تم إزالة اللاعب من المجموعة', 'success');
    } catch {
      notify('تعذر إزالة اللاعب', 'error');
    }
  };

  const handleMoveMember = async (fromGroup, toGroupId, member) => {
    const target = qGList.find((g) => g.id === toGroupId);
    if (!target) return;
    try {
      await moveFameeriMemberToGroup(qRoom, fromGroup.id, toGroupId, member, fromGroup);
      notify(`✅ نُقل "${member.name}" إلى ${target.name}`, 'success');
    } catch {
      notify('تعذر نقل اللاعب', 'error');
    }
  };

  const handleDemoteLeader = async (group, leader) => {
    if (!window.confirm(`إلغاء قيادة "${leader.name}" في ${group.name}؟`)) return;
    try {
      await demoteFameeriLeader(qRoom, group.id, leader, group);
      notify('↩️ تم إلغاء تعيين القائد', 'success');
    } catch {
      notify('تعذر إلغاء القيادة', 'error');
    }
  };

  const renderMemberActions = (group, member, otherGroups) => (
    <div className="fameeri-admin-member-row__actions">
      {member.role === 'leader' ? (
        <button type="button" className="btn bgh bxs" onClick={() => void handleDemoteLeader(group, member)}>
          ↩️ إلغاء القيادة
        </button>
      ) : (
        <button type="button" className="btn bg bxs" onClick={() => void assignGroupLeader(group.id, member)}>
          👑 قائد
        </button>
      )}
      {otherGroups.length > 0 && (
        <>
          {otherGroups.map((g) => (
            <button key={g.id} type="button" className="btn bo bxs" onClick={() => void handleMoveMember(group, g.id, member)}>
              → {g.name}
            </button>
          ))}
        </>
      )}
      <button type="button" className="btn br bxs" onClick={() => void handleRemoveMember(group, member)}>
        ✕ إزالة
      </button>
    </div>
  );

  return (
    <>
      <FameeriAdminStepper phase={qPhase} roomCode={qRoom} assistMode={assistMode} />

      {/* رمز الغرفة */}
      <div className="fameeri-admin-room-card card">
        <div className="fameeri-admin-room-card__label">رمز الغرفة — شاركه مع المجموعات</div>
        <div className="room-code-big fameeri-admin-room-card__code">{qRoom}</div>
        <button
          type="button"
          className="btn bo bxs fameeri-admin-room-card__share"
          onClick={() => void shareRoomInvite({ gameName: 'لعبة القميري', roomCode: qRoom, preferWhatsApp: true })}
        >
          مشاركة عبر <WhatsAppLogoIcon />
        </button>
      </div>

      {/* وضع بدون جوالات — بارز */}
      <div className={`fameeri-admin-assist card${assistMode ? ' on' : ''}`}>
        <div className="fameeri-admin-assist__row">
          <div className="fameeri-admin-assist__info">
            <div className="fameeri-admin-assist__title">📱 وضع بدون جوالات</div>
            <div className="fameeri-admin-assist__desc">
              {assistMode
                ? 'مُفعّل — أنت توزّع وتهاجم نيابةً عن المجموعات. لا حاجة لقادة على الجوالات.'
                : 'للّعب بجهاز واحد أو في الفصل — المشرف يتحكم بالكامل نيابةً عن المجموعات.'}
            </div>
          </div>
          <button type="button" className={`fameeri-admin-toggle${assistMode ? ' on' : ''}`} onClick={() => void toggleAssist()} aria-pressed={assistMode}>
            <span className="fameeri-admin-toggle__knob" />
          </button>
        </div>
        {assistMode && (
          <div className="fameeri-admin-assist__hint">
            💡 أنشئ المجموعات فقط → وزّع نيابةً → ابدأ اللعب مباشرة
          </div>
        )}
      </div>

      {/* مصدر الأسئلة */}
      {qSetupOpen ? (
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
      ) : (
        <div className={`card fameeri-admin-section${!questionSetup.ok ? ' fameeri-admin-section--warn' : ''}`}>
          <div className="fameeri-admin-section__head">
            <div>
              <div className="ctitle" style={{ margin: 0 }}>🧠 مصدر الأسئلة {!questionSetup.ok && '· مطلوب'}</div>
              <div className="fameeri-admin-section__sub">
                {qEffectiveSource
                  ? (() => {
                      if (qEffectiveSource === QSOURCE.EXTERNAL) return QSOURCE_LABELS[qEffectiveSource];
                      const s = poolStats(qPool);
                      let txt = `${QSOURCE_LABELS[qEffectiveSource]} — ${s.hard.total} صعب · ${s.medium.total} متوسط · ${s.easy.total} سهل`;
                      if (qBankMeta?.setCount != null) {
                        txt += ` · ${qBankMeta.setCount} مجموعة جديدة في البنك`;
                      }
                      if (qBankMeta?.setsTaken > 1) {
                        txt += ` (${qBankMeta.setsTaken} مجموعات)`;
                      } else if (s.total === QUMAIRI_SET_QUOTAS.hard + QUMAIRI_SET_QUOTAS.medium + QUMAIRI_SET_QUOTAS.easy) {
                        txt += ' (مجموعة مسابقة واحدة)';
                      }
                      return txt;
                    })()
                  : '⚠️ اختر أحد الخيارات الثلاثة قبل بدء التوزيع'}
              </div>
              {!questionSetup.ok && (
                <div className="fameeri-admin-setup-alert">{questionSetup.message}</div>
              )}
              {questionSetup.ok && questionSetup.advisory && (
                <div className="fameeri-admin-setup-advisory">💡 {questionSetup.advisory}</div>
              )}
            </div>
            <button type="button" className="btn bg bsm" style={{ width: 'auto' }} onClick={() => setQSetupOpen(true)}>
              {qEffectiveSource ? 'تغيير' : 'إعداد الآن'}
            </button>
          </div>
        </div>
      )}

      {/* إنشاء مجموعة */}
      <div className="card fameeri-admin-section">
        <div className="ctitle">➕ إنشاء مجموعة</div>
        <div className="fameeri-admin-inline-form">
          <input
            className="inp"
            placeholder="اسم المجموعة (مثال: الفريق الأحمر)"
            value={qGroupName}
            onChange={(e) => setQGroupName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void createGroup()}
          />
          <button type="button" className="btn bg bsm" disabled={!qGroupName.trim() || qGList.length >= 6} onClick={() => void createGroup()}>
            ➕
          </button>
        </div>
        <div className="fameeri-admin-section__sub">الحد الأقصى 6 مجموعات · تحتاج مجموعتين على الأقل</div>
      </div>

      {/* قائمة المجموعات */}
      <div className="card fameeri-admin-section">
        <div className="fameeri-admin-section__head">
          <div className="ctitle" style={{ margin: 0 }}>👥 المجموعات ({qGList.length})</div>
          {qPhase === 'distributing' && (
            <span className="fameeri-admin-badge">{allDist ? '✅ جاهز للبدء' : '⏳ توزيع جاري'}</span>
          )}
        </div>

        {qGList.length === 0 ? (
          <div className="fameeri-admin-empty">أنشئ مجموعتين على الأقل للبدء</div>
        ) : (
          qGList.map((g) => {
            const members = qMList.filter((m) => m.groupId === g.id);
            const leader = members.find((m) => m.role === 'leader');
            const otherGroups = qGList.filter((og) => og.id !== g.id);

            return (
              <div key={g.id} className="fameeri-admin-group-card">
                <FameeriAdminGroupHead
                  group={g}
                  members={members}
                  leader={leader}
                  assistMode={assistMode}
                  canManage={canManageSetup}
                  canDelete={canManageSetup}
                  onRename={(name) => handleRenameGroup(g.id, name)}
                  onDelete={() => handleDeleteGroup(g)}
                />

                {qPhase === 'distributing' && assistMode && (
                  <FameeriAdminDistribute group={g} qRoom={qRoom} notify={notify} accent={accent} hideHeader />
                )}

                {!assistMode &&
                  members.map((m) => (
                    <div key={m.id} className="fameeri-admin-member-row">
                      <span>{m.role === 'leader' ? '👑' : '👤'}</span>
                      <span className="fameeri-admin-member-row__name">{m.name}</span>
                      {canManageSetup ? (
                        renderMemberActions(g, m, otherGroups)
                      ) : (
                        m.role !== 'leader' && (
                          <button type="button" className="btn bg bxs" onClick={() => void assignGroupLeader(g.id, m)}>
                            👑 قائد
                          </button>
                        )
                      )}
                    </div>
                  ))}

                {qPhase === 'distributing' && !assistMode && (
                  <div className={`fameeri-admin-dist-status${g.distributed ? ' ok' : ''}`}>
                    {g.distributed ? '✅ تم التوزيع' : '⏳ بانتظار توزيع القائد'}
                  </div>
                )}
              </div>
            );
          })
        )}

        {unassigned.length > 0 && !assistMode && (
          <div className="fameeri-admin-unassigned">
            <div className="fameeri-admin-unassigned__title">⏳ بدون مجموعة ({unassigned.length})</div>
            {canManageSetup && (
              <div className="fameeri-admin-section__sub" style={{ marginBottom: 8 }}>
                عيّن كل لاعب لمجموعة — يمكنك تغيير التوزيع أو التراجع قبل بدء المسابقة
              </div>
            )}
            {unassigned.map((m) => (
              <div key={m.id} className="fameeri-admin-member-row fameeri-admin-member-row--unassigned">
                <span>👤 {m.name}</span>
                <div className="fameeri-admin-member-row__actions">
                  {qGList.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      className="btn bg bxs"
                      onClick={async () => {
                        try {
                          await update(dbRef(db, `qrooms/${qRoom}/members/${m.id}`), { groupId: g.id });
                          notify(`✅ أُضيف "${m.name}" إلى ${g.name}`, 'success');
                        } catch {
                          notify('تعذر إضافة اللاعب', 'error');
                        }
                      }}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* زر الإجراء الرئيسي */}
      <div className="fameeri-admin-action-zone">
        {qPhase === 'lobby' && (
          <>
            <button type="button" className="btn bg fameeri-admin-primary-btn" disabled={!distReady} onClick={() => void startDistribution()}>
              🌳 بدء توزيع القميري
            </button>
            {!distReady && qGList.length >= 2 && !questionSetup.ok && (
              <div className="fameeri-admin-action-hint fameeri-admin-action-hint--warn">
                ⚠️ {questionSetup.message}
              </div>
            )}
            {!distReady && qGList.length >= 2 && questionSetup.ok && !assistMode && (
              <div className="fameeri-admin-action-hint">
                عيّن قائداً 👑 لكل مجموعة (أو فعّل وضع بدون جوالات)
              </div>
            )}
            {qGList.length < 2 && (
              <div className="fameeri-admin-action-hint">أنشئ مجموعتين على الأقل</div>
            )}
          </>
        )}

        {qPhase === 'distributing' && allDist && (
          <button type="button" className="btn bg fameeri-admin-primary-btn" disabled={!canStartGame} onClick={() => void startGame()}>
            ⚔️ بدء المسابقة
          </button>
        )}
        {qPhase === 'distributing' && allDist && !canStartGame && (
          <div className="fameeri-admin-action-hint fameeri-admin-action-hint--warn">⚠️ {questionSetup.message}</div>
        )}

        {qPhase === 'distributing' && !allDist && (
          <div className="fameeri-admin-action-hint">
            {assistMode ? 'وزّع 100 قميري لكل مجموعة ثم ابدأ' : 'انتظر اكتمال توزيع جميع المجموعات'}
          </div>
        )}
      </div>

      <GameGuideOpenButton onClick={onOpenGuide} />
    </>
  );
}
