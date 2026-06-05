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
      sub: 'اختر الأسئلة وادفع الجولات',
      steps: [
        { icon: '🔢', text: 'أنشئ غرفة وشارك الرمز مع اللاعبين' },
        { icon: '❓', text: 'حدّد عدد الأسئلة ومصدر البنك (تلقائي / يدوي / مخصص)' },
        { icon: '✅', text: 'صحّح الإجابات، فعّل الجولات الخاصة، وأعلن الفائز' },
      ],
    },
    player: {
      title: 'حَسْبة',
      sub: 'اربط كل سؤال برقم على لوحتك',
      steps: [
        { icon: '🎯', text: 'اختر درجة متاحة واكتب إجابة فريدة' },
        { icon: '🛡️', text: 'التأمين يحميك جزئياً عند التكرار' },
        { icon: '🔥', text: 'سلسلة صحيحة من السؤال 6 = اشتعال + بونص' },
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
