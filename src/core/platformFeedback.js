import { ref, onValue, push, set, update, get } from 'firebase/database';
import { db } from '../firebase';

const FEEDBACK_PATH = 'platform/feedback';

export const FEEDBACK_TYPES = {
  suggest: { label: 'اقتراح', icon: '✨' },
  bug: { label: 'بلاغ', icon: '🔧' },
  ask: { label: 'استفسار', icon: '💬' },
};

export async function submitPlatformFeedback({ type, category, text, uid = null, email = null }) {
  const body = String(text || '').trim();
  if (!body) throw new Error('النص مطلوب');
  const newRef = push(ref(db, FEEDBACK_PATH));
  await set(newRef, {
    type: type || 'suggest',
    category: String(category || '').slice(0, 40),
    text: body.slice(0, 2000),
    uid: uid || null,
    email: email ? String(email).slice(0, 120) : null,
    status: 'new',
    createdAt: Date.now(),
  });
  return newRef.key;
}

export function subscribePlatformFeedback(onData) {
  const r = ref(db, FEEDBACK_PATH);
  return onValue(r, (snap) => {
    const val = snap.val() || {};
    const list = Object.entries(val)
      .map(([id, row]) => ({
        id,
        type: row.type || 'suggest',
        category: row.category || '',
        text: row.text || '',
        status: row.status || 'new',
        adminReply: row.adminReply || '',
        createdAt: Number(row.createdAt) || 0,
        email: row.email || null,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
    onData(list);
  });
}

export async function updateFeedbackStatus(id, status, adminReply = '') {
  if (!id) return;
  await update(ref(db, `${FEEDBACK_PATH}/${id}`), {
    status,
    adminReply: String(adminReply || '').slice(0, 500),
    processedAt: Date.now(),
  });
}
