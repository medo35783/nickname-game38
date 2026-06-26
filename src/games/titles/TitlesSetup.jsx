import {
  ROOM_CODE_PLACEHOLDER,
  PLAYER_DISPLAY_NAME_PLACEHOLDER,
  PLAYER_NICK_PLACEHOLDER,
  PLAYER_NICK2_PLACEHOLDER,
  PLAYER_NICK_HINT_SINGLE,
  PLAYER_NICK_HINT_FIRST,
  PLAYER_NICK_HINT_SECOND,
} from '../../core/formLabels';
import GameGuideOpenButton from '../../shared/GameGuideOpenButton';
import GameSeatPinField from '../../shared/GameSeatPinField';

export default function TitlesSetup(props) {
  const {
    gameScreen,
    setGameScreen,
    joinInput,
    setJoinInput,
    joinErr,
    setJoinErr,
    joinName,
    setJoinName,
    joinNick,
    setJoinNick,
    joinNick2,
    setJoinNick2,
    joinPin,
    setJoinPin,
    joinLoading,
    joinRoomNickMode,
    joinRoomModeLoading,
    joinRoom,
    isLoggedIn,
    onOpenGuide,
  } = props;

  const isDualMode = joinRoomNickMode === 2;
  const roomCodeComplete = joinInput.length === 4;
  const roomReady = roomCodeComplete && !joinRoomModeLoading;

  if (gameScreen !== 'join') return null;

  return (
    <div className="scr">
      <button type="button" className="btn bgh bsm" style={{ width: 'auto', marginBottom: 12 }} onClick={() => setGameScreen('home')}>
        ← رجوع
      </button>
      <div className="ptitle">انضمام للعبة</div>
      <div className="psub">
        {isDualMode && roomReady
          ? 'رمز الغرفة + اسمك + لقبان سريان (وضع اللقبين)'
          : 'رمز الغرفة (4 أرقام) + اسمك ولقبك السري'}
      </div>
      <div className="card">
        <div className="ig">
          <label className="lbl">🔢 رمز الغرفة (4 أرقام)</label>
          <input
            className={`inp big${joinErr ? ' err-b' : ''}`}
            placeholder={ROOM_CODE_PLACEHOLDER}
            maxLength={4}
            value={joinInput}
            onChange={(e) => {
              setJoinInput(e.target.value.replace(/\D/g, ''));
              setJoinErr('');
            }}
          />
          {roomCodeComplete && joinRoomModeLoading && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>⏳ جاري التحقق من إعدادات الغرفة…</div>
          )}
          {roomCodeComplete && isDualMode && (
            <div
              style={{
                marginTop: 8,
                background: 'rgba(37,111,168,.08)',
                border: '1px solid rgba(37,111,168,.25)',
                borderRadius: 8,
                padding: '7px 12px',
                fontSize: 11,
                color: 'var(--blue)',
              }}
            >
              🎭 هذه الغرفة بوضع <strong>لقبان</strong> — أدخل لقبين مختلفين
            </div>
          )}
        </div>
      </div>
      <div className="card">
        <div className="ctitle">👤 بياناتك</div>
        <div className="ig">
          <label className="lbl">اسمك</label>
          <input
            className="inp"
            placeholder={PLAYER_DISPLAY_NAME_PLACEHOLDER}
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
          />
        </div>
        <div className="ig">
          <label className="lbl">{isDualMode ? '🎭 لقبك الأول' : '🎭 لقبك السري'}</label>
          <input
            className="inp"
            placeholder={PLAYER_NICK_PLACEHOLDER}
            value={joinNick}
            onChange={(e) => setJoinNick(e.target.value)}
            disabled={joinInput.length === 4 && joinRoomModeLoading}
          />
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
            {isDualMode ? PLAYER_NICK_HINT_FIRST : PLAYER_NICK_HINT_SINGLE}
          </div>
        </div>
        {isDualMode && roomCodeComplete && (
          <div className="ig">
            <label className="lbl">🎭 لقبك الثاني</label>
            <input
              className="inp"
              placeholder={PLAYER_NICK2_PLACEHOLDER}
              value={joinNick2}
              onChange={(e) => setJoinNick2(e.target.value)}
              disabled={joinRoomModeLoading}
            />
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
              {PLAYER_NICK_HINT_SECOND}
            </div>
          </div>
        )}
        {isLoggedIn ? (
          <div className="game-seat-login-hint">
            ✅ مسجّل دخول — مقعدك مربوط بحسابك وترجع للعبة بدون رقم سري
          </div>
        ) : (
          <div className="game-seat-guest-pin-card">
            <GameSeatPinField
              value={joinPin}
              onChange={setJoinPin}
              disabled={joinInput.length === 4 && joinRoomModeLoading}
            />
          </div>
        )}
        <div
          style={{
            background: 'var(--titles-tag-bg)',
            border: '1px solid var(--titles-border)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 11,
            color: 'var(--muted)',
          }}
        >
          💡 اختر {isDualMode ? 'لقبين لا يمتان' : 'لقباً لا يمت'} بصلة لاهتماماتك!
        </div>
        <div
          style={{
            marginTop: 8,
            background: 'rgba(37,111,168,.08)',
            border: '1px solid rgba(37,111,168,.22)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 11,
            color: 'var(--muted)',
          }}
        >
          🔄 إذا خرجت: نفس الرمز والاسم واللقب{isLoggedIn ? '' : ' + رقمك السري'} للعودة
        </div>
        {joinErr && <div className="err-msg">⚠️ {joinErr}</div>}
      </div>
      <button type="button" className="btn bg" onClick={joinRoom} disabled={joinLoading || (joinInput.length === 4 && joinRoomModeLoading)}>
        {joinLoading ? '⏳ جارٍ الانضمام...' : '🚀 انضمام'}
      </button>
      <GameGuideOpenButton onClick={onOpenGuide} />
    </div>
  );
}
