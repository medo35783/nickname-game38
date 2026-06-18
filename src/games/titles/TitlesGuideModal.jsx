import { useState } from 'react';
import GameGuideModalShell from '../../shared/GameGuideModalShell';

/** دليل كامل — مزامن مع قوانين الشاشة الرئيسية وخيارات المشرف */
export default function TitlesGuideModal({ onClose }) {
  const [guideRole, setGuideRole] = useState('player');

  return (
    <GameGuideModalShell title="📖 دليل لعبة الألقاب" titleId="titles-guide-title" onClose={onClose}>
      <div className="role-toggle" style={{ marginBottom: 16 }}>
        <button type="button" className={`role-btn ${guideRole === 'player' ? 'active' : ''}`} onClick={() => setGuideRole('player')}>
          🎮 متسابق
        </button>
        <button type="button" className={`role-btn ${guideRole === 'admin' ? 'active' : ''}`} onClick={() => setGuideRole('admin')}>
          👑 مشرف
        </button>
      </div>

      {guideRole === 'player' && (
        <>
          {[
            {
              n: 1,
              title: 'انضم بالرمز وبياناتك',
              desc: 'المشرف يرسل رمزاً من 4 أرقام. أدخل اسمك ولقبك السري — اللقب هو ما يراه الجميع.',
              tip: 'ابعد اللقب عن اهتماماتك الحقيقية.',
            },
            {
              n: 2,
              title: 'غرفة الانتظار',
              desc: 'لقبك يظهر للآخرين دون كشف اسمك. انتظر حتى يبدأ المشرف — تنتقل تلقائياً.',
            },
            {
              n: 3,
              title: 'وضع اللقبين (اختياري)',
              desc: '4 لاعبين = 8 ألقاب + تمويه إلزامي. إذا كُشف لقب واحد تبقى بلقبك الثاني. تُخرج عند كشف اللقبين.',
              tip: 'الفائز: يبقى لقب أو لقبان فقط في الساحة — شخص واحد (لقبان) أو شخصان (لقب لكل).',
            },
            {
              n: 4,
              title: 'الهجوم المتزامن',
              desc: 'اختر لقباً ثم الاسم الذي تظن أنه صاحبه. الكل يهاجم سراً — لا أحد يرى هجومك.',
            },
            {
              n: 5,
              title: 'كشف النتائج',
              desc: 'المشرف يقرر التوقيت. النتائج تظهر للجميع معاً — اضغط البطاقات لمعرفة من خلف اللقب.',
            },
          ].map((s) => (
            <div key={s.n} className="step-card" style={{ marginBottom: 9 }}>
              <div className="step-num">{s.n}</div>
              <div className="step-body">
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
                {s.tip && <div className="step-tip">💡 {s.tip}</div>}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 4, marginBottom: 12, fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>⚠️ قوانين مهمة</div>
          {[
            ['❌', 'جولتان بلا هجوم = خروج صامت دون كشف لقبك'],
            ['👁️', 'ألقابك الكاملة لا تُعرض للجميع إلا في نهاية المسابقة'],
            ['☠️', 'لقب مسموم — إن أخطأت هجومه تتأثر جولتك التالية'],
            ['🚫', 'التعاون ممنوع — عقوبته الإخراج'],
            ['🔐', 'الضيف يختار رقمًا سريًا — المسجّل يرجع بحسابه بدون PIN'],
            ['🔄', 'خرجت؟ نفس الرمز والاسم واللقب + رقمك السري للعودة'],
            ['🏆', 'الهدف: ابقَ آخر لاعب أو اكشف الجميع قبل أن يُكشف لقبك'],
          ].map(([ic, tx], i) => (
            <div key={i} className="rule-row">
              {ic} <span>{tx}</span>
            </div>
          ))}
        </>
      )}

      {guideRole === 'admin' && (
        <>
          {[
            {
              n: 1,
              title: 'أنشئ الغرفة',
              desc: 'من الرئيسية: «أنا مشرف — إنشاء غرفة». شارك الرمز (4 أرقام) أو أضف لاعبين يدوياً.',
            },
            {
              n: 2,
              title: 'الإعدادات',
              desc: 'لقب واحد أو اثنان، مدة الجولة (5 دقائق كحد أدنى)، وألقاب تمويه اختيارية.',
            },
            {
              n: 3,
              title: 'ابدأ اللعب',
              desc: '6 لاعبين (لقب واحد) أو 4 لاعبين (لقبان) — ثم «بدء اللعبة».',
            },
            {
              n: 4,
              title: 'لوحة التحكم 👑',
              desc: 'متابعة الهجمات، تمديد الوقت، هجوم بالنيابة، وإخراج الغشّاشين.',
            },
            {
              n: 5,
              title: 'الكشف والإنهاء',
              desc: '«كشف نتائج الجولة» يختلف عن «إنهاء المسابقة» — الثاني نهائي.',
              tip: 'في وضع اللقبين: كشف لقب واحد لا يُخرج اللاعب، التمويه إلزامي، والفوز عند بقاء لقب أو لقبين. جولة الصمت: الجولة التالية بدون كشف ثم إعلان النتائج.',
            },
          ].map((s) => (
            <div key={s.n} className="step-card" style={{ marginBottom: 9 }}>
              <div className="step-num">{s.n}</div>
              <div className="step-body">
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
                {s.tip && <div className="step-tip">💡 {s.tip}</div>}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 4, marginBottom: 12, fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>🎲 أدوات الإثارة</div>
          {[
            ['☠️', 'لقب مسموم — خطأ الهجوم عليه يعاقب المهاجم'],
            ['🤫', 'جولة صمت — كشف مؤجّل حتى قرارك'],
            ['⚔️', 'جولة مزدوجة / مفاجئة — أكثر من هجوم للاعب'],
            ['🎭', 'ألقاب تمويه — تُربك المتسابقين دون لاعب حقيقي'],
            ['🎮', 'هجوم بالنيابة — إذا تعطّل جوال لاعب'],
          ].map(([ic, tx], i) => (
            <div key={i} className="rule-row">
              {ic} <span>{tx}</span>
            </div>
          ))}
        </>
      )}
    </GameGuideModalShell>
  );
}
