import { useState } from 'react';
import Av from '../../shared/Av';
import WhatsAppLogoIcon from '../../components/icons/WhatsAppLogoIcon';
import { HesbahPanelTitle, HESBAH_HOST_PARTICIPATE_HELP } from './HesbahHelpTip';
import { HESBAH_ACCENT_CSS, HESBAH_BORDER_CSS, isActiveHesbahPlayer } from './HesbahHelpers';
import HesbahRoomMeta from './HesbahRoomMeta';
import HesbahTimerPicker from './HesbahTimerPicker';
import HesbahTopNav from './HesbahTopNav';
import GameGuideOpenButton from '../../shared/GameGuideOpenButton';
import HostSessionReminder from '../../shared/HostSessionReminder';

const START_MODE_COPY = {
  participate: {
    icon: '✅',
    label: 'أشارك بإجابات',
    hint: 'ترى الأسماء والمؤشرات — وبعد إرسالك تظهر إجابات الجميع (عرضية بلا نقاط).',
  },
  admin: {
    icon: '🎛️',
    label: 'إدارة فقط',
    hint: 'ترى الأسماء والإجابات فوراً — بدون إرسال إجابة.',
  },
};

export default function HesbahLobby({
  roomCode,
  role,
  players,
  me,
  myId,
  totalQ,
  hostParticipates,
  onHostParticipatesChange,
  questionSecs,
  onQuestionSecsChange,
  onStart,
  onShare,
  onExitRequest,
  onOpenGuide,
  notify,
  onSaveHostPin,
  isLoggedIn,
  isRegisteredEmail,
  onRegister,
  gamePhase,
  hasHostPin,
}) {
  const [startConfirmOpen, setStartConfirmOpen] = useState(false);
  const list = Object.entries(players || {})
    .filter(([, p]) => isActiveHesbahPlayer(p))
    .map(([id, p]) => ({ ...p, id }));
  const isAdmin = role === 'admin';
  const defaultSecs = questionSecs ?? 20;
  const startMode = hostParticipates ? 'participate' : 'admin';
  const startCopy = START_MODE_COPY[startMode];

  const confirmStart = () => {
    setStartConfirmOpen(false);
    onStart();
  };

  return (
    <div className="scr hesbah-theme">
      <div className="hesbah-sticky-chrome">
        {typeof onExitRequest === 'function' && (
          <HesbahTopNav onBack={onExitRequest} />
        )}
      </div>
      <div className="card" style={{ textAlign: 'center', padding: '18px 12px' }}>
        <HesbahRoomMeta roomCode={roomCode} className="hesbah-room-meta--lobby" />
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
          {totalQ} جولة · لوحة 1–{totalQ}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
          <button type="button" className="btn bgh bsm" style={{ width: 'auto' }} onClick={() => onShare(false)}>
            📤 مشاركة
          </button>
          <button type="button" className="btn bgh bsm" style={{ width: 'auto' }} onClick={() => onShare(true)}>
            <WhatsAppLogoIcon size={16} /> واتساب
          </button>
        </div>
      </div>

      {isAdmin && (
        <HostSessionReminder
          gameId="hesbah"
          roomCode={roomCode}
          phase={gamePhase || 'lobby'}
          isLoggedIn={!!isLoggedIn}
          isRegisteredEmail={!!isRegisteredEmail}
          hasHostPin={!!hasHostPin}
          onSavePin={onSaveHostPin}
          onRegister={onRegister}
          notify={notify}
        />
      )}

      {isAdmin && (
        <div className="card">
          <div className="ctitle">⏱️ المدة الافتراضية للأسئلة</div>
          <HesbahTimerPicker
            activeSecs={defaultSecs}
            onSelect={onQuestionSecsChange}
            hint="تُطبَّق على كل سؤال ما لم تغيّر المدة لسؤال معيّن من لوحة المشرف قبل بدء المؤقت."
          />
        </div>
      )}

      {isAdmin && (
        <div className="card">
          <HesbahPanelTitle help={HESBAH_HOST_PARTICIPATE_HELP} helpLabel="المشاركة">
            👑 مشاركة بإجابات؟
          </HesbahPanelTitle>
          <div className="hesbah-lobby-toggle">
            <button
              type="button"
              className={`hesbah-lobby-toggle__btn ${hostParticipates ? 'is-on' : ''}`}
              onClick={() => onHostParticipatesChange(true)}
            >
              ✅ أشارك
            </button>
            <button
              type="button"
              className={`hesbah-lobby-toggle__btn ${!hostParticipates ? 'is-on' : ''}`}
              onClick={() => onHostParticipatesChange(false)}
            >
              🎛️ إدارة
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="ctitle">👥 اللاعبون ({list.length})</div>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 16, color: 'var(--muted)', fontSize: 13 }}>بانتظار انضمام اللاعبين…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {list.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  background: 'var(--surface)',
                  borderRadius: 10,
                }}
              >
                <Av p={p} sz={40} />
                <div style={{ flex: 1, fontWeight: 800 }}>{p.name}</div>
                {p.isOnFire && <span title="مشتعل">🔥</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {!isAdmin && me && (
        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            border: `1px solid ${HESBAH_BORDER_CSS}`,
          }}
        >
          <Av p={me} sz={44} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 15 }}>{me.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              غرفة <span style={{ fontFamily: 'monospace', letterSpacing: 2, color: HESBAH_ACCENT_CSS }}>{roomCode}</span>
              {' · '}بانتظار البدء
            </div>
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="card" style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 40 }}>⏳</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>انتظر المشرف يبدأ اللعبة</div>
        </div>
      )}

      {isAdmin && (
        <button type="button" className="btn bg" disabled={list.length < 2} onClick={() => setStartConfirmOpen(true)}>
          ▶️ بدء اللعبة
        </button>
      )}
      {isAdmin && list.length < 2 && (
        <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>
          يفضّل انضمام لاعبين اثنين على الأقل
        </div>
      )}

      <GameGuideOpenButton onClick={onOpenGuide} className={isAdmin ? 'mt2 hesbah-guide-open-btn' : 'mt2'} />

      {startConfirmOpen && (
        <div className="hesbah-modal-overlay" role="presentation" onClick={() => setStartConfirmOpen(false)}>
          <div
            className="hesbah-modal hesbah-modal--start"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hesbah-start-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hesbah-modal__icon">🚀</div>
            <h2 id="hesbah-start-title" className="hesbah-modal__title">
              بدء المسابقة؟
            </h2>
            <p className="hesbah-modal__msg">تأكّد من وضعك قبل الانطلاق:</p>
            <div className="hesbah-lobby-toggle hesbah-modal__toggle">
              <button
                type="button"
                className={`hesbah-lobby-toggle__btn ${hostParticipates ? 'is-on' : ''}`}
                onClick={() => onHostParticipatesChange(true)}
              >
                ✅ أشارك
              </button>
              <button
                type="button"
                className={`hesbah-lobby-toggle__btn ${!hostParticipates ? 'is-on' : ''}`}
                onClick={() => onHostParticipatesChange(false)}
              >
                🎛️ إدارة
              </button>
            </div>
            <div className="hesbah-start-mode-pill">
              {startCopy.icon} {startCopy.label}
            </div>
            <p className="hesbah-start-mode-hint">{startCopy.hint}</p>
            <div className="hesbah-modal__actions">
              <button type="button" className="btn bgh" onClick={() => setStartConfirmOpen(false)}>
                ليس بعد
              </button>
              <button type="button" className="btn bg" onClick={confirmStart}>
                ▶ ابدأ الآن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
