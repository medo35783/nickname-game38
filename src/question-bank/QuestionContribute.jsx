import { useEffect, useMemo, useState } from 'react';
import { auth } from '../firebase';
import {
  submitCommunityQuestion,
  fetchBankStats,
} from './qbank.helpers';
import { TYPE_LABELS } from './qbank.labels';
import MyContributions from './MyContributions';
import GameTopNav from '../shared/GameTopNav';
import '../styles/knowledge-chest.css';

const TRUE_FALSE_OPTIONS = ['صح', 'خطأ'];
const OPTION_LABELS = ['أ', 'ب', 'ج', 'د'];

/** أنواع يختارها المساهم — التصنيف واللعبة يحددهما الأدمن */
const CONTRIBUTOR_TYPES = ['multiple_choice', 'true_false', 'open_question', 'written_text'];

const EMPTY_FORM = {
  question_text: '',
  correct_answer: '',
  supervisor_notes: '',
  type: '',
  options: ['', '', '', ''],
  correctOptionIndex: null,
};

function buildPayload(form) {
  const type = form.type;
  const options = type === 'multiple_choice'
    ? form.options.map((o) => o.trim()).filter(Boolean)
    : [];
  const correctAnswer = type === 'multiple_choice'
    ? options[form.correctOptionIndex] || ''
    : type === 'written_text'
      ? ''
      : form.correct_answer.trim();

  return {
    question_text: form.question_text.trim(),
    correct_answer: correctAnswer,
    supervisor_notes: type === 'written_text' ? form.supervisor_notes.trim() : '',
    type,
    options,
    tags: [],
    category: '',
    difficulty_level: '',
    audience: '',
    gameTypes: [],
    needs_admin_classification: true,
  };
}

function validatePayload(payload) {
  if (!payload.question_text) return 'اكتب نص السؤال';
  if (!payload.type) return 'اختر نوع السؤال';

  if (payload.type === 'multiple_choice') {
    const opts = payload.options.filter(Boolean);
    if (opts.length !== 4) return 'أدخل الخيارات الأربعة';
    if (!payload.correct_answer) return 'حدّد الإجابة الصحيحة';
  } else if (payload.type === 'true_false') {
    if (!TRUE_FALSE_OPTIONS.includes(payload.correct_answer)) return 'اختر صح أو خطأ';
  } else if (payload.type === 'open_question') {
    if (!payload.correct_answer) return 'اكتب الإجابة الصحيحة';
  }

  return null;
}

