/** شرح سريع قبل دخول المشرف أو المتسابق — موحّد للألقاب والقميري */

const COPY = {
  titles: {
    admin: {
      title: 'مشرف المسابقة',
      sub: 'ثلاث خطوات ثم تفتح الغرفة',
      steps: [
        { icon: '🔢', text: 'أنشئ غرفة وشارك الرمز (4 أرقام) مع المتسابقين' },
        { icon: '⚙️', text: 'اضبط الجولة والخيارات — البدء من 6 لاعبين فأكثر' },
        { icon: '🔓', text: 'أنت من يمدّد الوقت ويكشف النتائج ويُعلن الفائز' },
      ],
    },
    player: {
      title: 'متسابق',
      sub: 'ثلاث خطوات ثم تدخل الغرفة',
      steps: [
        { icon: '🎭', text: 'لقبك السري يظهر للجميع — اسمك الحقيقي يبقى مخفياً' },
        { icon: '⚔️', text: 'الكل يهاجم معاً سراً — خمّن من وراء كل لقب' },
        { icon: '🏆', text: 'ابقَ آخر واحد، أو اكشف الجميع قبل أن يُكشف لقبك' },
      ],
    },
  },
  hesbah: {
    admin: {
      title: 'مشرف حَسْبة',
      sub: 'ثلاث خطوات ثم تُنشأ الغرفة',
      steps: [
        { icon: '🔢', text: 'أنشئ غرفة وشارك الرمز (4 أرقام) مع المتسابقين' },
        { icon: '❓', text: 'حدّد عدد الجولات ومصدر الأسئلة — ثم ابدأ من اللوبي' },
        { icon: '✅', text: 'ابدأ المؤقت، صحّح، فعّل كروت الإثارة، وأعلن الفائز' },
      ],
    },
    player: {
      title: 'متسابق حَسْبة',
      sub: 'ثلاث خطوات ثم تنضم',
      steps: [
        { icon: '🎯', text: 'اختر درجة من لوحتك واكتب إجابة فريدة' },
        { icon: '🔒', text: 'لا ترى إجابات أحد حتى ترسل — ضد التكرار' },
        { icon: '⚡', text: 'درع / تعديل / ثقة X2 — مرة واحدة للمسابقة' },
      ],
    },
  },
  fameeri: {
    admin: {
      title: 'مشرف الصيد',
      sub: 'ثلاث خطوات ثم تُنشأ الغرفة مباشرة',
      steps: [
        { icon: '🔢', text: 'أنشئ غرفة وشارك الرمز (4 أرقام) مع المجموعات' },
        { icon: '👥', text: 'كوّن المجموعات، عيّن القادة، ثم ابدأ توزيع القميري' },
        { icon: '⚔️', text: 'تحكّم بالجولات، المؤقت، وكشف نتائج الهجمات' },
      ],
    },
    player: {
      title: 'عضو مجموعة',
      sub: 'ثلاث خطوات ثم تنضم',
      steps: [
        { icon: '🔢', text: 'أدخل رمز الغرفة واسمك — المشرف يضعك في مجموعتك' },
        { icon: '🌳', text: 'القائد 👑 يوزّع 100 قميري على الأشجار سراً' },
        { icon: '🦅', text: 'هاجموا أشجار الخصم — من يبقى له قميري أكثر يفوز' },
      ],
    },
  },
};

export default function QuickOnboarding({ game, role, onDismiss }) {
  const pack = COPY[game]?.[role];
  if (!pack) return null;

  const themeClass =
    game === 'hesbah' ? ' hesbah-theme' : game === 'fameeri' || game === 'qumairi' ? ' fameeri-theme' : '';

  return (
    <div className={`onb-bg${themeClass}`}>
      <div className="onb-card">
        <div className="onb-icon">{role === 'admin' ? '👑' : '🎮'}</div>
        <div className="onb-title">{pack.title}</div>
        <div className="onb-sub">{pack.sub}</div>
        {pack.steps.map((step, i) => (
          <div key={i} className="onb-step">
            <span className="onb-step-num">{i + 1}</span>
            <span className="onb-step-text">
              {step.icon} {step.text}
            </span>
          </div>
        ))}
        <button type="button" className="btn bg mt3" onClick={onDismiss}>
          ✅ حسنّا، لنبدأ!
        </button>
      </div>
    </div>
  );
}
