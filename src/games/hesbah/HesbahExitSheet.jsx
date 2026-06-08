import GameExitSheet, { GameExitTrigger } from '../../shared/GameExitSheet';

/** غلاف توافق — يستخدم المكوّن الموحّد */
export default function HesbahExitSheet(props) {
  return <GameExitSheet game="hesbah" {...props} />;
}

export { GameExitTrigger as HesbahExitTrigger };
