/** أيقونات بطاقات الألعاب */

function EmojiWrap({ children, className = '' }) {
  return (
    <div className={`home-game-card__emoji-wrap ${className}`.trim()} aria-hidden="true">
      {children}
    </div>
  );
}

export function TitlesHomeIcon() {
  return <EmojiWrap>🎭</EmojiWrap>;
}

export function FameeriHomeIcon() {
  return <EmojiWrap>🦅</EmojiWrap>;
}

export function HesbahHomeIcon() {
  return <EmojiWrap>🎯</EmojiWrap>;
}

const HOME_GAME_ICONS = {
  nicknames: TitlesHomeIcon,
  fameeri: FameeriHomeIcon,
  hesbah: HesbahHomeIcon,
};

export default function HomeGameIcon({ game }) {
  const Icon = HOME_GAME_ICONS[game];
  return Icon ? <Icon /> : null;
}
