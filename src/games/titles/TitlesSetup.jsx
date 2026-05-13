import { useEffect, useState } from 'react';
import { get, roomRef } from '../../core/firebaseHelpers';

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
    joinLoading,
    nickMode,
    joinRoom,
    notify,
  } = props;

  const [joinRoomNickMode, setJoinRoomNickMode] = useState(1);

  useEffect(() => {
    if (gameScreen !== 'join') setJoinRoomNickMode(1);
  }, [gameScreen]);

  if (gameScreen === 'join') {
    return (
      <div className="scr">
        <button type="button" className="btn bgh bsm" style={{ width: 'auto', marginBottom: 12 }} onClick={() => setGameScreen('home')}>
          ← رجوع
        </button>
        <div className="ptitle">انضمام للعبة</div>
        <div className="psub">أدخل رمز الغرفة المرسل من المشرف</div>
        <div className="card">
          <div className="ig">
            <label className="lbl">🔢 رمز الغرفة (4 أرقام)</label>
            <input
              className={`inp big${joinErr ? 'err-b' : ''}`}
              placeholder="× × × × × ×"
              maxLength={4}
              value={joinInput}
              onChange={async (e) => {
                const val = e.target.value.replace(/\D/g, '');
                setJoinInput(val);
                setJoinErr('');
                if (val.length === 4) {
                  try {
                    const s = await get(roomRef(val));
                    if (s.exists()) setJoinRoomNickMode(s.val()?.game?.nickMode || 1);
                  } catch (err) {
                    void err;
                  }
                } else setJoinRoomNickMode(1);
              }}
            />
          </div>
        </div>
        <div className="card">
          <div className="ctitle">👤 بياناتك</div>
          <div className="ig">
            <label className="lbl">اسمك الكامل</label>
            <input className="inp" placeholder="محمد عبدالله" value={joinName} onChange={(e) => setJoinName(e.target.value)} />
          </div>
          <div className="ig">
            <label className="lbl">{nickMode === 2 ? 'لقبك الأول' : 'لقبك الذي اخترته'}</label>
            <input className="inp" placeholder="القناص" value={joinNick} onChange={(e) => setJoinNick(e.target.value)} />
          </div>
          {joinRoomNickMode === 2 && (
            <div className="ig">
              <label className="lbl">لقبك الثاني</label>
              <input className="inp" placeholder="الصقر" value={joinNick2} onChange={(e) => setJoinNick2(e.target.value)} />
            </div>
          )}
          {joinRoomNickMode === 2 && (
            <div
              style={{
                background: 'rgba(79,163,224,.08)',
                border: '1px solid rgba(79,163,224,.25)',
                borderRadius: 8,
                padding: '7px 12px',
                fontSize: 11,
                color: 'var(--blue)',
                marginBottom: 6,
              }}
            >
              ℹ️ هذه اللعبة تستخدم نظام اللقبين
            </div>
          )}
          <div
            style={{
              background: 'rgba(240,192,64,.06)',
              border: '1px solid rgba(240,192,64,.2)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 11,
              color: 'var(--muted)',
            }}
          >
            💡 اختر لقب{joinRoomNickMode === 2 ? 'ين لا يمتان' : 'اً لا يمت'} بصلة لاهتماماتك!
          </div>
          <div
            style={{
              marginTop: 8,
              background: 'rgba(79,163,224,.06)',
              border: '1px solid rgba(79,163,224,.2)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 11,
              color: 'var(--muted)',
            }}
          >
            🔄 إذا خرجت من اللعبة عن طريق الخطأ، أدخل نفس البيانات للرجوع
          </div>
          {joinErr && <div className="err-msg">⚠️ {joinErr}</div>}
        </div>
        <button type="button" className="btn bg" onClick={joinRoom} disabled={joinLoading}>
          {joinLoading ? '⏳ جارٍ الانضمام...' : `🚀 انضمام`}
        </button>
      </div>
    );
  }

  return null;
}
