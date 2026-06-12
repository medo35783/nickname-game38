import { useEffect, useRef, useState } from 'react';
import { ref as dbRef, push, set, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../core/firebase';

/**
 * محادثة خاصة لكل مجموعة (نصية) — يراها أعضاء المجموعة فقط.
 * تُخزَّن خارج مسار qrooms (في qchats) لتُحجب عن بقية المجموعات على مستوى القواعد.
 */
export default function FameeriGroupChat({
  qRoom,
  groupId,
  me,
  accent = 'var(--fameeri-primary)',
  defaultOpen = false,
  embedded = false,
}) {
  const [open, setOpen] = useState(defaultOpen || embedded);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const path = `qchats/${qRoom}/${groupId}`;

  useEffect(() => {
    if (!qRoom || !groupId) return undefined;

    let unsubscribeDb = () => {};

    const attachListener = () => {
      unsubscribeDb();
      if (!auth.currentUser) return;
      unsubscribeDb = onValue(
        dbRef(db, path),
        (snap) => {
          const val = snap.val() || {};
          const list = Object.entries(val)
            .map(([id, m]) => ({ id, ...m }))
            .sort((a, b) => (a.ts || 0) - (b.ts || 0))
            .slice(-100);
          setMsgs(list);
        },
        (err) => {
          console.warn('[FameeriGroupChat] listen failed', err?.message || err);
        }
      );
    };

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeDb();
      if (!user) {
        setMsgs([]);
        return;
      }
      attachListener();
    });

    return () => {
      unsubAuth();
      unsubscribeDb();
    };
  }, [qRoom, groupId, path]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

  const send = async () => {
    const t = text.trim();
    if (!t || !me?.uid) return;
    const payload = {
      uid: me.uid,
      name: (me.name || 'لاعب').slice(0, 80),
      text: t.slice(0, 500),
      ts: Date.now(),
    };
    const tempId = `pending-${payload.ts}`;
    setSending(true);
    setText('');
    setMsgs((prev) => [...prev, { id: tempId, ...payload, pending: true }]);
    try {
      const nRef = push(dbRef(db, path));
      await set(nRef, payload);
      setMsgs((prev) => prev.filter((m) => m.id !== tempId));
    } catch {
      setMsgs((prev) => prev.filter((m) => m.id !== tempId));
      setText(t);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`card fameeri-group-chat${embedded ? ' fameeri-group-chat--embedded' : ''}`} style={{ padding: open ? '12px' : '10px 12px' }}>
      {embedded ? (
        <div className="fameeri-group-chat__head">
          <span className="ctitle" style={{ margin: 0 }}>💬 محادثة الفريق</span>
          {msgs.length > 0 && <span className="fameeri-group-chat__count">{msgs.length} رسالة</span>}
        </div>
      ) : (
        <button
          type="button"
          className="fameeri-group-chat__toggle"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="ctitle" style={{ margin: 0 }}>💬 محادثة المجموعة</span>
          <span className="fameeri-group-chat__toggle-hint">{open ? '▼ إخفاء' : `▲ عرض (${msgs.length})`}</span>
        </button>
      )}

      {(open || embedded) && (
        <>
          <div style={{ maxHeight: 230, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, margin: '10px 0', padding: 4 }}>
            {msgs.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, padding: '14px 0' }}>لا رسائل بعد — ابدأ النقاش 👋</div>
            )}
            {msgs.map((m) => {
              const mine = m.uid === me?.uid;
              return (
                <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
                  {!mine && (
                    <div style={{ fontSize: 10, color: accent, fontWeight: 700, marginBottom: 2, paddingInline: 4 }}>{m.name}</div>
                  )}
                  <div
                    style={{
                      background: mine ? accent : 'var(--surface)',
                      color: mine ? '#fff' : 'inherit',
                      padding: '7px 11px',
                      borderRadius: 14,
                      fontSize: 13,
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="inp"
              style={{ flex: 1, fontSize: 13 }}
              value={text}
              maxLength={500}
              placeholder="اكتب رسالة…"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <button type="button" className="btn bg bsm" style={{ width: 'auto' }} disabled={sending || !text.trim()} onClick={() => void send()}>
              إرسال
            </button>
          </div>
        </>
      )}
    </div>
  );
}
