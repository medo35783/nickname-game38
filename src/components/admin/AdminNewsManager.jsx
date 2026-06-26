import { useCallback, useEffect, useState } from 'react';
import {
  fetchPlatformNewsAdmin,
  savePlatformNewsItem,
  deletePlatformNewsItem,
  formatVoiceNewsDate,
} from '../../core/platformNews';

const EMPTY_FORM = {
  title: '',
  body: '',
  date: new Date().toISOString().slice(0, 10),
  isNew: true,
  sortOrder: 100,
  expiresAt: '',
};

/**
 * إدارة أخبار المنصة — Firebase
 */
export default function AdminNewsManager({ notify }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchPlatformNewsAdmin();
      setItems(list);
    } catch {
      notify?.('تعذّر تحميل الأخبار', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    reload();
  }, [reload]);

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      body: item.body,
      date: item.date,
      isNew: !!item.isNew,
      sortOrder: item.sortOrder || 0,
      expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString().slice(0, 10) : '',
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      notify?.('العنوان والنص مطلوبان', 'error');
      return;
    }
    setSaving(true);
    try {
      await savePlatformNewsItem(editingId, {
        ...form,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : null,
      });
      notify?.(editingId ? '✅ تم التحديث' : '✅ تم النشر', 'success');
      resetForm();
      await reload();
    } catch (e) {
      notify?.(e.message || 'فشل الحفظ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('حذف هذا الخبر؟')) return;
    try {
      await deletePlatformNewsItem(id);
      notify?.('تم الحذف', 'success');
      if (editingId === id) resetForm();
      await reload();
    } catch {
      notify?.('تعذّر الحذف', 'error');
    }
  };

  return (
    <div className="admin-content-block">
      <div className="admin-pulse-card">
        <div className="admin-pulse-card__head">
          <span aria-hidden>📰</span>
          <strong>{editingId ? 'تعديل خبر' : 'خبر جديد'}</strong>
        </div>

        <div className="admin-form-grid">
          <label className="admin-form-field">
            <span>العنوان</span>
            <input
              className="inp"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={120}
              placeholder="عنوان الخبر"
            />
          </label>
          <label className="admin-form-field">
            <span>التاريخ</span>
            <input
              className="inp"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </label>
          <label className="admin-form-field admin-form-field--full">
            <span>النص</span>
            <textarea
              className="inp admin-form-textarea"
              rows={4}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              maxLength={2000}
              placeholder="تفاصيل الخبر للمستخدمين"
            />
          </label>
          <label className="admin-form-check">
            <input
              type="checkbox"
              checked={form.isNew}
              onChange={(e) => setForm((f) => ({ ...f, isNew: e.target.checked }))}
            />
            <span>شارة «جديد»</span>
          </label>
          <label className="admin-form-field">
            <span>ترتيب العرض</span>
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
        </div>

        <div className="admin-mkt-actions">
          <button type="button" className="btn btn--gold" disabled={saving} onClick={handleSave}>
            {saving ? 'جاري الحفظ…' : editingId ? 'حفظ التعديل' : 'نشر الخبر'}
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
          <strong>الأخبار المنشورة</strong>
          <span className="admin-pulse-card__count">{items.length}</span>
        </div>

        {loading ? (
          <p className="admin-pulse-empty">جاري التحميل…</p>
        ) : !items.length ? (
          <p className="admin-pulse-empty">لا توجد أخبار في Firebase — يُعرض المحتوى الافتراضي للمستخدمين.</p>
        ) : (
          <ul className="admin-pulse-list">
            {items.map((item) => (
              <li key={item.id} className="admin-news-row">
                <div className="admin-news-row__main">
                  <strong>{item.title}</strong>
                  <span className="admin-news-row__date">{formatVoiceNewsDate(item.date)}</span>
                </div>
                <p className="admin-news-row__body">{item.body.slice(0, 120)}{item.body.length > 120 ? '…' : ''}</p>
                <div className="admin-news-row__actions">
                  {item.isNew ? <span className="admin-hub-badge admin-hub-badge--ready">جديد</span> : null}
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
