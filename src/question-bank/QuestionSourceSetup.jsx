import { useState, useEffect } from 'react';
import { fetchGameQuestionsAdvanced, fetchGameAvailableCategories, suggestQuestion, QB_DIFFICULTIES, QB_AUDIENCES } from './qbank.helpers';
import {
  QSOURCE,
  normalizeBankPool,
  QB_CATEGORY_LABELS,
  QB_DIFFICULTY_LABELS,
  QB_AUDIENCE_LABELS,
} from './questionSession';
import {
  QUMAIRI_SET_QUOTAS,
  bankFilterKey,
  buildSessionPoolFromBank,
  countCompleteBankSets,
  partitionByDifficulty,
  normalizePoolToStructured,
  poolStats,
  weaponQuotaHint,
} from '../games/fameeri/fameeriQuestionPool';
import { FAMEERI_IDEAL_SET_LABEL } from '../games/fameeri/fameeriQuestionSetup';
import {
  loadUsedQuestionIds,
  clearUsedQuestionIds,
  isRegisteredHost,
} from '../games/fameeri/fameeriBankProgress';
import {
  loadUsedHesbahQuestionIds,
  clearUsedHesbahQuestionIds,
} from '../games/hesbah/hesbahBankProgress';
import { hesbahBankFilterKey } from '../games/hesbah/hesbahHelpers';
import CustomQuestionBuilder from './CustomQuestionBuilder';
import { flattenSessionPool } from './customQuestionPool';

/**
 * إعداد مصدر الأسئلة قبل بدء اللعبة — مكوّن مشترك بين الألعاب.
 * عند الاعتماد يُرجع { source, pool } للأب (المخزون يبقى عند المشرف فقط).
 */
