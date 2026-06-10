import { useEffect, useMemo, useState } from 'react';
import { auth } from '../firebase';
import { fetchMyContributions } from './qbank.helpers';
import {
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  TYPE_LABELS,
  STATUS_LABELS,
} from './qbank.labels';

function truncate(text, max = 72) {
  const v = String(text || '').trim();
  if (v.length <= max) return v || '—';
  return `${v.slice(0, max)}…`;
}

function formatDate(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
  } catch {
    return '—';
  }
}

export default function MyContributions({ compact = false, onContribute }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const uid = auth.currentUser?.uid || null;
        const rows = await fetchMyContributions({ uid });
        if (active) setItems(rows);
      } catch {
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => ({
    pending: items.filter((q) => q.status === 'pending').length,
    approved: items.filter((q) => q.status === 'approved').length,
    rejected: items.filter((q) => q.status === 'rejected').length,
  }), [items]);

  if (loading) {
    return <div className="psub" style={{ textAlign: 'center', padding: 12 }}>جاري التحميل…</div>;
  }

  if (compact) {
    return (
      <div>
        {items.length === 0 ? (
          <p className="psub" style={{ marginBottom: 0, fontSize: 12 }}>
            لم ترسل أي مقترح بعد
          </p>
        ) : (
          <p className="psub" style={{ marginBottom: 0, fontSize: 12 }}>
            {stats.approved > 0 && <><strong>{stats.approved}</strong> معتمد · </>}
            {stats.pending > 0 && <><strong>{stats.pending}</strong> قيد المراجعة · </>}
            {stats.rejected > 0 && <><strong>{stats.rejected}</strong> مرفوض</>}
            {stats.approved === 0 && stats.pending === 0 && stats.rejected === 0 && 'لا مقترحات'}
          </p>
        )}
        {onContribute ? (
          <button type="button" className="btn kb-spotlight-open mt2" style={{ width: '100%' }} onClick={onContribute}>
            📚 فتح بنك المعرفة
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      {items.length > 0 ? (
        <div className="qbank-mine-summary">
          <span><strong>{stats.approved}</strong> معتمد</span>
          <span><strong>{stats.pending}</strong> قيد المراجعة</span>
          {stats.rejected > 0 ? <span><strong>{stats.rejected}</strong> مرفوض</span> : null}
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="psub" style={{ textAlign: 'center', padding: '16px 0' }}>
          لا توجد مقترحات سابقة
        </p>
      ) : (
        <div>
          {items.map((q) => (
            <div key={q.id} className={`qbank-contrib-card is-${q.status || 'pending'}`}>
              <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.6, marginBottom: 6 }}>
                {truncate(q.question_text)}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className={`qbank-contrib-status qbank-contrib-status--${q.status || 'pending'}`}>
                  {STATUS_LABELS[q.status] || q.status}
                </span>
                {q.category ? (
                  <span className="tag tm" style={{ fontSize: 10 }}>{CATEGORY_LABELS[q.category] || q.category}</span>
                ) : q.type ? (
                  <span className="tag tm" style={{ fontSize: 10 }}>{TYPE_LABELS[q.type] || q.type}</span>
                ) : null}
                {q.difficulty_level ? (
                  <span className="tag tm" style={{ fontSize: 10 }}>{DIFFICULTY_LABELS[q.difficulty_level]}</span>
                ) : null}
                <span style={{ fontSize: 10, color: 'var(--dim)' }}>{formatDate(q.createdAt)}</span>
              </div>
              {q.status === 'rejected' && q.rejection_reason ? (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--red)', lineHeight: 1.6 }}>
                  {q.rejection_reason}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
