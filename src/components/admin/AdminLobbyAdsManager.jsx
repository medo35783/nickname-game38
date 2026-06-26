import { useCallback, useEffect, useState } from 'react';
import {
  fetchLobbyAdsAdmin,
  saveLobbyAdItem,
  deleteLobbyAdItem,
  LOBBY_AD_VARIANTS,
} from '../../core/platformLobbyAds';

const EMPTY = {
  title: '',
  body: '',
  imageUrl: '',
  linkUrl: '',
  ctaLabel: '',
  variant: 'gold',
  active: true,
  sortOrder: 100,
  expiresAt: '',
};

async function readImageFile(file) {
  if (!file) return null;
  if (!file.type.startsWith('image/')) throw new Error('اختر ملف صورة');
  if (file.size > 90000) throw new Error('الصورة كبيرة — استخدم رابطاً أو صورة أصغر');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('تعذّر قراءة الصورة'));
    reader.readAsDataURL(file);
  });
}

/**
 * إدارة إعلانات اللوبي — الصفحة الرئيسية
 */
export default function AdminLobbyAdsManager({ notify }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchLobbyAdsAdmin());
    } catch {
      notify?.('تعذّر تحميل الإعلانات', 'error');
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
      title: item.title,
      body: item.body,
      imageUrl: item.imageUrl,
      linkUrl: item.linkUrl,
      ctaLabel: item.ctaLabel,
      variant: item.variant,
      active: item.active,
      sortOrder: item.sortOrder || 0,
      expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString().slice(0, 10) : '',
    });
  };

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readImageFile(file);
      setForm((f) => ({ ...f, imageUrl: dataUrl }));
      notify?.('تم رفع الصورة', 'success');
    } catch (err) {
      notify?.(err.message || 'فشل الرفع', 'error');
    }
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      notify?.('العنوان مطلوب', 'error');
      return;
    }
    setSaving(true);
    try {
      await saveLobbyAdItem(editingId, {
        ...form,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : null,
      });
      notify?.(editingId ? 'تم التحديث' : 'تم النشر', 'success');
      resetForm();
      await reload();
    } catch (e) {
      notify?.(e.message || 'فشل الحفظ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('حذف هذا الإعلان؟')) return;
    try {
      await deleteLobbyAdItem(id);
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
        بانرات ترويجية تظهر في الصفحة الرئيسية للمنصة — عروض، رعاة، أو إعلانات موسمية.
      </p>

      <div className="admin-pulse-card">
        <div className="admin-pulse-card__head">
          <span aria-hidden>📢</span>
          <strong>{editingId ? 'تعديل إعلان' : 'إعلان جديد'}</strong>
        </div>

        <div className="admin-form-grid">
          <label className="admin-form-field admin-form-field--full">
            <span>العنوان</span>
            <input
              className="inp"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="عرض خاص — باقة 7 أيام"
            />
          </label>
          <label className="admin-form-field admin-form-field--full">
            <span>النص</span>
            <textarea
              className="inp admin-form-textarea"
              rows={3}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="تفاصيل العرض..."
            />
          </label>
          <label className="admin-form-field">
            <span>رابط (اختياري)</span>
            <input
              className="inp"
              value={form.linkUrl}
              onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
              placeholder="https://..."
            />
          </label>
          <label className="admin-form-field">
            <span>نص الزر</span>
            <input
              className="inp"
              value={form.ctaLabel}
              onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
              placeholder="اعرف المزيد"
            />
          </label>
          <label className="admin-form-field">
            <span>صورة (رابط)</span>
            <input
              className="inp"
              value={form.imageUrl.startsWith('data:') ? '' : form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
            />
          </label>
          <label className="admin-form-field">
            <span>أو ارفع صورة</span>
            <input type="file" accept="image/*" onChange={handleImageFile} />
          </label>
          <label className="admin-form-field">
            <span>اللون</span>
            <select
              className="inp"
              value={form.variant}
              onChange={(e) => setForm((f) => ({ ...f, variant: e.target.value }))}
            >
              {LOBBY_AD_VARIANTS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
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
            <span>ينتهي</span>
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
            <span>نشط</span>
          </label>
        </div>

        <div className="admin-mkt-actions">
          <button type="button" className="btn btn--gold" disabled={saving} onClick={handleSave}>
            {saving ? 'جاري الحفظ…' : editingId ? 'حفظ' : 'نشر الإعلان'}
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
          <strong>الإعلانات</strong>
          <span className="admin-pulse-card__count">{items.length}</span>
        </div>

        {loading ? (
          <p className="admin-pulse-empty">جاري التحميل…</p>
        ) : !items.length ? (
          <p className="admin-pulse-empty">لا توجد إعلانات — الصفحة الرئيسية بدون بانرات.</p>
        ) : (
          <ul className="admin-pulse-list">
            {items.map((item) => (
              <li key={item.id} className="admin-lobby-ad-row">
                <strong>{item.title}</strong>
                {item.body ? <p>{item.body.slice(0, 80)}</p> : null}
                <div className="admin-news-row__actions">
                  <span className={`admin-hub-badge admin-hub-badge--${item.active ? 'ready' : 'soon'}`}>
                    {item.active ? 'نشط' : 'موقوف'}
                  </span>
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
