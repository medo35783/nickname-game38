import { useCallback, useState } from 'react';
import QuestionSourceSetup from '../../question-bank/QuestionSourceSetup';
import { normalizePoolToStructured } from '../fameeri/fameeriQuestionPool';
import { QSOURCE } from '../../question-bank/questionSession';
import { countHesbahPool } from './HesbahQuestions';
import {
  TOTAL_Q_OPTIONS,
  HESBAH_ACCENT_CSS,
  HESBAH_GLOW_CSS,
  HESBAH_BORDER_CSS,
  HESBAH_SCORE_BG_CSS,
  QB_GAME_TYPE,
} from './HesbahHelpers';
import HesbahTopNav from './HesbahTopNav';

const EMPTY_POOL = { hard: [], medium: [], easy: [] };

export default function HesbahSetup({
  totalQ,
  setTotalQ,
  onCreateRoom,
  creating,
  notify,
  authUid,
  onGoAccount,
  onBack,
}) {
  const [setupOpen, setSetupOpen] = useState(false);
  const [qSource, setQSource] = useState(null);
  const [qPool, setQPool] = useState(EMPTY_POOL);
  const [qBankMeta, setQBankMeta] = useState(null);
  /** عدد الجولات الذي جُهّز له البنك — يُصفَّر عند تغيير العدد */
  const [poolForTotalQ, setPoolForTotalQ] = useState(null);

  const countReady = totalQ != null;
  const poolCount = countHesbahPool(qPool);
  const poolMatchesCount = poolForTotalQ === totalQ && poolCount >= totalQ;
  const canCreate =
    countReady &&
    !!qSource &&
    (qSource === QSOURCE.EXTERNAL || poolMatchesCount);

  const resetQuestionSource = useCallback(
    (message) => {
      setQSource(null);
      setQPool(EMPTY_POOL);
      setQBankMeta(null);
      setPoolForTotalQ(null);
      setSetupOpen(false);
      if (message) notify(message, 'gold');
    },
    [notify]
  );

  const handleSelectTotalQ = (n) => {
    if (totalQ === n) return;
    if (qSource && poolForTotalQ != null && poolForTotalQ !== n) {
      resetQuestionSource(
        `غيّرت العدد إلى ${n} — أُلغي إعداد البنك (${poolForTotalQ} سؤالاً). أعد «إعداد الأسئلة» للعدد الجديد.`
      );
    }
    setTotalQ(n);
  };

  const openQuestionSetup = () => {
    if (!countReady) {
      notify('اختر عدد الأسئلة أولاً (15–30)', 'error');
      return;
    }
    setSetupOpen(true);
  };

  return (
    <div className="scr hesbah-theme hesbah-setup-screen">
      <div className="hesbah-sticky-chrome">
        <HesbahTopNav onBack={onBack} />
      </div>
      <div style={{ textAlign: 'center', padding: '8px 0 14px' }}>
        <div style={{ fontSize: 46, marginBottom: 6 }}>🎯</div>
        <div className="ptitle" style={{ fontSize: 22 }}>حَسْبة</div>
        <span className="hesbah-hero-badge">⚡ حَسْبة ذكية — رهانك يحدد مصيرك</span>
        <div className="psub" style={{ marginTop: 8 }}>① عدد الأسئلة ← ② البنك ← إنشاء الغرفة</div>
      </div>

      <div className="card">
        <div className="ctitle">① 📊 عدد الأسئلة — الخطوة الأولى</div>
        {!countReady && (
          <div style={{ fontSize: 12, color: HESBAH_ACCENT_CSS, marginBottom: 10, lineHeight: 1.5 }}>
            اختر عدد جولات المسابقة قبل فتح البنك
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TOTAL_Q_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              className={`btn ${totalQ === n ? 'bg' : 'bgh'}`}
              style={{
                flex: '1 1 40%',
                borderColor: totalQ === n ? HESBAH_ACCENT_CSS : undefined,
                boxShadow: totalQ === n ? `0 0 12px ${HESBAH_GLOW_CSS}` : undefined,
              }}
              onClick={() => handleSelectTotalQ(n)}
            >
              {n} سؤال
            </button>
          ))}
        </div>
        {countReady ? (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
            لوحة الدرجات: 1 → {totalQ}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>لم يُحدَّد بعد</div>
        )}
      </div>

      <div
        className="card"
        style={{
          opacity: countReady ? 1 : 0.55,
          pointerEvents: countReady ? 'auto' : 'none',
        }}
      >
        <div className="ctitle">② ❓ مصدر الأسئلة — بعد تحديد العدد</div>
        {!countReady ? (
          <div
            style={{
              fontSize: 12,
              color: 'var(--muted)',
              padding: '12px 10px',
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            🔒 يُفتح بعد اختيار عدد الأسئلة ↑
          </div>
        ) : qSource && poolMatchesCount ? (
          <div
            style={{
              background: HESBAH_SCORE_BG_CSS,
              border: `1px solid ${HESBAH_BORDER_CSS}`,
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 12,
            }}
          >
            ✅ البنك جاهز — {poolCount} سؤالاً فريداً لـ {totalQ} جولة
          </div>
        ) : qSource && qSource === QSOURCE.EXTERNAL ? (
          <div
            style={{
              background: HESBAH_SCORE_BG_CSS,
              border: `1px solid ${HESBAH_BORDER_CSS}`,
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 12,
            }}
          >
            ✅ أسئلة خارجية (المشرف يقرأها) — {totalQ} جولة
          </div>
        ) : qSource && poolForTotalQ !== totalQ ? (
          <div style={{ fontSize: 12, color: 'var(--gold)', lineHeight: 1.5 }}>
            ⚠️ البنك مُعدّ لـ {poolForTotalQ} سؤالاً — أعد الإعداد لـ {totalQ} جولة
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {countReady
              ? `لم يُحمَّل البنك بعد — سيجلب ${totalQ} سؤالاً فريداً`
              : 'لم يُحدَّد بعد'}
          </div>
        )}
        {qSource && qSource !== QSOURCE.EXTERNAL && poolMatchesCount && qBankMeta?.replayMode && (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
            {qBankMeta.replayMode === 'new'
              ? '🆕 أسئلة جديدة — لم تُستخدم في مسابقاتك السابقة'
              : '🔁 إعادة السابقة — قد تعرفون بعض الأسئلة'}
          </div>
        )}
        <button
          type="button"
          className="btn bo mt2"
          style={{ borderColor: HESBAH_ACCENT_CSS }}
          disabled={!countReady}
          onClick={openQuestionSetup}
        >
          ⚙️ إعداد الأسئلة (بنك / يدوي / مخصص)
        </button>
      </div>

      <button
        type="button"
        className="btn bg mt2"
        disabled={!canCreate || creating}
        onClick={() => onCreateRoom({ source: qSource, pool: qPool, totalQ, bankMeta: qBankMeta })}
      >
        {creating ? '⏳ جاري الإنشاء…' : '🚀 إنشاء الغرفة'}
      </button>
      {countReady && qSource && qSource !== QSOURCE.EXTERNAL && !poolMatchesCount && (
        <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
          أكمل إعداد البنك لـ {totalQ} سؤالاً قبل إنشاء الغرفة
        </div>
      )}

      {setupOpen && countReady && (
        <QuestionSourceSetup
          gameType={QB_GAME_TYPE}
          accent={HESBAH_ACCENT_CSS}
          initialCount={totalQ}
          authUid={authUid}
          onGoAccount={onGoAccount}
          notify={notify}
          initialSource={qSource}
          initialPoolStructured={poolForTotalQ === totalQ ? qPool : EMPTY_POOL}
          onClose={() => setSetupOpen(false)}
          onApply={({ source, pool, poolStructured, bankMeta }) => {
            const structured = normalizePoolToStructured(poolStructured || pool || {});
            const loaded = countHesbahPool(structured);
            if (source !== QSOURCE.EXTERNAL && loaded < totalQ) {
              notify(
                `⚠️ وُجد ${loaded} سؤالاً فقط — تحتاج ${totalQ}. غيّر التصنيف أو وضع «إعادة السابقة»`,
                'error'
              );
              return;
            }
            setQSource(source);
            setQPool(structured);
            setQBankMeta({ ...bankMeta, configuredForTotalQ: totalQ });
            setPoolForTotalQ(totalQ);
            setSetupOpen(false);
            notify(`✅ ${loaded} سؤالاً جاهزاً لـ ${totalQ} جولة`, 'success');
          }}
        />
      )}
    </div>
  );
}