export default function QuestionSourceSetup({
  gameType,
  accent = 'var(--gold)',
  onApply,
  onClose,
  notify,
  authUid = null,
  onGoAccount,
  initialSource = null,
  initialPoolStructured = null,
  initialPlannedGroups = 2,
  initialCount = 30,
}) {
  const [source, setSource] = useState(initialSource || QSOURCE.BANK);
  const [bankMode, setBankMode] = useState('auto'); // auto | manual
  const [categories, setCategories] = useState([]);
  const [difficulty, setDifficulty] = useState('');
  const [audience, setAudience] = useState('');
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [bankPreview, setBankPreview] = useState(null);
  const [hesbahReplayMode, setHesbahReplayMode] = useState('new');
  const [hesbahBankStats, setHesbahBankStats] = useState(null);
  const [manualList, setManualList] = useState([]);
  const [manualSelected, setManualSelected] = useState({});
  const [customSessionPool, setCustomSessionPool] = useState(() =>
    normalizePoolToStructured(initialPoolStructured || {})
  );
  const [customApplySuccess, setCustomApplySuccess] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [setsToTake, setSetsToTake] = useState(1);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    if (initialSource) setSource(initialSource);
  }, [initialSource]);

  useEffect(() => {
    if (initialPoolStructured) {
      setCustomSessionPool(normalizePoolToStructured(initialPoolStructured));
    }
  }, [initialPoolStructured]);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const isQumairi = gameType === 'qumayri';
  const isHesbah = gameType === 'hesbah';

  useEffect(() => {
    if (source !== QSOURCE.BANK || !gameType) {
      setAvailableCategories([]);
      return undefined;
    }

    let cancelled = false;
    setLoadingCategories(true);

    void fetchGameAvailableCategories({ gameType, audience: audience || undefined })
      .then((rows) => {
        if (cancelled) return;
        setAvailableCategories(rows);
        const allowed = new Set(rows.map((row) => row.id));
        setCategories((prev) => prev.filter((cat) => allowed.has(cat)));
      })
      .catch(() => {
        if (!cancelled) setAvailableCategories([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCategories(false);
      });

    return () => {
      cancelled = true;
    };
  }, [source, gameType, audience]);

  useEffect(() => {
    if (!isHesbah || source !== QSOURCE.BANK) {
      setHesbahBankStats(null);
      return undefined;
    }

    let cancelled = false;
    const filterKey = hesbahBankFilterKey({ categories, audience, difficulty });

    void (async () => {
      try {
        const fetched = await fetchGameQuestionsAdvanced({
          gameType,
          categories,
          difficulty_level: difficulty || undefined,
          audience: audience || undefined,
          count: 500,
        });
        if (cancelled) return;
        const pool = normalizeBankPool(fetched);
        const usedIds = await loadUsedHesbahQuestionIds(filterKey);
        if (cancelled) return;
        const usedSet = new Set(usedIds);
        const freshCount = pool.filter((q) => !usedSet.has(q.id)).length;
        setHesbahBankStats({
          filterKey,
          usedCount: usedIds.length,
          freshCount,
          totalMatching: pool.length,
        });
      } catch {
        if (!cancelled) setHesbahBankStats(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isHesbah, source, gameType, categories, audience, difficulty]);

  const registered = isRegisteredHost();
  const perSetTotal = QUMAIRI_SET_QUOTAS.hard + QUMAIRI_SET_QUOTAS.medium + QUMAIRI_SET_QUOTAS.easy;

  const notifyMsg = (msg, type) => {
    if (typeof notify === 'function') notify(msg, type);
  };

  const toggleCategory = (cat) => {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const fetchBankQuestions = async ({ forManual = false, fetchCount } = {}) => {
    const defaultCount = isQumairi ? 500 : forManual ? 300 : Math.max(1, parseInt(count, 10) || 30);
    const fetched = await fetchGameQuestionsAdvanced({
      gameType,
      categories,
      difficulty_level: isQumairi ? undefined : difficulty || undefined,
      audience: audience || undefined,
      count: fetchCount ?? defaultCount,
    });
    return normalizeBankPool(fetched);
  };

  const previewBankSets = async () => {
    if (!isQumairi) return;
    setLoading(true);
    try {
      const pool = await fetchBankQuestions();
      const filterKey = bankFilterKey({ categories, audience });
      const usedIds = await loadUsedQuestionIds(filterKey);
      const buckets = partitionByDifficulty(pool, usedIds);
      const setCount = countCompleteBankSets(buckets);
      setBankPreview({
        filterKey,
        setCount,
        usedCount: usedIds.length,
        hard: buckets.hard.length,
        medium: buckets.medium.length,
        easy: buckets.easy.length,
      });
      if (setsToTake > setCount) setSetsToTake(Math.max(1, setCount));
      if (!setCount) {
        notifyMsg('لا توجد مجموعة كاملة جديدة — أضف أسئلة أو امسح سجل الاستخدام', 'error');
      }
    } catch {
      notifyMsg('تعذر معاينة البنك', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadBank = async ({ forManual = false } = {}) => {
    setLoading(true);
    try {
      const pool = await fetchBankQuestions({
        forManual,
        fetchCount: isHesbah && !forManual ? 500 : undefined,
      });
      if (forManual) {
        setManualList(pool);
        setManualSelected({});
        if (!pool.length) notifyMsg('لا توجد أسئلة مطابقة في البنك', 'info');
        return;
      }

      if (isQumairi) {
        const filterKey = bankFilterKey({ categories, audience });
        const usedIds = await loadUsedQuestionIds(filterKey);
        const take = Math.max(1, parseInt(setsToTake, 10) || 1);
        const built = buildSessionPoolFromBank(pool, { usedIds, setsToTake: take });
        if (!built.setsTaken) {
          notifyMsg(
            `لا توجد مجموعة جديدة كاملة (تحتاج ${QUMAIRI_SET_QUOTAS.hard} صعب + ${QUMAIRI_SET_QUOTAS.medium} متوسط + ${QUMAIRI_SET_QUOTAS.easy} سهل)`,
            'error'
          );
          setBankPreview({
            filterKey,
            setCount: built.setCount,
            usedCount: usedIds.length,
            hard: built.shortages?.hard,
            medium: built.shortages?.medium,
            easy: built.shortages?.easy,
          });
          return;
        }
        onApply({
          source: QSOURCE.BANK,
          poolStructured: built.poolStructured,
          bankMeta: { filterKey, setCount: built.setCount, setsTaken: built.setsTaken },
        });
        const qTotal = built.setsTaken * perSetTotal;
        notifyMsg(
          built.setsTaken > 1
            ? `✅ ${built.setsTaken} مجموعات (${qTotal} سؤال) — يتبقى ${built.setCount} مجموعة في البنك`
            : `✅ مجموعة مسابقة جديدة (${perSetTotal} سؤال) — يتبقى ${built.setCount} مجموعة في البنك`,
          'success'
        );
        return;
      }

      if (!pool.length) {
        notifyMsg('لا توجد أسئلة مطابقة في البنك', 'error');
        return;
      }

      if (isHesbah) {
        const filterKey = hesbahBankFilterKey({ categories, audience, difficulty });
        let sessionPool = pool;

        if (hesbahReplayMode === 'new') {
          const usedIds = await loadUsedHesbahQuestionIds(filterKey);
          const usedSet = new Set(usedIds);
          sessionPool = pool.filter((q) => !usedSet.has(q.id));
          if (!sessionPool.length) {
            notifyMsg(
              'استُنفذت الأسئلة الجديدة لهذا التصنيف — اختر «إعادة السابقة» أو امسح السجل ♻️',
              'error'
            );
            return;
          }
        }

        const want = Math.max(1, parseInt(count, 10) || 30);
        if (sessionPool.length < want) {
          notifyMsg(`⚠️ متاح ${sessionPool.length} سؤال فقط — سيتم استخدامها كلها`, 'gold');
        }
        sessionPool = sessionPool.slice(0, want);

        onApply({
          source: QSOURCE.BANK,
          pool: sessionPool,
          bankMeta: { filterKey, replayMode: hesbahReplayMode },
        });
        notifyMsg(`✅ تم تجهيز ${sessionPool.length} سؤال من البنك`, 'success');
        return;
      }

      onApply({ source: QSOURCE.BANK, pool });
      notifyMsg(`✅ تم تجهيز ${pool.length} سؤال من البنك`, 'success');
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
    if (isQumairi) {
      onApply({ source: QSOURCE.BANK, poolStructured: normalizePoolToStructured(pool) });
    } else {
      onApply({ source: QSOURCE.BANK, pool });
    }
    notifyMsg(`✅ تم اعتماد ${pool.length} سؤال`, 'success');
    const s = poolStats(normalizePoolToStructured(pool));
    if (
      isQumairi &&
      (s.total < perSetTotal ||
        s.hard.total < QUMAIRI_SET_QUOTAS.hard ||
        s.medium.total < QUMAIRI_SET_QUOTAS.medium ||
        s.easy.total < QUMAIRI_SET_QUOTAS.easy)
    ) {
      notifyMsg(`💡 الموصى به ${FAMEERI_IDEAL_SET_LABEL} — يمكنك المتابعة`, 'gold');
    }
  };

  const applyCustomSession = () => {
    const total = poolStats(customSessionPool).total;
    if (!total) {
      notifyMsg('أضف سؤالاً واحداً على الأقل للبنك المؤقت', 'error');
      return;
    }
    onApply({
      source: QSOURCE.CUSTOM,
      poolStructured: customSessionPool,
      keepOpen: true,
    });
    setCustomApplySuccess(true);
    const s = poolStats(customSessionPool);
    const advisory =
      s.total >= perSetTotal &&
      s.hard.total >= QUMAIRI_SET_QUOTAS.hard &&
      s.medium.total >= QUMAIRI_SET_QUOTAS.medium &&
      s.easy.total >= QUMAIRI_SET_QUOTAS.easy
        ? null
        : FAMEERI_IDEAL_SET_LABEL;
    notifyMsg(
      advisory
        ? `✅ بُنك الجلسة معتمد (${total} سؤال) — الموصى به: ${advisory}`
        : `✅ بُنك الجلسة معتمد — ${total} سؤال جاهز للمسابقة`,
      advisory ? 'gold' : 'success'
    );
  };

  const submitCustomSessionAsSuggestions = () => {
    const saved = flattenSessionPool(customSessionPool);
    if (!saved.length) {
      notifyMsg('أضف أسئلة للبنك المؤقت أولاً', 'error');
      return;
    }
    setSuggesting(true);
    void (async () => {
      try {
        for (const q of saved) {
          await suggestQuestion({
            question_text: q.question_text,
            type: q.type,
            options: q.options || [],
            correct_answer: q.correct_answer,
            category: q.category || 'general',
            difficulty_level: q.difficulty_level || 'medium',
            audience: 'general',
            gameTypes: [gameType],
          });
        }
        notifyMsg(`✅ أُرسل ${saved.length} سؤال كمقترح — سيراجعها الـ admin`, 'success');
      } catch {
        notifyMsg('تعذر إرسال المقترحات', 'error');
      } finally {
        setSuggesting(false);
      }
    })();
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
        {sourceButton(QSOURCE.BANK, '🏦', 'البنك', 'أسئلة مركزية جاهزة')}
        {sourceButton(QSOURCE.CUSTOM, '✍️', 'أكتب بنفسي', 'بنك مؤقت للجلسة')}
        {sourceButton(QSOURCE.EXTERNAL, '⏱️', 'الأسئلة معي', 'بدون عرض')}
      </div>

      {source === QSOURCE.BANK && (
        <div>
          {isQumairi && (
            <div
              className="card2"
              style={{ marginBottom: 10, padding: 10, fontSize: 11, lineHeight: 1.6, color: 'var(--muted)' }}
            >
              <strong style={{ color: 'var(--text)' }}>مجموعة المسابقة الواحدة:</strong>{' '}
              {QUMAIRI_SET_QUOTAS.hard} صعب (شوزل) + {QUMAIRI_SET_QUOTAS.medium} متوسط (أم صتمة) +{' '}
              {QUMAIRI_SET_QUOTAS.easy} سهل (نبيطة) = {perSetTotal} سؤالاً.
              <br />
              يُسجَّل السؤال في سجلك <strong>عند عرضه فقط</strong> — إذا توقفت قبل النهاية، الأسئلة التي لم تظهر
              تبقى متاحة في مسابقة لاحقة.
              <br />
              <span style={{ fontSize: 10 }}>{weaponQuotaHint()}</span>
            </div>
          )}

          {isQumairi && !registered && (
            <div
              className="card2"
              style={{
                marginBottom: 10,
                padding: 10,
                fontSize: 11,
                lineHeight: 1.65,
                border: '1px solid var(--gold)',
                background: 'rgba(212,175,55,0.06)',
              }}
            >
              <div style={{ fontWeight: 800, color: 'var(--gold)', marginBottom: 4 }}>
                🔐 لماذا التسجيل مهم؟
              </div>
              <div style={{ color: 'var(--muted)' }}>
                السجل حالياً على هذا الجهاز فقط.{' '}
                <strong style={{ color: 'var(--text)' }}>سجّل دخولك من «حسابي»</strong> ليُحفظ سجل الأسئلة
                ومخزون المسابقة على حسابك — لا تتكرر الأسئلة التي ظهرت، وتستكمل من أي جهاز إذا توقفت
                قبل النهاية.
              </div>
              {typeof onGoAccount === 'function' && (
                <button
                  type="button"
                  className="btn bg bsm mt2"
                  style={{ width: 'auto' }}
                  onClick={onGoAccount}
                >
                  👤 الذهاب إلى حسابي
                </button>
              )}
            </div>
          )}

          {isQumairi && registered && authUid && (
            <div
              className="card2"
              style={{ marginBottom: 10, padding: 8, fontSize: 10, color: 'var(--muted)', lineHeight: 1.55 }}
            >
              ✅ سجل الأسئلة ومخزون الجلسة (الأسئلة المتبقية وموقع التوقف) مربوطان بحسابك — يمكنك
              استكمال نفس الغرفة من جوال أو لابتوب بعد تسجيل الدخول.
            </div>
          )}
          {isHesbah && !registered && (
            <div
              className="card2"
              style={{
                marginBottom: 10,
                padding: 10,
                fontSize: 11,
                lineHeight: 1.65,
                border: `1px solid ${accent}`,
                background: 'rgba(230,81,0,0.06)',
              }}
            >
              <div style={{ fontWeight: 800, color: accent, marginBottom: 4 }}>🔐 سجل الأسئلة</div>
              <div style={{ color: 'var(--muted)' }}>
                بدون تسجيل، السجل على هذا الجهاز فقط.{' '}
                <strong style={{ color: 'var(--text)' }}>سجّل دخولك</strong> لحفظ الأسئلة التي ظهرت
                ومتابعة من أي جهاز دون تكرار.
              </div>
              {typeof onGoAccount === 'function' && (
                <button type="button" className="btn bg bsm mt2" style={{ width: 'auto' }} onClick={onGoAccount}>
                  👤 حسابي
                </button>
              )}
            </div>
          )}

          {isHesbah && registered && authUid && (
            <div
              className="card2"
              style={{ marginBottom: 10, padding: 8, fontSize: 10, color: 'var(--muted)', lineHeight: 1.55 }}
            >
              ✅ سجل أسئلتك مربوط بحسابك — نتجنّب تكرار ما ظهر سابقاً في جلساتك.
            </div>
          )}

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
            <label className="lbl">التصنيفات (اتركها فارغة = كل تصنيفات هذه اللعبة)</label>
            {loadingCategories ? (
              <div style={{ fontSize: 11, color: 'var(--muted)', padding: '6px 0' }}>جاري تحميل التصنيفات…</div>
            ) : availableCategories.length === 0 ? (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  padding: '8px 10px',
                  background: 'var(--surface)',
                  borderRadius: 8,
                  lineHeight: 1.6,
                }}
              >
                لا توجد أسئلة معتمدة مخصّصة لهذه اللعبة في البنك — راجع «الألعاب» عند إضافة الأسئلة.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {availableCategories.map(({ id: cat, count: catCount }) => (
                  <button
                    key={cat}
                    type="button"
                    className={`btn ${categories.includes(cat) ? 'bg' : 'bgh'} bxs`}
                    style={{ width: 'auto' }}
                    onClick={() => toggleCategory(cat)}
                  >
                    {QB_CATEGORY_LABELS[cat] || cat}
                    <span style={{ opacity: 0.75, marginRight: 4, fontSize: 9 }}>({catCount})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!isQumairi && (
              <label className="ig" style={{ flex: 1, minWidth: 120 }}>
                <span className="lbl">الصعوبة</span>
                <select className="inp" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  <option value="">الكل</option>
                  {QB_DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>{QB_DIFFICULTY_LABELS[d] || d}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="ig" style={{ flex: 1, minWidth: 120 }}>
              <span className="lbl">الفئة</span>
              <select className="inp" value={audience} onChange={(e) => setAudience(e.target.value)}>
                <option value="">الكل</option>
                {QB_AUDIENCES.map((a) => (
                  <option key={a} value={a}>{QB_AUDIENCE_LABELS[a] || a}</option>
                ))}
              </select>
            </label>
            {bankMode === 'auto' && !isQumairi && !isHesbah && (
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

          {isHesbah && bankMode === 'auto' && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.55 }}>
              سيتم تجهيز <strong style={{ color: 'var(--text)' }}>{count} سؤالاً</strong> حسب اختيارك في شاشة
              الإعداد.
            </div>
          )}

          {isHesbah && bankMode === 'auto' && hesbahBankStats && hesbahBankStats.usedCount > 0 && (
            <div className="card2" style={{ marginTop: 10, padding: 10, fontSize: 11 }}>
              <div style={{ fontWeight: 800, color: accent, marginBottom: 6 }}>📊 سجل أسئلتك</div>
              <div style={{ color: 'var(--muted)', lineHeight: 1.6, marginBottom: 8 }}>
                ظهرت سابقاً: {hesbahBankStats.usedCount} · جديدة متاحة: {hesbahBankStats.freshCount} ·
                الإجمالي في البنك: {hesbahBankStats.totalMatching}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn ${hesbahReplayMode === 'new' ? 'bg' : 'bgh'} bsm`}
                  style={{ flex: 1, minWidth: 130 }}
                  onClick={() => setHesbahReplayMode('new')}
                >
                  🆕 أسئلة جديدة
                </button>
                <button
                  type="button"
                  className={`btn ${hesbahReplayMode === 'repeat' ? 'bg' : 'bgh'} bsm`}
                  style={{ flex: 1, minWidth: 130 }}
                  onClick={() => setHesbahReplayMode('repeat')}
                >
                  🔁 إعادة السابقة
                </button>
              </div>
              {hesbahReplayMode === 'repeat' && (
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8, lineHeight: 1.55 }}>
                  💡 قد يتذكر اللاعبون الأسئلة — استخدم هذا إذا أردتم نفس المجموعة أو نفدت الأسئلة الجديدة.
                </div>
              )}
              {hesbahReplayMode === 'new' && hesbahBankStats.freshCount < parseInt(count, 10) && (
                <div style={{ fontSize: 10, color: 'var(--gold)', marginTop: 8, lineHeight: 1.55 }}>
                  ⚠️ الأسئلة الجديدة ({hesbahBankStats.freshCount}) أقل من العدد المطلوب ({count}) — سيُستخدم
                  المتاح أو امسح السجل لإعادة الكل.
                </div>
              )}
              <button
                type="button"
                className="btn br bsm mt2"
                style={{ width: '100%' }}
                onClick={() => {
                  const key = hesbahBankStats.filterKey;
                  void clearUsedHesbahQuestionIds(key).then(() => {
                    setHesbahReplayMode('new');
                    setHesbahBankStats((prev) =>
                      prev
                        ? { ...prev, usedCount: 0, freshCount: prev.totalMatching }
                        : null
                    );
                    notifyMsg('♻️ تم مسح السجل — كل الأسئلة متاحة من جديد', 'gold');
                  });
                }}
              >
                ♻️ مسح السجل وإعادة كل الأسئلة
              </button>
            </div>
          )}

          {isQumairi && bankPreview && (
            <div className="card2" style={{ marginTop: 8, padding: 10, fontSize: 11 }}>
              <div style={{ fontWeight: 800, color: 'var(--gold)' }}>
                📊 البنك: {bankPreview.setCount} مجموعة جديدة متاحة
              </div>
              <div style={{ color: 'var(--muted)', marginTop: 4 }}>
                غير مستخدمة: صعب {bankPreview.hard} · متوسط {bankPreview.medium} · سهل {bankPreview.easy}
                {bankPreview.usedCount > 0 && ` · ظهرت سابقاً: ${bankPreview.usedCount} سؤال`}
              </div>
              {bankPreview.setCount > 0 && (
                <label className="ig" style={{ marginTop: 8, marginBottom: 0 }}>
                  <span className="lbl">عدد المجموعات للسحب ({perSetTotal} سؤال لكل مجموعة)</span>
                  <select
                    className="inp"
                    value={Math.min(setsToTake, bankPreview.setCount)}
                    onChange={(e) => setSetsToTake(parseInt(e.target.value, 10) || 1)}
                  >
                    {Array.from({ length: Math.min(bankPreview.setCount, 10) }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'مجموعة' : 'مجموعات'} ({n * perSetTotal} سؤال)
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          {isQumairi && !bankPreview && bankMode === 'auto' && (
            <label className="ig" style={{ marginTop: 8 }}>
              <span className="lbl">عدد المجموعات (افتراضي 1 — {perSetTotal} سؤال)</span>
              <select className="inp" value={setsToTake} onChange={(e) => setSetsToTake(parseInt(e.target.value, 10) || 1)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'مجموعة' : 'مجموعات'}
                  </option>
                ))}
              </select>
            </label>
          )}

          {bankMode === 'auto' ? (
            <>
              {isQumairi && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn bgh bsm"
                    style={{ flex: 1, minWidth: 120 }}
                    disabled={loading}
                    onClick={() => void previewBankSets()}
                  >
                    {loading ? '⏳…' : '🔎 معاينة البنك'}
                  </button>
                  <button
                    type="button"
                    className="btn br bsm"
                    style={{ flex: 1, minWidth: 120 }}
                    onClick={() => {
                      const key = bankFilterKey({ categories, audience });
                      void clearUsedQuestionIds(key).then(() => {
                        setBankPreview(null);
                        notifyMsg('♻️ تم مسح سجل الأسئلة الظاهرة — يمكن إعادة المجموعات', 'gold');
                      });
                    }}
                  >
                    ♻️ مسح السجل
                  </button>
                </div>
              )}
              <button type="button" className="btn bg mt2" disabled={loading} onClick={() => void loadBank()}>
                {loading
                  ? '⏳ جاري التحميل…'
                  : isQumairi
                    ? setsToTake > 1
                      ? `🏆 تجهيز ${setsToTake} مجموعات`
                      : '🏆 تجهيز مجموعة مسابقة جديدة'
                    : '🏦 تجهيز الأسئلة من البنك'}
              </button>
            </>
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
        <CustomQuestionBuilder
          sessionPool={customSessionPool}
          onSessionPoolChange={setCustomSessionPool}
          onApplySession={applyCustomSession}
          onSuggestSession={submitCustomSessionAsSuggestions}
          suggesting={suggesting}
          applySuccess={customApplySuccess}
          onDismissSuccess={() => setCustomApplySuccess(false)}
          notify={notifyMsg}
          isQumairi={isQumairi}
          perSetTotal={perSetTotal}
          initialPlannedGroups={initialPlannedGroups}
        />
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
