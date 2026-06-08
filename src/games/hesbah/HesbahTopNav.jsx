import GameTopNav from '../../shared/GameTopNav';

/** غلاف توافق — شريط علوي موحّد */
export default function HesbahTopNav({ label, variant = 'nav', ...props }) {
  return <GameTopNav sticky variant={variant} {...(label != null ? { label } : {})} {...props} />;
}
