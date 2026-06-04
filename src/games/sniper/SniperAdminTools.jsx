import { SniperPanelTitle, SNIPER_TOOLS_HELP } from './SniperHelpTip';
import { SNIPER_SPECIAL_TOOLS, SPEED_QUESTION_SECONDS } from './sniperHelpers';

export default function SniperAdminTools({
  activeSpecial,
  timerRunning,
  onSetSpecial,
  onEndTimer,
}) {
  return (
    <div className="sniper-admin-tools">
      <SniperPanelTitle help={SNIPER_TOOLS_HELP} helpLabel="أدوات الإثارة">
        ⚡ إثارة
      </SniperPanelTitle>

      <div className="sniper-power-grid" role="group" aria-label="أدوات الإثارة">
        {SNIPER_SPECIAL_TOOLS.map((tool) => {
          const active = activeSpecial === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              className={`sniper-power-btn ${active ? 'is-on' : ''}`}
              title={tool.desc}
              onClick={() => onSetSpecial(tool.id)}
            >
              <span className="sniper-power-btn__ico" aria-hidden>
                {tool.icon}
              </span>
              <span className="sniper-power-btn__tag">{tool.tag}</span>
              {active && <span className="sniper-power-btn__dot" aria-hidden />}
            </button>
          );
        })}
      </div>

      {activeSpecial === 'speed' && (
        <p className="sniper-admin-micro">مؤقت {SPEED_QUESTION_SECONDS} ث</p>
      )}

      {timerRunning && (
        <button type="button" className="btn bo bsm sniper-admin-micro-btn" onClick={onEndTimer}>
          ⏹ إنهاء
        </button>
      )}
    </div>
  );
}
