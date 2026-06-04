import Av from '../../shared/Av';
import WhatsAppLogoIcon from '../../components/icons/WhatsAppLogoIcon';
import { SniperPanelTitle, SNIPER_HOST_PARTICIPATE_HELP } from './SniperHelpTip';
import { SNIPER_ACCENT_CSS, SNIPER_BORDER_CSS } from './sniperHelpers';
import SniperRoomMeta from './SniperRoomMeta';
import SniperTimerPicker from './SniperTimerPicker';

export default function SniperLobby({
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
}) {
  const list = Object.entries(players || {}).map(([id, p]) => ({ ...p, id }));
  const isAdmin = role === 'admin';
  const defaultSecs = questionSecs ?? 20;

  return (
    <div className="scr sniper-theme">
      <div className="card" style={{ textAlign: 'center', padding: '18px 12px' }}>
        <SniperRoomMeta roomCode={roomCode} className="sniper-room-meta--lobby" />
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
        <div className="card">
          <div className="ctitle">⏱️ المدة الافتراضية للأسئلة</div>
          <SniperTimerPicker
            activeSecs={defaultSecs}
            onSelect={onQuestionSecsChange}
            hint="تُطبَّق على كل سؤال ما لم تغيّر المدة لسؤال معيّن من لوحة المشرف قبل بدء المؤقت."
          />
        </div>
      )}

      {isAdmin && (
        <div className="card">
          <SniperPanelTitle help={SNIPER_HOST_PARTICIPATE_HELP} helpLabel="المشاركة">
            👑 مشاركة بإجابات؟
          </SniperPanelTitle>
          <div className="sniper-lobby-toggle">
            <button
              type="button"
              className={`sniper-lobby-toggle__btn ${hostParticipates ? 'is-on' : ''}`}
              onClick={() => onHostParticipatesChange(true)}
            >
              ✅ أشارك
            </button>
            <button
              type="button"
              className={`sniper-lobby-toggle__btn ${!hostParticipates ? 'is-on' : ''}`}
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
            border: `1px solid ${SNIPER_BORDER_CSS}`,
          }}
        >
          <Av p={me} sz={44} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 15 }}>{me.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              غرفة <span style={{ fontFamily: 'monospace', letterSpacing: 2, color: SNIPER_ACCENT_CSS }}>{roomCode}</span>
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
        <button type="button" className="btn bg" disabled={list.length < 2} onClick={onStart}>
          ▶️ بدء اللعبة
        </button>
      )}
      {isAdmin && list.length < 2 && (
        <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>
          يفضّل انضمام لاعبين اثنين على الأقل
        </div>
      )}
    </div>
  );
}
