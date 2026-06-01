import { useRef, useState, useEffect } from 'react';
import { QB_CATEGORIES } from './qbank.helpers';
import {
  buildCustomPool,
  QB_CATEGORY_LABELS,
  QB_OPTION_LABELS,
  TRUE_FALSE_OPTIONS,
  getCorrectOptionIndex,
  optionLabel,
} from './questionSession';
import {
  QUMAIRI_SET_QUOTAS,
  poolStats,
} from '../games/fameeri/fameeriQuestionPool';
import {
  FAMEERI_IDEAL_SET_LABEL,
  FAMEERI_PLAYER_GROUP_OPTIONS,
  clampPlannedPlayerGroups,
  getFameeriGroupsAdvisory,
  getFameeriNeededForGroups,
  isPoolEnoughForGroups,
} from '../games/fameeri/fameeriQuestionSetup';
import {
  appendQuestionToPool,
  flattenSessionPool,
  mergeQuestionsIntoPool,
  removeQuestionFromPool,
  replaceQuestionInPool,
} from './customQuestionPool';
import {
  parseCustomQuestionsCsv,
  downloadCustomCsvTemplate,
} from './customQuestionCsv';

const EMPTY_DRAFT = () => ({
  question_text: '',
  type: 'multiple_choice',
  correct_answer: '',
  options: ['', '', '', ''],
  correctOptionIndex: null,
  category: 'general',
  difficulty_level: 'medium',
});

const DIFF_LABEL = { hard: 'شوزل', medium: 'أم صتمة', easy: 'نبيطة' };
const DIFF_COLOR = { hard: 'var(--red)', medium: 'var(--gold)', easy: 'var(--green)' };

function questionToDraft(q) {
  const options = [...(q.options || []), '', '', '', ''].slice(0, 4);
  const correctIdx =
    q.type === 'multiple_choice' ? getCorrectOptionIndex(options, q.correct_answer) : null;
  return {
    question_text: q.question_text || '',
    type: q.type || 'multiple_choice',
    correct_answer: q.correct_answer || '',
    options,
    correctOptionIndex: correctIdx >= 0 ? correctIdx : null,
    category: q.category || 'general',
    difficulty_level: q.difficulty_level || 'medium',
  };
}

function rowToPrepared(row) {
  let correct = row.correct_answer;
  let options = [];
  if (row.type === 'multiple_choice') {
    options = row.options.map((o) => o.trim()).filter(Boolean);
    if (row.correctOptionIndex != null && row.options[row.correctOptionIndex]?.trim()) {
      correct = row.options[row.correctOptionIndex].trim();
    }
  }
  return {
    question_text: row.question_text.trim(),
    type: row.type,
    options,
    correct_answer: correct,
    category: row.category,
    difficulty_level: row.difficulty_level || 'medium',
  };
}

function validateDraft(row) {
  if (!row.question_text.trim()) return 'اكتب نص السؤال';
  if (row.type === 'multiple_choice') {
    const opts = row.options.map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) return 'أضف خيارين على الأقل';
    if (row.correctOptionIndex == null) return '⚠️ حدّد الإجابة الصحيحة — لا يُحفظ السؤال بدونها';
    if (!row.options[row.correctOptionIndex]?.trim()) {
      return 'الخيار المحدّد كإجابة صحيحة فارغ — املأه أو غيّر الاختيار';
    }
  }
  if (row.type === 'open_question' && !row.correct_answer.trim()) {
    return '⚠️ اكتب الإجابة الصحيحة — لا يُحفظ السؤال بدونها';
  }
  if (row.type === 'true_false' && !row.correct_answer) {
    return '⚠️ اختر صح أو خطأ — لا يُحفظ السؤال بدون إجابة';
  }
  return null;
}

function correctAnswerHint(q) {
  if (q.type === 'multiple_choice' && q.options?.length) {
    const idx = getCorrectOptionIndex(q.options, q.correct_answer);
    if (idx >= 0) return `✓ ${optionLabel(idx)}: ${q.options[idx]}`;
    if (q.correct_answer) return `✓ ${q.correct_answer}`;
  }
  if (q.type === 'true_false' || q.type === 'open_question') {
    return q.correct_answer ? `✓ ${q.correct_answer}` : null;
  }
  return null;
}

