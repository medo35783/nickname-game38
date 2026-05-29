import { useState } from 'react';
import { fetchGameQuestionsAdvanced, QB_CATEGORIES, QB_DIFFICULTIES, QB_AUDIENCES } from './qbank.helpers';
import {
  QSOURCE,
  buildCustomPool,
  normalizeBankPool,
  QB_CATEGORY_LABELS,
  QB_DIFFICULTY_LABELS,
  QB_AUDIENCE_LABELS,
  TRUE_FALSE_OPTIONS,
} from './questionSession';

const EMPTY_CUSTOM_ROW = () => ({
  question_text: '',
  type: 'open_question',
  correct_answer: '',
  options: ['', '', '', ''],
  correctOptionIndex: null,
  category: 'general',
});

/**
 * إعداد مصدر الأسئلة قبل بدء اللعبة — مكوّن مشترك بين الألعاب.
 * عند الاعتماد يُرجع { source, pool } للأب (المخزون يبقى عند المشرف فقط).
 */
export default function QuestionSourceSetup({ gameType, accent = 'var(--gold)', onApply, onClose, notify }) {
  const [source, setSource] = useState(QSOURCE.BANK);
  const [bankMode, setBankMode] = useState('auto'); // auto | manual
  const [categories, setCategories] = useState([]);
  const [difficulty, setDifficulty] = useState('');
  const [audience, setAudience] = useState('');
  const [count, setCount] = useState(30);
  const [loading, setLoading] = useState(false);
  const [manualList, setManualList] = useState([]);
  const [manualSelected, setManualSelected] = useState({});
  const [customRows, setCustomRows] = useState([EMPTY_CUSTOM_ROW()]);

  const notifyMsg = (msg, type) => {
    if (typeof notify === 'function') notify(msg, type);
  };

  const toggleCategory = (cat) => {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const loadBank = async ({ forManual = false } = {}) => {
    setLoading(true);
    try {
      const fetched = await fetchGameQuestionsAdvanced({
        gameType,
        categories,
        difficulty_level: difficulty || undefined,
        audience: audience || undefined,
        count: forManual ? 300 : Math.max(1, parseInt(count, 10) || 30),
      });
      const pool = normalizeBankPool(fetched);
      if (forManual) {
        setManualList(pool);
        setManualSelected({});
        if (!pool.length) notifyMsg('لا توجد أسئلة مطابقة في البنك', 'info');
      } else {
        if (!pool.length) {
          notifyMsg('لا توجد أسئلة مطابقة في البنك', 'error');
          return;
        }
        onApply({ source: QSOURCE.BANK, pool });
        notifyMsg(`✅ تم تجهيز ${pool.length} سؤال من البنك`, 'success');
      }
    } catch {
      notifyMsg('تعذر تحميل الأسئلة من البنك', 'error');
    } finally {
      setLoading(false);
    }
  };

  const applyManual = () => {
    const pool = manualList.filter((q) => manualSelected[q.id]);
    if (!pool.length) {
      notifyMsg('اختر سؤالًا واحدًا على الأقل', 'error');
      return;
    }
    onApply({ source: QSOURCE.BANK, pool });
    notifyMsg(`✅ تم اعتماد ${pool.length} سؤال`, 'success');
  };

  const updateRow = (index, patch) => {
    setCustomRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const updateRowOption = (index, optIndex, value) => {
    setCustomRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const options = [...row.options];
        options[optIndex] = value;
        return { ...row, options };
      })
    );
  };

  const applyCustom = () => {
    const prepared = customRows
      .filter((row) => row.question_text.trim())
      .map((row) => {
        let correct = row.correct_answer;
        let options = [];
        if (row.type === 'multiple_choice') {
          options = row.options.map((o) => o.trim()).filter(Boolean);
          correct = row.correctOptionIndex != null ? row.options[row.correctOptionIndex] : '';
        }
        return {
          question_text: row.question_text,
          type: row.type,
          options,
          correct_answer: correct,
          category: row.category,
        };
      });

    const pool = buildCustomPool(prepared);
    if (!pool.length) {
      notifyMsg('اكتب سؤالًا واحدًا على الأقل', 'error');
      return;
    }
    onApply({ source: QSOURCE.CUSTOM, pool });
    notifyMsg(`✅ تم تجهيز ${pool.length} سؤال خاص بك`, 'success');
  };

  const applyExternal = () => {
    onApply({ source: QSOURCE.EXTERNAL, pool: [] });
    notifyMsg('✅ وضع بدون أسئلة — مؤقت وحسم يدوي فقط', 'success');
  };

  const sourceButton = (key, icon, title, sub) => (
    <button
      type="button"
      className={`btn ${source === key ? 'bg' : 'bgh'}`}
      style={{ flex: 1, minWidth: 100, padding: '10px 8px', flexDirection: 'column', gap: 2 }}
      onClick={() => setSource(key)}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 900 }}>{title}</span>
      <span style={{ fontSize: 9, opacity: 0.75 }}>{sub}</span>
    </button>
  );

  return (
    <div className="card" style={{ border: `1.5px solid ${accent}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="ctitle" style={{ margin: 0 }}>🧠 إعداد الأسئلة</div>
        {onClose && (
          <button type="button" className="btn bgh bxs" style={{ width: 'auto' }} onClick={onClose}>
            إغلاق
          </button>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', margin: '4px 0 10px', lineHeight: 1.55 }}>
        اختر مصدر الأسئلة لهذه الجلسة. تُحسم الإجابة من المشرف، والإجابة الصحيحة تبقى عندك فقط.
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {sourceButton(QSOURCE.BANK, '🏦', 'البنك', 'أسئلة جاهزة')}
        {sourceButton(QSOURCE.CUSTOM, '✍️', 'أكتب بنفسي', 'أسئلتك الخاصة')}
        {sourceButton(QSOURCE.EXTERNAL, '⏱️', 'الأسئلة معي', 'بدون عرض')}
      </div>

      {source === QSOURCE.BANK && (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <button
              type="button"
              className={`btn ${bankMode === 'auto' ? 'bg' : 'bgh'} bsm`}
              style={{ flex: 1 }}
              onClick={() => setBankMode('auto')}
            >
              تلقائي حسب التصنيف
            </button>
            <button
              type="button"
              className={`btn ${bankMode === 'manual' ? 'bg' : 'bgh'} bsm`}
              style={{ flex: 1 }}
              onClick={() => setBankMode('manual')}
            >
              يدوي — أختار بنفسي
            </button>
          </div>

          <div className="ig">
            <label className="lbl">التصنيفات (اتركها فارغة = الكل)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {QB_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`btn ${categories.includes(cat) ? 'bg' : 'bgh'} bxs`}
                  style={{ width: 'auto' }}
                  onClick={() => toggleCategory(cat)}
                >
                  {QB_CATEGORY_LABELS[cat] || cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label className="ig" style={{ flex: 1, minWidth: 120 }}>
              <span className="lbl">الصعوبة</span>
              <select className="inp" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="">الكل</option>
                {QB_DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{QB_DIFFICULTY_LABELS[d] || d}</option>
                ))}
              </select>
            </label>
            <label className="ig" style={{ flex: 1, minWidth: 120 }}>
              <span className="lbl">الفئة</span>
              <select className="inp" value={audience} onChange={(e) => setAudience(e.target.value)}>
                <option value="">الكل</option>
                {QB_AUDIENCES.map((a) => (
                  <option key={a} value={a}>{QB_AUDIENCE_LABELS[a] || a}</option>
                ))}
              </select>
            </label>
            {bankMode === 'auto' && (
              <label className="ig" style={{ width: 90 }}>
                <span className="lbl">العدد</span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  className="inp"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                />
              </label>
            )}
          </div>

          {bankMode === 'auto' ? (
            <button type="button" className="btn bg mt2" disabled={loading} onClick={() => void loadBank()}>
              {loading ? '⏳ جاري التحميل…' : '🏦 تجهيز الأسئلة من البنك'}
            </button>
          ) : (
            <>
              <button type="button" className="btn bb mt2" disabled={loading} onClick={() => void loadBank({ forManual: true })}>
                {loading ? '⏳ جاري التحميل…' : '🔎 جلب الأسئلة المطابقة'}
              </button>
              {!!manualList.length && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                    اختر الأسئلة ({Object.values(manualSelected).filter(Boolean).length} / {manualList.length})
                  </div>
                  <div style={{ maxHeight: 220, overflowY: 'auto', display: 'grid', gap: 6 }}>
                    {manualList.map((q) => {
                      const checked = !!manualSelected[q.id];
                      return (
                        <label
                          key={q.id}
                          className="card2"
                          style={{
                            margin: 0,
                            display: 'flex',
                            gap: 8,
                            alignItems: 'flex-start',
                            cursor: 'pointer',
                            borderColor: checked ? accent : 'var(--border-faint)',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setManualSelected((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                            style={{ marginTop: 3 }}
                          />
                          <span style={{ fontSize: 12, lineHeight: 1.5 }}>
                            {q.question_text}
                            <span style={{ display: 'block', fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>
                              {QB_CATEGORY_LABELS[q.category] || q.category}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <button type="button" className="btn bg mt2" onClick={applyManual}>
                    ✅ اعتماد المختار
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {source === QSOURCE.CUSTOM && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
            جهّز قائمة أسئلتك قبل بدء اللعبة. لأسئلة التمثيل اختر تصنيف «تمثيل وأمثال» وستبقى عند المشرف فقط.
          </div>
          {customRows.map((row, index) => (
            <div key={index} className="card2" style={{ marginBottom: 8 }}>
              <div className="ig">
                <label className="lbl">السؤال {index + 1}</label>
                <textarea
                  className="inp"
                  rows={2}
                  value={row.question_text}
                  onChange={(e) => updateRow(index, { question_text: e.target.value })}
                  placeholder="اكتب نص السؤال…"
                />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <label className="ig" style={{ flex: 1, minWidth: 120 }}>
                  <span className="lbl">النوع</span>
                  <select
                    className="inp"
                    value={row.type}
                    onChange={(e) => updateRow(index, { type: e.target.value, correctOptionIndex: null, correct_answer: '' })}
                  >
                    <option value="open_question">سؤال مفتوح</option>
                    <option value="true_false">صح أو خطأ</option>
                    <option value="multiple_choice">اختيار من متعدد</option>
                  </select>
                </label>
                <label className="ig" style={{ flex: 1, minWidth: 120 }}>
                  <span className="lbl">التصنيف</span>
                  <select className="inp" value={row.category} onChange={(e) => updateRow(index, { category: e.target.value })}>
                    {QB_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{QB_CATEGORY_LABELS[cat] || cat}</option>
                    ))}
                  </select>
                </label>
              </div>

              {row.type === 'open_question' && (
                <div className="ig">
                  <label className="lbl">الإجابة الصحيحة (تظهر للمشرف فقط)</label>
                  <input
                    className="inp"
                    value={row.correct_answer}
                    onChange={(e) => updateRow(index, { correct_answer: e.target.value })}
                    placeholder="الإجابة المعتمدة"
                  />
                </div>
              )}
              {row.type === 'true_false' && (
                <div className="ig">
                  <label className="lbl">الإجابة الصحيحة</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {TRUE_FALSE_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`btn ${row.correct_answer === opt ? 'bg' : 'bgh'} bsm`}
                        style={{ flex: 1 }}
                        onClick={() => updateRow(index, { correct_answer: opt })}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {row.type === 'multiple_choice' && (
                <div className="ig">
                  <label className="lbl">الخيارات — اختر الصحيح</label>
                  {row.options.map((opt, optIndex) => (
                    <div key={optIndex} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
                      <input
                        type="radio"
                        name={`mc-${index}`}
                        checked={row.correctOptionIndex === optIndex}
                        onChange={() => updateRow(index, { correctOptionIndex: optIndex })}
                      />
                      <input
                        className="inp"
                        value={opt}
                        onChange={(e) => updateRowOption(index, optIndex, e.target.value)}
                        placeholder={`خيار ${optIndex + 1}`}
                        style={{ flex: 1 }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {customRows.length > 1 && (
                <button
                  type="button"
                  className="btn br bxs"
                  style={{ width: 'auto' }}
                  onClick={() => setCustomRows((prev) => prev.filter((_, i) => i !== index))}
                >
                  حذف السؤال
                </button>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn bgh"
              style={{ flex: 1 }}
              onClick={() => setCustomRows((prev) => [...prev, EMPTY_CUSTOM_ROW()])}
            >
              ➕ سؤال آخر
            </button>
            <button type="button" className="btn bg" style={{ flex: 1 }} onClick={applyCustom}>
              ✅ اعتماد القائمة
            </button>
          </div>
        </div>
      )}

      {source === QSOURCE.EXTERNAL && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 10 }}>
            ستلعبون بدون عرض أسئلة على الشاشة. المشرف يطرح أسئلته بنفسه، وتظهر فقط شاشة المؤقت
            وأزرار «صح / خطأ» (واختيار المجموعة الفائزة في وضع الأسرع).
          </div>
          <button type="button" className="btn bg" onClick={applyExternal}>
            ✅ اعتماد — بدون أسئلة على الشاشة
          </button>
        </div>
      )}
    </div>
  );
}
