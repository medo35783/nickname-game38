import { useEffect, useState } from 'react';
import {
  subscribePlatformFeedback,
  updateFeedbackStatus,
  FEEDBACK_TYPES,
} from '../../core/platformFeedback';
import { publishToCommunity } from '../../core/platformCommunity';

const STATUS_LABELS = {
  new: { label: 'جديد', tone: 'important' },
  read: { label: 'مقروء', tone: 'partial' },
  published: { label: 'منشور', tone: 'ready' },
  done: { label: 'تمت المعالجة', tone: 'ready' },
};

function formatFeedbackDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('ar-SA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * صندوق اقتراحات وبلاغات المجتمع
 */
export default function AdminFeedbackInbox({ notify }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('new');
  const [replyDraft, setReplyDraft] = useState({});

  useEffect(() => {
    const unsub = subscribePlatformFeedback(setItems);
    return unsub;
  }, []);

  const filtered = items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'new') return item.status === 'new';
    return item.status === filter;
  });

  const handleStatus = async (id, status) => {
    try {
      await updateFeedbackStatus(id, status, replyDraft[id] || '');
      notify?.('تم التحديث', 'success');
    } catch {
      notify?.('تعذّر التحديث', 'error');
    }
  };

  const handlePublish = async (item) => {
    if (item.type !== 'suggest') {
      notify?.('النشر للمجتمع متاح للاقتراحات فقط', 'error');
      return;
    }
    try {
      await publishToCommunity({
        text: item.text,
        category: item.category || 'اقتراح',
        type: item.type,
        sourceFeedbackId: item.id,
      });
      await updateFeedbackStatus(item.id, 'published', replyDraft[item.id] || '');
      notify?.('✅ نُشر في صفحة صوتك', 'success');
    } catch {
      notify?.('تعذّر النشر', 'error');
    }
  };

  const newCount = items.filter((i) => i.status === 'new').length;

  return (
    <div className="admin-feedback">
      <div className="admin-pulse-stats-row">
        <div className="admin-pulse-stat admin-pulse-stat--gold">
          <div className="admin-pulse-stat__val">{newCount}</div>
          <div className="admin-pulse-stat__lbl">جديد</div>
        </div>
        <div className="admin-pulse-stat">
          <div className="admin-pulse-stat__val">{items.length}</div>
          <div className="admin-pulse-stat__lbl">الكل</div>
        </div>
      </div>

      <div className="admin-filter-chips">
        {[
          { id: 'new', label: 'جديد' },
          { id: 'read', label: 'مقروء' },
          { id: 'published', label: 'منشور' },
          { id: 'done', label: 'منتهي' },
          { id: 'all', label: 'الكل' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            className={`admin-pulse-chip${filter === f.id ? ' admin-pulse-chip--on' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <p className="admin-pulse-empty">لا توجد رسائل في هذا التصنيف.</p>
      ) : (
        <ul className="admin-pulse-list admin-feedback-list">
          {filtered.map((item) => {
            const typeMeta = FEEDBACK_TYPES[item.type] || FEEDBACK_TYPES.suggest;
            const statusMeta = STATUS_LABELS[item.status] || STATUS_LABELS.new;
            return (
              <li key={item.id} className="admin-feedback-card">
                <div className="admin-feedback-card__head">
                  <span>
                    {typeMeta.icon} {typeMeta.label}
                    {item.category ? ` · ${item.category}` : ''}
                  </span>
                  <span className={`admin-hub-badge admin-hub-badge--${statusMeta.tone}`}>
                    {statusMeta.label}
                  </span>
                </div>
                <p className="admin-feedback-card__text">{item.text}</p>
                <div className="admin-feedback-card__meta">
                  <time>{formatFeedbackDate(item.createdAt)}</time>
                  {item.email ? <span>{item.email}</span> : null}
                </div>
                <input
                  className="inp"
                  placeholder="ملاحظة داخلية (اختياري)"
                  value={replyDraft[item.id] ?? item.adminReply ?? ''}
                  onChange={(e) =>
                    setReplyDraft((d) => ({ ...d, [item.id]: e.target.value }))
                  }
                />
                <div className="admin-feedback-card__actions">
                  {item.type === 'suggest' && item.status !== 'published' ? (
                    <button
                      type="button"
                      className="btn btn--sm btn--gold"
                      onClick={() => handlePublish(item)}
                    >
                      📢 انشر في المجتمع
                    </button>
                  ) : null}
                  {item.status !== 'read' && item.status !== 'published' ? (
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={() => handleStatus(item.id, 'read')}
                    >
                      مقروء
                    </button>
                  ) : null}
                  {item.status !== 'done' ? (
                    <button
                      type="button"
                      className="btn btn--sm btn--gold"
                      onClick={() => handleStatus(item.id, 'done')}
                    >
                      تمت المعالجة
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
