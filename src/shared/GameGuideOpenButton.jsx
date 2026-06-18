/** زر فتح الدليل — يظهر قبل بدء اللعبة فقط */
export default function GameGuideOpenButton({ onClick, className = 'mt2', label = '📖 كيف تلعب؟ — الدليل الكامل' }) {
  if (!onClick) return null;

  return (
    <button type="button" className={`btn bgh game-guide-open-btn ${className}`.trim()} onClick={onClick}>
      {label}
    </button>
  );
}
