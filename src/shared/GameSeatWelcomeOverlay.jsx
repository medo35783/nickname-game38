import { useEffect, useState } from 'react';
import ArenaSignupPrompt from './ArenaSignupPrompt';
import { hasSeenWelcomePrompt, markWelcomePromptSeen } from '../core/gameSeat';

/**
 * رسالة ترحيب لمرة واحدة في اللوبي — للضيوف قبل بدء المسابقة
 */
export default function GameSeatWelcomeOverlay({ gameId, seatId, isLoggedIn, onSignup }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isLoggedIn || !gameId || !seatId) {
      setOpen(false);
      return;
    }
    setOpen(!hasSeenWelcomePrompt(gameId, seatId));
  }, [gameId, seatId, isLoggedIn]);

  if (!open || isLoggedIn) return null;

  const dismiss = () => {
    markWelcomePromptSeen(gameId, seatId);
    setOpen(false);
  };

  return (
    <div className="game-seat-welcome-backdrop" role="dialog" aria-modal="true">
      <div className="game-seat-welcome-card">
        <div className="game-seat-welcome-card__badge">🏟️ قبل أن يبدأ المشرف</div>
        <h2 className="game-seat-welcome-card__title">سجّل بريدك — وارجع للعبة بسهولة</h2>
        <p className="game-seat-welcome-card__sub">
          أنت تلعب كضيف برقم سري. إذا سجّلت ببريدك لن تحتاج PIN — وترجع لمقعدك من أي جهاز.
        </p>
        <ArenaSignupPrompt
          variant="compact"
          title="مزايا التسجيل في الساحة"
          dismissLabel="متابعة كضيف برقمي السري"
          onSignup={() => {
            dismiss();
            onSignup?.();
          }}
          onDismiss={dismiss}
        />
      </div>
    </div>
  );
}