export default function CustomQuestionBuilder({
  sessionPool,
  onSessionPoolChange,
  onApplySession,
  onSuggestSession,
  suggesting = false,
  applySuccess = false,
  onDismissSuccess,
  notify,
  isQumairi = true,
  perSetTotal = 18,
  initialPlannedGroups = 2,
}) {
  const [draft, setDraft] = useState(EMPTY_DRAFT());
  const [editingId, setEditingId] = useState(null);
  const [plannedGroups, setPlannedGroups] = useState(() =>
    clampPlannedPlayerGroups(initialPlannedGroups)
  );
  const [confirmApply, setConfirmApply] = useState(false);
  const [csvBusy, setCsvBusy] = useState(false);
  const csvRef = useRef(null);

  useEffect(() => {
    const hint = clampPlannedPlayerGroups(initialPlannedGroups);
    setPlannedGroups((prev) => (hint > prev ? hint : prev));
  }, [initialPlannedGroups]);

  const stats = poolStats(sessionPool);
  const saved = flattenSessionPool(sessionPool);
  const needed = getFameeriNeededForGroups(plannedGroups);
  const poolComplete = isPoolEnoughForGroups(sessionPool, plannedGroups);
  const groupsAdvisory = getFameeriGroupsAdvisory(sessionPool, plannedGroups);

  const notifyMsg = (msg, type) => {
    if (typeof notify === 'function') notify(msg, type);
  };

  const updateDraft = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const updateOption = (i, value) => {
    setDraft((d) => {
      const options = [...d.options];
      options[i] = value;
      return { ...d, options };
    });
  };

  const resetDraft = () => {
    setDraft(EMPTY_DRAFT());
    setEditingId(null);
  };

  const handleSaveQuestion = () => {
    const err = validateDraft(draft);
    if (err) {
      notifyMsg(err, 'error');
      return;
    }
    const pool = buildCustomPool([rowToPrepared(draft)]);
    if (!pool.length) {
      notifyMsg('تعذر حفظ السؤال', 'error');
      return;
    }
    if (editingId) {
      onSessionPoolChange(replaceQuestionInPool(sessionPool, editingId, pool[0]));
      notifyMsg('✅ تم تحديث السؤال', 'success');
    } else {
      onSessionPoolChange(appendQuestionToPool(sessionPool, pool[0]));
      notifyMsg('✅ أُضيف السؤال لبنك الجلسة', 'success');
    }
    resetDraft();
  };

  const startEdit = (q) => {
    setEditingId(q.id);
    setDraft(questionToDraft(q));
    notifyMsg('✏️ عدّل السؤال ثم اضغط «حفظ التعديل»', 'info');
  };

  const handleApplyClick = () => {
    if (!stats.total) {
      notifyMsg('أضف سؤالاً واحداً على الأقل للبنك المؤقت', 'error');
      return;
    }
    if (!poolComplete) {
      setConfirmApply(true);
      return;
    }
    onApplySession?.();
  };

  const handleCsvFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setCsvBusy(true);
    try {
      const text = await file.text();
      const rows = parseCustomQuestionsCsv(text);
      const valid = rows.filter((r) => !r.error);
      if (!valid.length) {
        notifyMsg('لم يُعثر على أسئلة صالحة في الملف', 'error');
        return;
      }
      const prepared = valid.map((r) => ({
        question_text: r.question_text,
        type: r.type || 'multiple_choice',
        options: r.options || [],
        correct_answer: r.correct_answer,
        category: r.category || 'general',
        difficulty_level: r.difficulty_level || 'medium',
      }));
      const poolItems = buildCustomPool(prepared);
      onSessionPoolChange(mergeQuestionsIntoPool(sessionPool, poolItems));
      notifyMsg(`✅ أُضيف ${poolItems.length} سؤال من الملف`, 'success');
    } catch (e) {
      notifyMsg(e?.message || 'تعذر قراءة الملف', 'error');
    } finally {
      setCsvBusy(false);
    }
  };

  return (
    <div className="custom-q-builder">
      <div className="custom-q-builder__intro card2">
        <strong>بنك مؤقت لهذه الجلسة</strong> — أسئلتك للعب مع مجموعاتك، منفصل عن البنك المركزي.
      </div>

      {isQumairi && (
        <div className="custom-q-builder__groups card2">
          <label className="ig" style={{ margin: 0 }}>
            <span className="lbl">👥 كم مجموعة ستُلعب؟</span>
            <select
              className="inp"
              value={plannedGroups}
              onChange={(e) => {
                setPlannedGroups(clampPlannedPlayerGroups(e.target.value));
                setConfirmApply(false);
              }}
            >
              {FAMEERI_PLAYER_GROUP_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'مجموعة' : 'مجموعات'}
                  {n >= 5 ? ' — فعالية كبيرة' : ''}
                </option>
              ))}
            </select>
            <span className="custom-q-builder__groups-hint">
              فرق المسابقة (2–6) — كل مجموعة بقائدها وتشاورها، وعدد أفرادها (1 أو 20) لا يُحسب هنا.
            </span>
          </label>
          <div className="custom-q-builder__ideal">
            ⭐ الموصى به لـ <strong>{plannedGroups} مجموعات</strong>:{' '}
            {needed.hard} صعب · {needed.medium} متوسط · {needed.easy} سهل ={' '}
            <strong>{needed.total} سؤالاً</strong>
            <span className="custom-q-builder__ideal-sub">
              (بالغالب 2–4 مجموعات · لكل فريق: {FAMEERI_IDEAL_SET_LABEL} = {perSetTotal})
            </span>
          </div>
        </div>
      )}

      <div className={`custom-q-builder__stats${poolComplete ? ' complete' : ''}`}>
        <div className="custom-q-builder__stats-main">
          <span className="custom-q-builder__stats-total">{stats.total}</span>
          <span className="custom-q-builder__stats-label">سؤال محفوظ</span>
          {isQumairi && (
            <span className="custom-q-builder__stats-target">/ {needed.total} مطلوب</span>
          )}
        </div>
        <div className="custom-q-builder__stats-breakdown">
          <span style={{ color: DIFF_COLOR.hard }}>
            {stats.hard.total}/{needed.hard} صعب
          </span>
          <span style={{ color: DIFF_COLOR.medium }}>
            {stats.medium.total}/{needed.medium} متوسط
          </span>
          <span style={{ color: DIFF_COLOR.easy }}>
            {stats.easy.total}/{needed.easy} سهل
          </span>
        </div>
      </div>

      {applySuccess && (
        <div className="custom-q-builder__success">
          <div>✅ بُنك الجلسة معتمد للمسابقة — {stats.total} سؤال جاهز</div>
          <button type="button" className="btn bgh bxs" onClick={onDismissSuccess}>
            فهمت
          </button>
        </div>
      )}

      {confirmApply && groupsAdvisory && (
        <div className="custom-q-builder__confirm card2">
          <div className="custom-q-builder__confirm-title">⚠️ العدد أقل من الموصى به</div>
          <p className="custom-q-builder__confirm-text">{groupsAdvisory}</p>
          <p className="custom-q-builder__confirm-text">هل تريد الاعتماد على أي حال؟</p>
          <div className="custom-q-builder__confirm-actions">
            <button
              type="button"
              className="btn bg bsm"
              onClick={() => {
                setConfirmApply(false);
                onApplySession?.();
              }}
            >
              ✅ نعم — اعتماد
            </button>
            <button type="button" className="btn bgh bsm" onClick={() => setConfirmApply(false)}>
              ↩️ راجع الأسئلة
            </button>
          </div>
        </div>
      )}

      {saved.length > 0 ? (
        <div className="custom-q-builder__saved card2">
          <div className="custom-q-builder__saved-head">
            <span className="lbl" style={{ margin: 0 }}>📚 أسئلتك المحفوظة ({saved.length})</span>
          </div>
          <div className="custom-q-builder__saved-list">
            {saved.map((q, i) => {
              const hint = correctAnswerHint(q);
              const isEditing = editingId === q.id;
              return (
                <div
                  key={q.id || i}
                  className={`custom-q-builder__saved-item${isEditing ? ' editing' : ''}`}
                >
                  <div className="custom-q-builder__saved-item-main">
                    <span
                      className="custom-q-builder__saved-badge"
                      style={{ color: DIFF_COLOR[q.difficulty_level] || 'var(--muted)' }}
                    >
                      {DIFF_LABEL[q.difficulty_level] || q.difficulty_level}
                    </span>
                    <span className="custom-q-builder__saved-text">{q.question_text}</span>
                    {hint && <span className="custom-q-builder__saved-answer">{hint}</span>}
                  </div>
                  <div className="custom-q-builder__saved-actions">
                    <button
                      type="button"
                      className="btn bgh bxs"
                      aria-label="تعديل"
                      onClick={() => startEdit(q)}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn br bxs"
                      aria-label="حذف"
                      onClick={() => {
                        if (editingId === q.id) resetDraft();
                        onSessionPoolChange(removeQuestionFromPool(sessionPool, q.id));
                        notifyMsg('🗑️ حُذف السؤال', 'success');
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="custom-q-builder__empty">لا توجد أسئلة بعد — أضف سؤالاً واحداً على الأقل</div>
      )}

      <div className="custom-q-builder__import">
        <button type="button" className="btn bgh bsm" disabled={csvBusy} onClick={() => csvRef.current?.click()}>
          📄 استيراد CSV / Excel
        </button>
        <button type="button" className="btn bgh bsm" onClick={downloadCustomCsvTemplate}>
          ⬇️ نموذج CSV
        </button>
        <span className="custom-q-builder__import-note">Excel: احفظ الورقة كـ CSV</span>
        <input ref={csvRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => void handleCsvFile(e)} />
      </div>

      <div className="custom-q-builder__form card2">
        <div className="custom-q-builder__form-title">
          {editingId ? '✏️ تعديل سؤال' : '➕ سؤال جديد'}
        </div>
        <div className="ig">
          <label className="lbl">نص السؤال</label>
          <textarea
            className="inp"
            rows={2}
            value={draft.question_text}
            onChange={(e) => updateDraft({ question_text: e.target.value })}
            placeholder="اكتب السؤال…"
          />
        </div>
        <div className="custom-q-builder__form-row">
          <label className="ig">
            <span className="lbl">النوع</span>
            <select
              className="inp"
              value={draft.type}
              onChange={(e) => updateDraft({ type: e.target.value, correctOptionIndex: null, correct_answer: '' })}
            >
              <option value="multiple_choice">اختيار من متعدد</option>
              <option value="true_false">صح أو خطأ</option>
              <option value="open_question">سؤال مفتوح</option>
            </select>
          </label>
          <label className="ig">
            <span className="lbl">التصنيف</span>
            <select className="inp" value={draft.category} onChange={(e) => updateDraft({ category: e.target.value })}>
              {QB_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{QB_CATEGORY_LABELS[cat] || cat}</option>
              ))}
            </select>
          </label>
          {isQumairi && (
            <label className="ig">
              <span className="lbl">الصعوبة / السلاح</span>
              <select
                className="inp"
                value={draft.difficulty_level}
                onChange={(e) => updateDraft({ difficulty_level: e.target.value })}
              >
                <option value="hard">صعب — شوزل</option>
                <option value="medium">متوسط — أم صتمة</option>
                <option value="easy">سهل — نبيطة</option>
              </select>
            </label>
          )}
        </div>

        {draft.type === 'multiple_choice' && (
          <div className="ig">
            <div className="lbl">خيارات الإجابة — اختر الإجابة الصحيحة من الراديو</div>
            <div className="custom-q-builder__options">
              {QB_OPTION_LABELS.map((label, index) => {
                const selected = draft.correctOptionIndex === index;
                return (
                  <label
                    key={label}
                    className={`custom-q-builder__option-pick${selected ? ' selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="custom-draft-correct"
                      checked={selected}
                      onChange={() => updateDraft({ correctOptionIndex: index })}
                    />
                    <span className="custom-q-builder__option-letter">{label}</span>
                    <input
                      className="inp"
                      value={draft.options[index]}
                      placeholder={`الخيار ${label}`}
                      onChange={(e) => updateOption(index, e.target.value)}
                    />
                    {selected && <span className="custom-q-builder__option-badge">✓ الصحيحة</span>}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {draft.type === 'true_false' && (
          <div className="ig">
            <label className="lbl">الإجابة الصحيحة</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {TRUE_FALSE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`btn ${draft.correct_answer === opt ? 'bg' : 'bgh'} bsm`}
                  style={{ flex: 1 }}
                  onClick={() => updateDraft({ correct_answer: opt })}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {draft.type === 'open_question' && (
          <div className="ig">
            <label className="lbl">الإجابة الصحيحة (للمشرف)</label>
            <input
              className="inp"
              value={draft.correct_answer}
              onChange={(e) => updateDraft({ correct_answer: e.target.value })}
              placeholder="الإجابة المعتمدة"
            />
          </div>
        )}

        <div className="custom-q-builder__form-actions">
          {editingId && (
            <button type="button" className="btn bgh bsm" onClick={resetDraft}>
              إلغاء
            </button>
          )}
          <button type="button" className="btn bg custom-q-builder__add-btn" onClick={handleSaveQuestion}>
            {editingId ? '💾 حفظ التعديل' : '➕ أضف للبنك المؤقت'}
          </button>
        </div>
      </div>

      <div className="custom-q-builder__footer">
        <button type="button" className="btn bg" disabled={!stats.total} onClick={handleApplyClick}>
          ✅ اعتماد للمسابقة ({stats.total})
        </button>
        <button
          type="button"
          className="btn bb"
          disabled={suggesting || !stats.total}
          onClick={() => void onSuggestSession?.()}
        >
          {suggesting ? '⏳…' : `📤 إرسال ${stats.total} كمقترح (اختياري)`}
        </button>
      </div>
      <p className="custom-q-builder__footer-note">
        «أضف للبنك» يحفظ السؤال فوراً في القائمة أعلاه. «اعتماد للمسابقة» يربط البنك باللعبة — يمكنك
        متابعة الإضافة بعد الاعتماد.
      </p>
    </div>
  );
}
