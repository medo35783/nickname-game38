import { useState } from 'react';
import GameGuideModalShell from '../../shared/GameGuideModalShell';
import { HESBAH_ACCENT_CSS } from './HesbahHelpers';

/** دليل كامل — للمشرف والمتسابق */
export default function HesbahGuideModal({ onClose }) {
  const [guideRole, setGuideRole] = useState('player');

  return (
    <GameGuideModalShell
      title="📖 دليل لعبة حَسْبة"
      titleId="hesbah-guide-title"
      onClose={onClose}
      themeClass="hesbah-theme"
      accentVar="--hesbah-accent"
    >
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
              title: 'انضم للغرفة',
              desc: 'أدخل رمزاً من 4 أرقام واسمك. انتظر في اللوبي حتى يبدأ المشرف.',
            },
            {
              n: 2,
              title: 'لوحة الدرجات',
              desc: 'لكل لاعب أرقام 1 إلى عدد الجولات. كل رقم تستخدمه مرة واحدة — اختره قبل بدء المؤقت (إلا في جولات الحظ أو الحصار).',
              tip: 'الدرجة العالية = ربح أكبر — لكن خسارة أكبر إن أخطأت.',
            },
            {
              n: 3,
              title: 'تدفق الجولة',
              desc: '① اختر درجتك → ② ينكشف السؤال → ③ المشرف يبدأ المؤقت → ④ اكتب إجابتك وأرسل.',
            },
            {
              n: 4,
              title: 'سرية الإجابات',
              desc: 'لا ترى نصوص إجابات أحد — ولا المشرف إن كان «يشارك» — إلا بعد أن ترسل إجابتك. هذا يمنع التكرار والنسخ.',
            },
            {
              n: 5,
              title: 'التصحيح والتكرار',
              desc: 'المشرف يحدد: صح / خطأ. إذا كررت إجابة شخص آخر يُعلّمها «مكرر» وتُحرق درجتك.',
              tip: 'اكتب إجابات مختلفة — التفرد مهم!',
            },
            {
              n: 6,
              title: 'السؤال الحاسم',
              desc: 'بعد آخر جولة: تصويت جماعي على قيمة الرهان الأخير (5 / 10 / 15 / 20) — الأغلبية تحسم.',
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

          <div style={{ marginTop: 4, marginBottom: 12, fontSize: 12, color: HESBAH_ACCENT_CSS, fontWeight: 700 }}>
            ⚡ أدواتك (مرة واحدة للمسابقة — أثناء المؤقت)
          </div>
          {[
            ['🛡️', 'درع — إن تكررت مع شخص واحد فقط تُحمى. أكثر من اثنين = يُستهلك الدرع بلا حماية'],
            ['✏️', 'تعديل — غيّر إجابتك مرة بعد الإرسال قبل انتهاء المؤقت'],
            ['💪', 'ثقة X2 — إذا صحت: درجتك ×2'],
          ].map(([ic, tx], i) => (
            <div key={i} className="rule-row">
              {ic} <span>{tx}</span>
            </div>
          ))}

          <div style={{ marginTop: 12, marginBottom: 12, fontSize: 12, color: HESBAH_ACCENT_CSS, fontWeight: 700 }}>
            ⚠️ قوانين مهمة
          </div>
          {[
            ['🔒', 'لا إجابات قبل إرسالك — قاعدة ثابتة'],
            ['⏱️', 'لم تُرسل قبل انتهاء الوقت؟ درجتك المختارة تُعلّم «وقت»'],
            ['🔥', 'من الجولة 6: 3 صح متتالية = «مشتعل» + بونص +5'],
            ['🔄', 'خرجت بالخطأ؟ أعد نفس الرمز والاسم للعودة'],
            ['🏆', 'الهدف: أعلى مجموع نقاط عند نهاية الجولات'],
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
              desc: 'اختر عدد الجولات (15–30) ومصدر الأسئلة: بنك تلقائي، يدوي، أو «معي فقط» (شفهي).',
            },
            {
              n: 2,
              title: 'اللوبي',
              desc: 'شارك الرمز. اضبط مدة المؤقت، و«أشارك» أو «إدارة فقط». ابدأ اللعب عندما يجهز الجميع.',
              tip: '«أشارك»: ترى الإجابات بعد إرسالك. «إدارة فقط»: تراها فوراً للتصحيح.',
            },
            {
              n: 3,
              title: 'كل جولة',
              desc: '① اقرأ السؤال → ② «بدء المؤقت» → ③ راقب من أرسل → ④ «إنهاء المؤقت» → ⑤ صحّح.',
            },
            {
              n: 4,
              title: 'التصحيح',
              desc: 'حدّد صح/خطأ لكل إجابة فريدة. راجع «المكررات» واضغط «اعتماد كتكرار» — يُحرقون أو يُخصمون حسب كرت الإثارة.',
            },
            {
              n: 5,
              title: 'بعد الجولة',
              desc: '«عرض النتيجة» → «الترتيب» → «السؤال التالي». يمكنك إنهاء المسابقة مبكراً وإعلان الفائز.',
            },
            {
              n: 6,
              title: 'السؤال الحاسم',
              desc: 'بعد آخر جولة: تصويت المتسابقين على قيمة الرهان — ثم جولة أخيرة بالدرجة الفائزة.',
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

          <div style={{ marginTop: 4, marginBottom: 12, fontSize: 12, color: HESBAH_ACCENT_CSS, fontWeight: 700 }}>
            ⚡ كروت الإثارة (كرت واحد — بعد بدء المؤقت)
          </div>
          {[
            ['🔥 2X', 'خطر مضاعف — خطأ أو تكرار = خصم ضعف الدرجة'],
            ['🔥', 'خطر — خطأ أو تكرار = خصم الدرجة'],
            ['💎 X3', 'ثلاثي — إجابة صح ×3'],
            ['🎲', 'حظ — درجة عشوائية عند الإرسال (لا لوحة درجات)'],
            ['⚔️', 'حصار — أعلى درجة عالية تلقائياً (لا لوحة درجات)'],
            ['🕶️', 'ظلام — البطاقات الحية لا تظهر حتى انتهاء وقت الجولة'],
          ].map(([ic, tx], i) => (
            <div key={i} className="rule-row">
              {ic} <span>{tx}</span>
            </div>
          ))}

          <div style={{ marginTop: 12, marginBottom: 12, fontSize: 12, color: HESBAH_ACCENT_CSS, fontWeight: 700 }}>
            💡 نصائح للمشرف
          </div>
          {[
            ['📋', 'اقرأ السؤال بوضوح — خاصة في وضع «معي فقط»'],
            ['🔁', 'لا تنسَ «اعتماد كتكرار» — بدونها التكرار لا يُعاقب'],
            ['⏱️', 'يمكنك تخصيص مدة كل سؤال أو إنهاء المؤقت مبكراً'],
            ['👑', 'إجابتك «عرضية» — لا تُحسب نقاطاً لكن تظهر في المكررات'],
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
