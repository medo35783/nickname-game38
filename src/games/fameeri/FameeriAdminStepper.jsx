const STEPS = [
  { id: 'lobby', icon: '⚙️', label: 'إعداد' },
  { id: 'distributing', icon: '🌳', label: 'توزيع' },
  { id: 'playing', icon: '⚔️', label: 'لعب' },
  { id: 'ended', icon: '🏆', label: 'نتائج' },
];

const ORDER = STEPS.map((s) => s.id);

export default function FameeriAdminStepper({ phase = 'lobby', roomCode, assistMode }) {
  const idx = Math.max(0, ORDER.indexOf(phase));

  return (
    <div className="fameeri-admin-stepper">
      <div className="fameeri-admin-stepper__head">
        <div>
          <div className="fameeri-admin-stepper__title">👑 لوحة المشرف</div>
          {roomCode && (
            <div className="fameeri-admin-stepper__room">
              رمز الغرفة <strong>{roomCode}</strong>
              {assistMode && <span className="fameeri-admin-badge">📱 بدون جوالات</span>}
            </div>
          )}
        </div>
      </div>
      <div className="fameeri-admin-stepper__track" role="list" aria-label="مراحل المسابقة">
        {STEPS.map((step, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <div
              key={step.id}
              role="listitem"
              className={`fameeri-admin-step${done ? ' done' : ''}${active ? ' active' : ''}`}
            >
              <div className="fameeri-admin-step__dot">{done ? '✓' : step.icon}</div>
              <div className="fameeri-admin-step__label">{step.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
