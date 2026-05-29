import { useEffect, useRef, useState } from 'react';
import { ref as dbRef, push, set, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '../../core/firebase';

/**
 * محادثة خاصة لكل مجموعة (نصية) — يراها أعضاء المجموعة فقط.
 * تُخزَّن خارج مسار qrooms (في qchats) لتُحجب عن بقية المجموعات على مستوى القواعد.
 */
export default function FameeriGroupChat({ qRoom, groupId, me, accent = 'var(--fameeri-primary)' }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const path = `qchats/${qRoom}/${groupId}`;

  useEffect(() => {
    if (!qRoom || !groupId) return undefined;
    const qy = query(dbRef(db, path), orderByChild('ts'), limitToLast(100));
    const off = onValue(
      qy,
      (snap) => {
        const val = snap.val() || {};
        const list = Object.entries(val)
          .map(([id, m]) => ({ id, ...m }))
          .sort((a, b) => (a.ts || 0) - (b.ts || 0));
        setMsgs(list);
      },
      () => setMsgs([])
    );
    return () => off();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qRoom, groupId]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

  const send = async () => {
    const t = text.trim();
    if (!t || !me?.uid) return;
    setSending(true);
    try {
      const nRef = push(dbRef(db, path));
      await set(nRef, { uid: me.uid, name: (me.name || 'لاعب').slice(0, 80), text: t.slice(0, 500), ts: Date.now() });
      setText('');
    } catch {
      /* تجاهل الأخطاء المؤقتة */
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card" style={{ padding: open ? '12px' : '10px 12px' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
      >
        <span className="ctitle" style={{ margin: 0 }}>💬 محادثة المجموعة</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{open ? '▼ إخفاء' : `▲ عرض (${msgs.length})`}</span>
      </button>

      {open && (
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
