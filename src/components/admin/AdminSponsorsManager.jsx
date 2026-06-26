import {
  fetchSponsorsAdmin,
  saveSponsorItem,
  deleteSponsorItem,
  SPONSOR_GAME_OPTIONS,
} from '../../core/platformSponsors';
import { aggregateSponsorImpressions, collectSponsorSessionLog } from '../../core/sponsorStatsHelpers';
import { openSponsorImpactReport } from '../../core/sponsorImpactReport';
import { useCallback, useEffect, useMemo, useState } from 'react';

const EMPTY = {
  name: '',
  logoUrl: '',
  tagline: '',
  prizeOffer: '',
  games: ['titles', 'fameeri', 'hesbah'],
  active: true,
  sortOrder: 100,
  expiresAt: '',
};

async function readImageFile(file) {
  if (!file) return null;
  if (!file.type.startsWith('image/')) throw new Error('اختر ملف صورة');
  if (file.size > 90000) throw new Error('الصورة كبيرة — استخدم رابط URL أو صورة أصغر من 90KB');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('تعذّر قراءة الصورة'));
    reader.readAsDataURL(file);
  });
}

/**
 * إدارة رعاة الجولات — شعار + ألعاب + جائزة
 */
export default function AdminSponsorsManager({ notify, codeRows = [], codeStatsById = {} }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const sponsorTotals = useMemo(
    () => aggregateSponsorImpressions(codeRows, codeStatsById),
    [codeRows, codeStatsById]
  );

  const sessionLog = useMemo(
    () => collectSponsorSessionLog(codeRows, codeStatsById),
    [codeRows, codeStatsById]
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchSponsorsAdmin());
    } catch {
      notify?.('تعذّر تحميل الرعاة', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    reload();
  }, [reload]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      logoUrl: item.logoUrl,
      tagline: item.tagline,
      prizeOffer: item.prizeOffer,
      games: item.games,
      active: item.active,
      sortOrder: item.sortOrder || 0,
      expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString().slice(0, 10) : '',
    });
  };

  const toggleGame = (gameId) => {
    setForm((f) => {
      const has = f.games.includes(gameId);
      const games = has ? f.games.filter((g) => g !== gameId) : [...f.games, gameId];
      return { ...f, games: games.length ? games : [gameId] };
    });
  };

  const handleLogoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readImageFile(file);
      setForm((f) => ({ ...f, logoUrl: dataUrl }));
      notify?.('تم رفع الشعار', 'success');
    } catch (err) {
      notify?.(err.message || 'فشل الرفع', 'error');
    }
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      notify?.('اسم الراعي مطلوب', 'error');
      return;
    }
    setSaving(true);
    try {
      await saveSponsorItem(editingId, {
        ...form,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : null,
      });
      notify?.(editingId ? 'تم التحديث' : 'تمت إضافة الراعي', 'success');
      resetForm();
      await reload();
    } catch (e) {
      notify?.(e.message || 'فشل الحفظ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('حذف هذا الراعي؟')) return;
    try {
      await deleteSponsorItem(id);
      notify?.('تم الحذف', 'success');
      if (editingId === id) resetForm();
      await reload();
    } catch {
      notify?.('تعذّر الحذف', 'error');
    }
  };

  return (
    <div className="admin-content-block">
      <p className="admin-mkt-lead">
        شعار الراعي يظهر أثناء الجولات في الألعاب المحددة، ويُدرج في تقرير رعاية B2B.
        اربط الراعي من صفحة <strong>الأكواد → تفاصيل</strong> لكل اشتراك.
      </p>

      {sponsorTotals.length > 0 ? (
        <div className="admin-pulse-card admin-pulse-card--live" style={{ marginBottom: 12 }}>
          <div className="admin-pulse-card__head">
            <span aria-hidden>📊</span>
            <strong>إحصائيات الظهور (مجمّعة)</strong>
          </div>
          <ul className="admin-pulse-list">
            {sponsorTotals.map((row) => (
              <li key={row.sponsorId} className="admin-sponsor-stat-row">
                <strong>{row.sponsorName}</strong>
                <span>{row.roundReach} ظهور</span>
                <span>{row.sessions} جلسة</span>
                <span>{row.codeCount} كود</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {sessionLog.length > 0 ? (
        <div className="admin-pulse-card" style={{ marginBottom: 12 }}>
          <div className="admin-pulse-card__head">
            <span aria-hidden>🗓️</span>
            <strong>آخر جلسات برعاية</strong>
          </div>
          <ul className="admin-pulse-list admin-sponsor-session-log">
            {sessionLog.slice(0, 8).map((s, i) => (
              <li key={`${s.ts}-${i}`} className="admin-sponsor-session-row">
                <span>{s.sponsorName}</span>
                <span>{s.sponsorImpressions} ظهور · {s.totalRounds} جولة</span>
                <span className="admin-sponsor-session-row__time">
                  {s.ts ? new Date(s.ts).toLocaleDateString('ar-SA') : '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="admin-pulse-card">
        <div className="admin-pulse-card__head">
          <span aria-hidden>🤝</span>
          <strong>{editingId ? 'تعديل راعٍ' : 'راعٍ جديد'}</strong>
        </div>

        <div className="admin-form-grid">
          <label className="admin-form-field">
            <span>اسم الراعي / الشركة</span>
            <input
              className="inp"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: شركة XYZ"
            />
          </label>
          <label className="admin-form-field">
            <span>شعار (رابط URL)</span>
            <input
              className="inp"
              value={form.logoUrl.startsWith('data:') ? '' : form.logoUrl}
              onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
              placeholder="https://..."
            />
          </label>
          <label className="admin-form-field admin-form-field--full">
            <span>أو ارفع صورة الشعار</span>
            <input type="file" accept="image/*" onChange={handleLogoFile} />
          </label>
          {form.logoUrl ? (
            <div className="admin-sponsor-preview admin-form-field--full">
              <img src={form.logoUrl} alt="" />
            </div>
          ) : null}
          <label className="admin-form-field admin-form-field--full">
            <span>شعار قصير (اختياري)</span>
            <input
              className="inp"
              value={form.tagline}
              onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
              placeholder="برعاية ..."
            />
          </label>
          <label className="admin-form-field admin-form-field--full">
            <span>عرض الجائزة (لتقرير ②)</span>
            <input
              className="inp"
              value={form.prizeOffer}
              onChange={(e) => setForm((f) => ({ ...f, prizeOffer: e.target.value }))}
              placeholder="خصم 20% للفائز — كوبون XYZ"
            />
          </label>
          <div className="admin-form-field admin-form-field--full">
            <span>الألعاب المشمولة</span>
            <div className="admin-filter-chips">
              {SPONSOR_GAME_OPTIONS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`admin-pulse-chip${form.games.includes(g.id) ? ' admin-pulse-chip--on' : ''}`}
                  onClick={() => toggleGame(g.id)}
                >
                  {g.icon} {g.label}
                </button>
              ))}
            </div>
          </div>
          <label className="admin-form-field">
            <span>ترتيب</span>
            <input
              className="inp"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
            />
          </label>
          <label className="admin-form-field">
            <span>ينتهي (اختياري)</span>
            <input
              className="inp"
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
            />
          </label>
          <label className="admin-form-check admin-form-field--full">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            <span>نشط — يظهر في الجولات</span>
          </label>
        </div>

        <div className="admin-mkt-actions">
          <button type="button" className="btn btn--gold" disabled={saving} onClick={handleSave}>
            {saving ? 'جاري الحفظ…' : editingId ? 'حفظ' : 'إضافة الراعي'}
          </button>
          {editingId ? (
            <button type="button" className="btn btn--ghost" onClick={resetForm}>
              إلغاء
            </button>
          ) : null}
        </div>
      </div>

      <div className="admin-pulse-card" style={{ marginTop: 12 }}>
        <div className="admin-pulse-card__head">
          <span aria-hidden>📋</span>
          <strong>الرعاة المسجّلون</strong>
          <span className="admin-pulse-card__count">{items.length}</span>
        </div>

        {loading ? (
          <p className="admin-pulse-empty">جاري التحميل…</p>
        ) : !items.length ? (
          <p className="admin-pulse-empty">لا يوجد رعاة بعد — أضف أول راعٍ أعلاه.</p>
        ) : (
          <ul className="admin-pulse-list">
            {items.map((item) => (
              <li key={item.id} className="admin-sponsor-row">
                <div className="admin-sponsor-row__head">
                  {item.logoUrl ? <img src={item.logoUrl} alt="" className="admin-sponsor-row__logo" /> : <span>🤝</span>}
                  <div>
                    <strong>{item.name}</strong>
                    <div className="admin-sponsor-row__games">
                      {item.games.map((g) => SPONSOR_GAME_OPTIONS.find((o) => o.id === g)?.icon).join(' ')}
                      {item.prizeOffer ? ` · 🎁 ${item.prizeOffer.slice(0, 40)}` : ''}
                    </div>
                  </div>
                  <span className={`admin-hub-badge admin-hub-badge--${item.active ? 'ready' : 'soon'}`}>
                    {item.active ? 'نشط' : 'موقوف'}
                  </span>
                </div>
                <div className="admin-news-row__actions">
                  <button
                    type="button"
                    className="btn btn--sm btn--gold"
                    onClick={() => openSponsorImpactReport(item, codeRows, codeStatsById, notify)}
                  >
                    📄 تقرير الراعي
                  </button>
                  <button type="button" className="btn btn--sm btn--ghost" onClick={() => startEdit(item)}>
                    تعديل
                  </button>
                  <button type="button" className="btn btn--sm btn--danger" onClick={() => handleDelete(item.id)}>
                    حذف
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
