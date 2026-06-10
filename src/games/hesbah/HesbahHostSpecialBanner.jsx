import { HESBAH_SPECIAL_TOOLS } from './HesbahHelpers';

/** بانر إثارة المشرف — يظهر للمتسابقين بعد بدء المؤقت فقط */
export default function HesbahHostSpecialBanner({ specialRound }) {
  const tool = HESBAH_SPECIAL_TOOLS.find((t) => t.id === specialRound);
  if (!tool) return null;

  return (
    <div className={`hesbah-host-special hesbah-host-special--${tool.id}`} role="status">
      <span className="hesbah-host-special__ico" aria-hidden="true">
        {tool.icon}
      </span>
      <div className="hesbah-host-special__body">
        <span className="hesbah-host-special__label">إثارة المشرف</span>
        <strong className="hesbah-host-special__title">{tool.title}</strong>
        <span className="hesbah-host-special__hint">{tool.short}</span>
      </div>
      <span className="hesbah-host-special__tag">{tool.tag}</span>
    </div>
  );
}
