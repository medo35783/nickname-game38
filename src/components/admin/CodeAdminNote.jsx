import { useState } from 'react';
import { db, ref, update } from '../../core/firebaseHelpers';

/**
 * ملاحظة داخلية للأدمن على كود اشتراك (اسم عميل / مناسبة)
 */
export default function CodeAdminNote({ codeId, initialNote = '', notify }) {
  const [note, setNote] = useState(initialNote || '');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const handleSave = async () => {
    if (!codeId || saving) return;
    setSaving(true);
    try {
      const trimmed = note.trim().slice(0, 200);
      await update(ref(db, `codes/${codeId}`), {
        adminNote: trimmed || null,
      });
      setNote(trimmed);
      setDirty(false);
      notify?.('تم حفظ الملاحظة', 'success');
    } catch (err) {
      console.error(err);
      notify?.('تعذّر حفظ الملاحظة', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="code-admin-note">
      <label className="lbl" htmlFor={`admin-note-${codeId}`}>
        📝 ملاحظة داخلية (عميل / مناسبة)
      </label>
      <div className="code-admin-note__row">
        <input
          id={`admin-note-${codeId}`}
          className="inp"
          placeholder="مثال: مدرسة الأمل — اليوم الوطني"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setDirty(true);
          }}
          maxLength={200}
        />
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
    </div>
  );
}
