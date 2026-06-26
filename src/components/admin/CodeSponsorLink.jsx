import { useEffect, useState } from 'react';
import { db, ref, update, get } from '../../core/firebaseHelpers';
import { fetchSponsorsAdmin } from '../../core/platformSponsors';
import { buildActiveCodeSponsorPayload } from '../../core/sponsorStatsHelpers';

/**
 * ربط كود اشتراك براعٍ محدد
 */
export default function CodeSponsorLink({
  codeId,
  codeRow = {},
  indexRow = {},
  notify,
  onLinked,
}) {
  const merged = { ...codeRow, ...indexRow };
  const [sponsors, setSponsors] = useState([]);
  const [sponsorId, setSponsorId] = useState(merged.sponsorId || '');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setSponsorId(merged.sponsorId || '');
    setDirty(false);
  }, [merged.sponsorId, codeId]);

  useEffect(() => {
    fetchSponsorsAdmin()
      .then((list) => setSponsors(list.filter((s) => s.active !== false)))
      .catch(() => setSponsors([]));
  }, []);

  const handleSave = async () => {
    if (!codeId || saving) return;
    setSaving(true);
    try {
      const sp = sponsors.find((s) => s.id === sponsorId);
      const patch = sponsorId && sp
        ? {
            sponsorId: sp.id,
            sponsorName: sp.name,
            sponsorLogoUrl: sp.logoUrl || null,
            sponsorTagline: sp.tagline || null,
            prizeOffer: sp.prizeOffer || null,
          }
        : {
            sponsorId: null,
            sponsorName: null,
            sponsorLogoUrl: null,
            sponsorTagline: null,
            prizeOffer: null,
          };

      await update(ref(db, `codes/${codeId}`), patch);

      const uid = merged.userId || indexRow.userId;
      if (uid && sponsorId && sp) {
        const activeSnap = await get(ref(db, `users/${uid}/activeCode`));
        const active = activeSnap.val();
        if (active?.codeId === codeId) {
          await update(ref(db, `users/${uid}/activeCode`), buildActiveCodeSponsorPayload({ ...patch, sponsorId: sp.id }));
        }
      } else if (uid && !sponsorId) {
        await update(ref(db, `users/${uid}/activeCode`), {
          sponsorId: null,
          sponsorName: null,
          sponsorLogoUrl: null,
          sponsorTagline: null,
          prizeOffer: null,
        });
      }

      setDirty(false);
      notify?.('تم ربط الراعي بالكود', 'success');
      onLinked?.();
    } catch (err) {
      console.error(err);
      notify?.('تعذّر حفظ الراعي', 'error');
    } finally {
      setSaving(false);
    }
  };

  const current = sponsors.find((s) => s.id === (dirty ? sponsorId : merged.sponsorId));

  return (
    <div className="code-sponsor-link">
      <label className="lbl" htmlFor={`code-sponsor-${codeId}`}>
        🤝 راعي الجولات (مرتبط بهذا الكود)
      </label>
      <div className="code-admin-note__row">
        <select
          id={`code-sponsor-${codeId}`}
          className="inp"
          value={sponsorId}
          onChange={(e) => {
            setSponsorId(e.target.value);
            setDirty(true);
          }}
        >
          <option value="">— بدون راعٍ —</option>
          {sponsors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn bgh bxs"
          style={{ width: 'auto', flexShrink: 0 }}
          disabled={!dirty || saving}
          onClick={handleSave}
        >
          {saving ? '…' : 'حفظ'}
        </button>
      </div>
      {current ? (
        <div className="code-sponsor-link__preview">
          {current.logoUrl ? <img src={current.logoUrl} alt="" /> : <span>🤝</span>}
          <span>{current.name}</span>
          {current.prizeOffer ? <span className="code-sponsor-link__prize">🎁 {current.prizeOffer}</span> : null}
        </div>
      ) : merged.sponsorName ? (
        <div className="code-sponsor-link__preview">
          <span>{merged.sponsorName}</span>
        </div>
      ) : null}
    </div>
  );
}
