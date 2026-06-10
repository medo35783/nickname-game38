import '../styles/knowledge-chest.css';

/**
 * بطاقة بنك المعرفة — موحّدة بين صوتك وحسابي
 */
export default function KnowledgeBankSpotlight({
  onClick,
  bankTotal = null,
  statsLine = null,
  wide = false,
  className = '',
}) {
  return (
    <button
      type="button"
      className={`kb-spotlight${wide ? ' kb-spotlight--wide' : ''}${className ? ` ${className}` : ''}`}
      onClick={onClick}
    >
      <span className="kb-spotlight__glow" aria-hidden />
      <span className="kb-spotlight__glyph">📚</span>
      <span className="kb-spotlight__title">بنك المعرفة</span>
      <span className="kb-spotlight__sub">اقترح سؤالاً — يُراجع ويُضاف للألعاب</span>
        {bankTotal != null ? (
          <span className="kb-spotlight__badge">
            {bankTotal.toLocaleString('ar-SA')} سؤال في البنك
          </span>
        ) : (
          <span className="kb-spotlight__cta">أضف سؤالاً ←</span>
        )}
      {statsLine ? <span className="kb-spotlight__stats">{statsLine}</span> : null}
    </button>
  );
}