export default function QuestionContribute({ notify, onBack, backLabel }) {
  const [view, setView] = useState('add');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bankTotal, setBankTotal] = useState(null);

  useEffect(() => {
    let active = true;
    fetchBankStats()
      .then((stats) => { if (active) setBankTotal(stats?.total ?? null); })
      .catch(() => {});
    return () => { active = false; };
  }, [success]);

  const contributorName = useMemo(() => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) return 'مشارك';
    return user.displayName?.trim() || user.email?.split('@')[0] || 'مشارك';
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = buildPayload(form);
    const err = validatePayload(payload);
    if (err) {
      notify(err, 'error');
      return;
    }

    setSaving(true);
    try {
      await submitCommunityQuestion(payload, {
        uid: auth.currentUser?.uid || null,
        name: contributorName,
      });
      setSuccess(true);
      notify('تم إرسال سؤالك للمراجعة', 'success');
    } catch (submitError) {
      notify(submitError?.message || 'تعذّر الإرسال', 'error');
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setSuccess(false);
    setForm(EMPTY_FORM);
    setView('add');
  }

  function selectType(type) {
    setForm((f) => ({
      ...f,
      type,
      correct_answer: type === 'true_false' ? '' : f.correct_answer,
      supervisor_notes: type === 'written_text' ? f.supervisor_notes : '',
      correctOptionIndex: null,
      options: type === 'multiple_choice' ? f.options : ['', '', '', ''],
    }));
  }

  if (success) {
    return (
      <div className="scr">
        {onBack ? <GameTopNav onBack={onBack} variant="arena" label={backLabel} /> : null}
        <div className="qbank-success">
          <div className="qbank-success__icon">✅</div>
          <div className="qbank-success__title">تم إرسال سؤالك</div>
          <p className="psub" style={{ marginTop: 10, maxWidth: 300, margin: '10px auto 0' }}>
            شكراً لمساهمتك
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 280, margin: '20px auto 0' }}>
            <button type="button" className="btn bg" onClick={resetForm}>
              اقتراح سؤال آخر
            </button>
            <button type="button" className="btn bgh" onClick={() => { setSuccess(false); setView('mine'); }}>
              مقترحاتي
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="scr">
      {onBack ? <GameTopNav onBack={onBack} variant="arena" label={backLabel} /> : null}

      <div className="qbank-page-head">
        <div className="qbank-page-head__glyph">📚</div>
        <div className="qbank-page-head__title">بنك المعرفة</div>
        <div className="qbank-page-head__sub">مساهمتك — تُراجع وتُضاف للألعاب</div>
        {bankTotal != null ? (
          <span className="qbank-page-head__count">{bankTotal} سؤال في البنك</span>
        ) : null}
      </div>

      <div className="tabs" style={{ marginBottom: 14 }}>
        <button type="button" className={`tab ${view === 'add' ? 'on' : ''}`} onClick={() => setView('add')}>
          اقتراح سؤال
        </button>
        <button type="button" className={`tab ${view === 'mine' ? 'on' : ''}`} onClick={() => setView('mine')}>
          مقترحاتي
        </button>
      </div>

      {view === 'mine' ? (
        <div className="card">
          <div className="ctitle">مقترحاتي</div>
          <MyContributions />
          <button type="button" className="btn bg mt2" onClick={() => setView('add')}>
            اقتراح سؤال جديد
          </button>
        </div>
      ) : (
        <form className="card" onSubmit={handleSubmit}>
          <label className="ig">
            <span className="lbl">السؤال</span>
            <textarea
              className="inp"
              rows={3}
              placeholder="اكتب السؤال هنا…"
              value={form.question_text}
              onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))}
              autoFocus
            />
          </label>

          <div className="ig">
            <span className="lbl">نوع السؤال</span>
            <div className="qbank-type-grid">
              {CONTRIBUTOR_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`qbank-type-btn${form.type === t ? ' is-on' : ''}`}
                  onClick={() => selectType(t)}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {form.type === 'open_question' && (
            <label className="ig">
              <span className="lbl">الإجابة الصحيحة</span>
              <input
                className="inp"
                placeholder="الإجابة التي يعتمدها المشرف"
                value={form.correct_answer}
                onChange={(e) => setForm((f) => ({ ...f, correct_answer: e.target.value }))}
              />
            </label>
          )}

          {form.type === 'true_false' && (
            <div className="ig">
              <span className="lbl">الإجابة الصحيحة</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {TRUE_FALSE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`btn bsm ${form.correct_answer === opt ? 'bg' : 'bgh'}`}
                    style={{ flex: 1 }}
                    onClick={() => setForm((f) => ({ ...f, correct_answer: opt }))}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.type === 'multiple_choice' && (
            <div className="ig">
              <span className="lbl">الخيارات — اضغط ✓ على الإجابة الصحيحة</span>
              {OPTION_LABELS.map((label, idx) => (
                <div key={label} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <span style={{ width: 18, fontWeight: 800, color: 'var(--gold)', fontSize: 12 }}>{label}</span>
                  <input
                    className="inp"
                    style={{ flex: 1 }}
                    placeholder={`الخيار ${label}`}
                    value={form.options[idx]}
                    onChange={(e) => {
                      const opts = [...form.options];
                      opts[idx] = e.target.value;
                      setForm((f) => ({ ...f, options: opts }));
                    }}
                  />
                  <button
                    type="button"
                    className={`btn bxs ${form.correctOptionIndex === idx ? 'bg' : 'bgh'}`}
                    onClick={() => setForm((f) => ({ ...f, correctOptionIndex: idx }))}
                    aria-label="إجابة صحيحة"
                  >
                    ✓
                  </button>
                </div>
              ))}
            </div>
          )}

          {form.type === 'written_text' && (
            <label className="ig">
              <span className="lbl">ملاحظات المشرف — إجابات متوقعة أو تعليق (لا يظهر للاعبين)</span>
              <textarea
                className="inp"
                rows={3}
                placeholder="مثال: ذئب، wolf — أو تعليق للمشرف فقط"
                value={form.supervisor_notes}
                onChange={(e) => setForm((f) => ({ ...f, supervisor_notes: e.target.value }))}
              />
            </label>
          )}

          <button type="submit" className="btn bg mt2" disabled={saving} style={{ width: '100%' }}>
            {saving ? 'جاري الإرسال…' : 'إرسال للمراجعة'}
          </button>
        </form>
      )}
    </div>
  );
}
