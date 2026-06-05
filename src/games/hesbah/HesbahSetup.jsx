import { useState } from 'react';
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
  const [qPool, setQPool] = useState({ hard: [], medium: [], easy: [] });
  const [qBankMeta, setQBankMeta] = useState(null);

  const poolCount = countHesbahPool(qPool);
  const canCreate = !!qSource && (qSource === QSOURCE.EXTERNAL || poolCount > 0);

  return (
    <div className="scr hesbah-theme hesbah-setup-screen">
      <div className="hesbah-sticky-chrome">
        <HesbahTopNav onBack={onBack} />
      </div>
      <div style={{ textAlign: 'center', padding: '8px 0 14px' }}>
        <div style={{ fontSize: 46, marginBottom: 6 }}>🎯</div>
        <div className="ptitle" style={{ fontSize: 22 }}>حَسْبة</div>
        <span className="hesbah-hero-badge">⚡ حَسْبة ذكية — رهانك يحدد مصيرك</span>
        <div className="psub" style={{ marginTop: 8 }}>اختر عدد الأسئلة ومصدرها ثم أنشئ الغرفة</div>
      </div>

      <div className="card">
        <div className="ctitle">📊 عدد الأسئلة</div>
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
              onClick={() => setTotalQ(n)}
            >
              {n} سؤال
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
          لوحة الدرجات: 1 → {totalQ}
        </div>
      </div>

      <div className="card">
        <div className="ctitle">❓ مصدر الأسئلة</div>
        {qSource ? (
          <div
            style={{
              background: HESBAH_SCORE_BG_CSS,
              border: `1px solid ${HESBAH_BORDER_CSS}`,
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 12,
            }}
          >
            ✅ تم اختيار المصدر — جاهز للإنشاء
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>لم يُحدَّد بعد — اضغط الزر أدناه</div>
        )}
        {qSource && qSource !== QSOURCE.EXTERNAL && (
          <div style={{ fontSize: 11, color: poolCount ? HESBAH_ACCENT_CSS : 'var(--red)', marginTop: 8 }}>
            {poolCount > 0 ? `${poolCount} سؤال جاهز للجلسة` : '⚠️ لا توجد أسئلة صالحة — أعد التحميل من البنك'}
          </div>
        )}
        <button type="button" className="btn bo mt2" style={{ borderColor: HESBAH_ACCENT_CSS }} onClick={() => setSetupOpen(true)}>
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

      {setupOpen && (
        <QuestionSourceSetup
          gameType={QB_GAME_TYPE}
          accent={HESBAH_ACCENT_CSS}
          initialCount={totalQ}
          authUid={authUid}
          onGoAccount={onGoAccount}
          notify={notify}
          initialSource={qSource}
          initialPoolStructured={qPool}
          onClose={() => setSetupOpen(false)}
          onApply={({ source, pool, poolStructured, bankMeta }) => {
            setQSource(source);
            setQPool(normalizePoolToStructured(poolStructured || pool || {}));
            setQBankMeta(bankMeta || null);
            setSetupOpen(false);
            notify('✅ تم حفظ إعداد الأسئلة', 'success');
          }}
        />
      )}
    </div>
  );
}
