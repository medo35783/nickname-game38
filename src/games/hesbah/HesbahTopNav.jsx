import { HesbahExitTrigger } from './HesbahExitSheet';

/**
 * زر رجوع ثابت — نفس الشكل للمشرف والمتسابق (شريحة علوية يمين).
 */
export default function HesbahTopNav({ onBack, label = 'رجوع' }) {
  if (typeof onBack !== 'function') return null;

  return (
    <div className="hesbah-top-nav">
      <HesbahExitTrigger variant="nav" label={label} onClick={onBack} />
    </div>
  );
}
