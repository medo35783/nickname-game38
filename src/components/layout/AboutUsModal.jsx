const AUDIENCES = [
  {
    icon: '👨‍👩‍👧‍👦',
    title: 'الجمعات العائلية',
    desc: 'لتملأ البيت ضحكاً وتنافساً شريفاً.',
  },
  {
    icon: '🎉',
    title: 'المناسبات والجمعات الكبيرة',
    desc: 'لتكسر الجليد وتصنع جوّاً حماسياً استثنائياً.',
  },
  {
    icons: ['🏫', '🤝'],
    title: 'المدارس والحلق والدور التعليمية والجمعيات',
    desc: 'لكسر الروتين ودمج التعليم بالمتعة، وتفعيل الأنشطة المجتمعية بروح تنافسية.',
  },
  {
    icon: '🏢',
    title: 'رحلات الشركات والفعاليات',
    desc: 'لتعزيز روح الفريق وبناء علاقات تفاعلية قوية.',
  },
];

export default function AboutUsModal({ onClose }) {
  return (
    <div
      className="mbg about-mbg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-us-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="about-modal" onClick={(e) => e.stopPropagation()}>
        <div className="about-modal-head">
          <div className="about-modal-head-text">
            <div id="about-us-title" className="about-modal-title">
              منصة لعيبز
            </div>
            <p className="about-modal-slogan">لعيبز | من فيكم اللعيب؟</p>
          </div>
          <button type="button" className="btn bgh bxs" onClick={onClose} aria-label="إغلاق">
            ✕
          </button>
        </div>

        <div className="about-modal-body">
          <p className="about-lead">
            نحن منصة لعيبز، ألعاب جماعية بنكهة تنافسية، سعودية الفكرة والصنع، انطلقت بشغف لإعادة
            تعريف المتعة والترابط في التجمعات والفعاليات.
          </p>

          <div className="about-highlight" dir="rtl">
            <span className="about-highlight-label">من عزلة</span>
            <span className="about-highlight-icon" aria-hidden="true">
              📱
            </span>
            <span className="about-highlight-arrow" aria-hidden="true">
              ←
            </span>
            <span className="about-highlight-label about-highlight-label--gold">مشاركة!</span>
          </div>

          <p className="about-text">
            في عالم تسارعت فيه الشاشات الفردية، نحن لا نطلب إخفاء الجوال من الجلسة، بل نغيّر دوره: من
            عزلة.. إلى مشاركة!
          </p>

          <p className="about-text">
            رؤيتنا أن نجعل كل لمة أكثر تفاعلاً ومرحاً، وأن نجمع القلوب والعقول في مكان واحد من
            خلال تحديات ومسابقات ذكية، سريعة، ومبتكرة تركز على الحماس والتنوع واللعب الجماعي.
          </p>

          <p className="about-text about-text--muted">
            باختصار.. لعبة جماعية صُممت تجربتها الممتعة والسلسة لتصنع ذكريات لا تُنسى — تناسب جميع
            تجمعاتكم:
          </p>

          <p className="about-tagline">برمز واحد.. تشتعل اللمة ومرحها يزود</p>

          <h3 className="about-section-title">تناسب جميع تجمعاتكم</h3>

          <div className="about-grid about-grid--audiences">
            {AUDIENCES.map((item) => (
              <div key={item.title} className="about-card">
                <div className="about-card-icon">
                  {item.icons ? (
                    <span className="about-card-icons" aria-hidden="true">
                      {item.icons.map((emoji) => (
                        <span key={emoji}>{emoji}</span>
                      ))}
                    </span>
                  ) : (
                    item.icon
                  )}
                </div>
                <div className="about-card-title">{item.title}</div>
                <div className="about-card-desc">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <button type="button" className="btn bg about-close-btn" onClick={onClose}>
          حسناً
        </button>
      </div>
    </div>
  );
}
