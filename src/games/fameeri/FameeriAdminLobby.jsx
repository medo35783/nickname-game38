import { ref as dbRef, set, update, push } from 'firebase/database';
import { db } from '../../firebase';
import { Q_WEAPONS, Q_TOTAL } from '../../core/constants';
import WhatsAppLogoIcon from '../../components/icons/WhatsAppLogoIcon';
import QuestionSourceSetup from '../../question-bank/QuestionSourceSetup';
import { QSOURCE, QSOURCE_LABELS } from '../../question-bank/questionSession';
import FameeriAdminDistribute from './FameeriAdminDistribute';
import FameeriAdminStepper from './FameeriAdminStepper';

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
  applyQuestionSetup,
  assignGroupLeader,
  QB_GAME_TYPE,
}) {
  const unassigned = qMList.filter((m) => !m.groupId);
  const assistMode = !!qGameState?.assistMode;

  const distReady =
    qGList.length >= 2 &&
    (assistMode ||
      qGList.every((g) => {
        const ms = qMList.filter((m) => m.groupId === g.id);
        return ms.length > 0 && ms.some((m) => m.role === 'leader');
      }));

  const allDist = qGList.length >= 2 && qGList.every((g) => g.distributed);

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
          onClick={() => void shareRoomInvite({ gameName: 'صيد القميري', roomCode: qRoom, preferWhatsApp: true })}
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
        />
      ) : (
        <div className="card fameeri-admin-section">
          <div className="fameeri-admin-section__head">
            <div>
              <div className="ctitle" style={{ margin: 0 }}>🧠 مصدر الأسئلة</div>
              <div className="fameeri-admin-section__sub">
                {qEffectiveSource
                  ? `${QSOURCE_LABELS[qEffectiveSource]}${qEffectiveSource !== QSOURCE.EXTERNAL ? ` — ${qPool.length} سؤال` : ''}`
                  : 'الافتراضي: بدون أسئلة — مؤقت وحسم يدوي'}
              </div>
            </div>
            <button type="button" className="btn bg bsm" style={{ width: 'auto' }} onClick={() => setQSetupOpen(true)}>
              {qEffectiveSource ? 'تغيير' : 'إعداد'}
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

            if (qPhase === 'distributing' && assistMode) {
              return (
                <FameeriAdminDistribute key={g.id} group={g} qRoom={qRoom} notify={notify} accent={accent} />
              );
            }

            return (
              <div key={g.id} className="fameeri-admin-group-card">
                <div className="fameeri-admin-group-card__head">
                  <span className="fameeri-group-name">{g.name}</span>
                  <span className="fameeri-admin-group-card__meta">
                    {members.length} عضو{leader ? ` · 👑 ${leader.name}` : assistMode ? '' : ' · ⚠️ بدون قائد'}
                  </span>
                </div>
                {!assistMode &&
                  members.map((m) => (
                    <div key={m.id} className="fameeri-admin-member-row">
                      <span>{m.role === 'leader' ? '👑' : '👤'}</span>
                      <span className="fameeri-admin-member-row__name">{m.name}</span>
                      {m.role !== 'leader' && (
                        <button type="button" className="btn bg bxs" onClick={() => void assignGroupLeader(g.id, m)}>
                          👑 قائد
                        </button>
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
            {unassigned.map((m) => (
              <div key={m.id} className="fameeri-admin-member-row">
                <span>👤 {m.name}</span>
                <div className="fameeri-admin-member-row__actions">
                  {qGList.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      className="btn bg bxs"
                      onClick={async () => {
                        await update(dbRef(db, `qrooms/${qRoom}/members/${m.id}`), { groupId: g.id });
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
            {!distReady && qGList.length >= 2 && !assistMode && (
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
          <button type="button" className="btn bg fameeri-admin-primary-btn" onClick={() => void startGame()}>
            ⚔️ بدء المسابقة
          </button>
        )}

        {qPhase === 'distributing' && !allDist && (
          <div className="fameeri-admin-action-hint">
            {assistMode ? 'وزّع 100 قميري لكل مجموعة ثم ابدأ' : 'انتظر اكتمال توزيع جميع المجموعات'}
          </div>
        )}
      </div>
    </>
  );
}
