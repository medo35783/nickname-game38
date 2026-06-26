import { ref, onValue, push, set, remove, get } from 'firebase/database';
import { db } from '../firebase';

const COMMUNITY_PATH = 'platform/communityPosts';

function normalizePost(id, raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id,
    text: String(raw.text || '').trim(),
    category: String(raw.category || '').trim(),
    type: raw.type || 'suggest',
    sourceFeedbackId: raw.sourceFeedbackId || null,
    publishedAt: Number(raw.publishedAt) || 0,
    active: raw.active !== false,
  };
}

export function subscribeCommunityPosts(onData) {
  const r = ref(db, COMMUNITY_PATH);
  return onValue(
    r,
    (snap) => {
      const val = snap.val() || {};
      const list = Object.entries(val)
        .map(([id, row]) => normalizePost(id, row))
        .filter((p) => p?.text && p.active)
        .sort((a, b) => b.publishedAt - a.publishedAt)
        .slice(0, 12)
        .map((p, i) => ({
          id: p.id,
          cat: p.category || 'اقتراح',
          text: p.text,
          date: p.publishedAt
            ? new Date(p.publishedAt).toISOString().slice(0, 10)
            : '',
        }));
      onData(list);
    },
    () => onData([])
  );
}

export async function publishToCommunity({ text, category, type = 'suggest', sourceFeedbackId = null }) {
  const body = String(text || '').trim();
  if (!body) throw new Error('النص مطلوب');
  const newRef = push(ref(db, COMMUNITY_PATH));
  await set(newRef, {
    text: body.slice(0, 500),
    category: String(category || 'اقتراح').slice(0, 40),
    type,
    sourceFeedbackId,
    publishedAt: Date.now(),
    active: true,
  });
  return newRef.key;
}

export async function unpublishCommunityPost(id) {
  if (!id) return;
  await remove(ref(db, `${COMMUNITY_PATH}/${id}`));
}

export async function fetchCommunityPostsAdmin() {
  const snap = await get(ref(db, COMMUNITY_PATH));
  const val = snap.val() || {};
  return Object.entries(val)
    .map(([id, row]) => normalizePost(id, row))
    .filter(Boolean)
    .sort((a, b) => b.publishedAt - a.publishedAt);
}
