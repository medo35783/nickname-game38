import FameeriMatchSummary from './FameeriMatchSummary';

/** عرض موحّد للمواجهة — يُستخدم في السجل والهجوم */
export default function FameeriAdminDuel({
  attackerName,
  targetName,
  tree,
  weaponName,
  weaponIcon,
  size = 'md',
  variant = 'default',
}) {
  return (
    <FameeriMatchSummary
      attackerName={attackerName}
      targetName={targetName}
      tree={tree}
      weaponName={weaponName}
      weaponIcon={weaponIcon}
      size={size}
      variant={variant}
    />
  );
}
