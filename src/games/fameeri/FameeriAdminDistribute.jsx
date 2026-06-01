import { useState } from 'react';
import { ref as dbRef, update } from 'firebase/database';
import { db } from '../../core/firebase';
import { Q_TREES, Q_TOTAL } from '../../core/constants';

/**
 * صف حالة مجموعة في شاشة التوزيع + توزيع نيابةً عنها (وضع بدون جوالات).
 */
export default function FameeriAdminDistribute({ group, qRoom, notify, accent = 'var(--fameeri-primary)', hideHeader = false }) {
  const [open, setOpen] = useState(false);
  const [dist, setDist] = useState({});
  const [saving, setSaving] = useState(false);

  const total = Object.values(dist).reduce((s, v) => s + (parseInt(v, 10) || 0), 0);
  const remaining = Q_TOTAL - total;

  const submit = async () => {
    if (remaining !== 0) return;
    const trees = {};
    Q_TREES.forEach((t) => { trees[t] = parseInt(dist[t], 10) || 0; });
    setSaving(true);
    try {
      await update(dbRef(db, `qrooms/${qRoom}/groups/${group.id}`), {
        trees,
        treesInitial: trees,
        distributed: true,
        totalRemaining: Q_TOTAL,
      });
      if (typeof notify === 'function') notify(`✅ تم التوزيع نيابةً عن ${group.name}`, 'success');
      setOpen(false);
      setDist({});
    } catch {
      if (typeof notify === 'function') notify('تعذر حفظ التوزيع', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={hideHeader ? 'fameeri-admin-distribute-inline' : undefined} style={hideHeader ? undefined : { marginBottom: 6, padding: '9px 10px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border-faint)' }}>
      {!hideHeader && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span className="fameeri-group-name">{group.name}</span>
          {group.distributed ? (
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--green)' }}>✅ تم التوزيع</span>
          ) : (
            <button type="button" className="btn bb bxs" style={{ width: 'auto', whiteSpace: 'nowrap' }} onClick={() => setOpen((o) => !o)}>
              {open ? 'إغلاق' : '✏️ وزّع نيابةً'}
            </button>
          )}
        </div>
      )}

      {hideHeader && (
        <div className="fameeri-admin-distribute-inline__bar">
          {group.distributed ? (
            <span className="fameeri-admin-dist-status ok">✅ تم التوزيع</span>
          ) : (
            <button type="button" className="btn bb bxs" style={{ width: 'auto', whiteSpace: 'nowrap' }} onClick={() => setOpen((o) => !o)}>
              {open ? 'إغلاق' : '✏️ وزّع نيابةً'}
            </button>
          )}
        </div>
      )}

      {open && !group.distributed && (
        <div style={{ marginTop: 8 }}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <span style={{ fontFamily: 'Cairo', fontSize: 24, fontWeight: 900, color: remaining === 0 ? 'var(--green)' : remaining < 0 ? 'var(--red)' : accent }}>
              {remaining}
            </span>{' '}
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>متبقٍ من {Q_TOTAL}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {Q_TREES.map((t) => (
              <div key={t} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700 }}>🌳 {t}</div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="inp"
                  style={{ padding: '5px', fontSize: 14, textAlign: 'center' }}
                  value={dist[t] || ''}
                  placeholder="0"
                  onChange={(e) => setDist((p) => ({ ...p, [t]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <button type="button" className="btn bg mt2" disabled={remaining !== 0 || saving} onClick={() => void submit()}>
            {saving ? '⏳ جاري الحفظ…' : remaining === 0 ? '✅ تأكيد التوزيع' : `وزّع ${Math.abs(remaining)} بالضبط`}
          </button>
        </div>
      )}
    </div>
  );
}
