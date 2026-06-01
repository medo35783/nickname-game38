/** بطاقة إعلام اللاعب بتعيينه قائداً — قبل التوزيع أو أثناءه */
export default function FameeriPlayerLeaderNotice({ groupName, phase = 'lobby' }) {
  return (
    <div className="card fameeri-leader-notice">
      <div className="fameeri-leader-notice__icon">👑</div>
      <div className="fameeri-leader-notice__title">تم تعيينك قائداً</div>
      <div className="fameeri-leader-notice__sub">
        {groupName ? `مجموعة ${groupName} — ` : ''}
        {phase === 'distributing'
          ? 'وزّع القميري على الأشجار ثم أكّد'
          : 'ستتحكم بالهجوم والدرع عند بدء اللعب'}
      </div>
    </div>
  );
}
