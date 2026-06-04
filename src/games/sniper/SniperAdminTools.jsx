import { useState } from 'react';
import { SNIPER_SPECIAL_TOOLS, SPEED_QUESTION_SECONDS } from './sniperHelpers';

export default function SniperAdminTools({
  activeSpecial,
  timerRunning,
  onSetSpecial,
  onEndTimer,
  compact = true,
}) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <section className={`sniper-admin-tools ${compact ? 'sniper-admin-tools--compact' : ''}`}>
      <div className="sniper-admin-tools__bar">
        <span className="sniper-admin-tools__label">⚡ إثارة</span>
        <button
          type="button"
          className={`sniper-admin-info-btn ${helpOpen ? 'is-on' : ''}`}
          onClick={() => setHelpOpen((v) => !v)}
          aria-expanded={helpOpen}
        >
          {helpOpen ? '✕' : '؟'}
        </button>
      </div>

      {helpOpen && (
        <p className="sniper-admin-tools-guide">
          اضغط الأداة للتفعيل، واضغطها مرة أخرى لإلغائها. لا تبدأ المؤقت تلقائياً.
        </p>
      )}

      <div className="sniper-admin-tools-chips">
        {SNIPER_SPECIAL_TOOLS.map((tool) => {
          const active = activeSpecial === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              className={`sniper-admin-tool-chip ${active ? 'is-on' : ''}`}
              title={tool.desc}
              onClick={() => onSetSpecial(tool.id)}
            >
              <span className="sniper-admin-tool-chip__icon">{tool.icon}</span>
              <span className="sniper-admin-tool-chip__name">{tool.title}</span>
              {active && <span className="sniper-admin-tool-chip__off">إلغاء</span>}
            </button>
          );
        })}
      </div>

      {activeSpecial === 'speed' && (
        <div className="sniper-admin-chip sniper-admin-chip--speed">
          مؤقت {SPEED_QUESTION_SECONDS} ث
        </div>
      )}

      {timerRunning && (
        <button type="button" className="btn bo bsm sniper-admin-end-timer" onClick={onEndTimer}>
          ⏹ إنهاء الوقت
        </button>
      )}
    </section>
  );
}
