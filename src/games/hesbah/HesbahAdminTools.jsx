import { HesbahPanelTitle, HESBAH_TOOLS_HELP } from './HesbahHelpTip';
import { HESBAH_SPECIAL_TOOLS, SPEED_QUESTION_SECONDS } from './hesbahHelpers';

export default function HesbahAdminTools({
  activeSpecial,
  timerRunning,
  onSetSpecial,
  onEndTimer,
}) {
  return (
    <div className="hesbah-admin-tools">
      <HesbahPanelTitle help={HESBAH_TOOLS_HELP} helpLabel="أدوات الإثارة">
        ⚡ إثارة
      </HesbahPanelTitle>

      <div className="hesbah-power-grid" role="group" aria-label="أدوات الإثارة">
        {HESBAH_SPECIAL_TOOLS.map((tool) => {
          const active = activeSpecial === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              className={`hesbah-power-btn ${active ? 'is-on' : ''}`}
              title={tool.desc}
              onClick={() => onSetSpecial(tool.id)}
            >
              <span className="hesbah-power-btn__ico" aria-hidden>
                {tool.icon}
              </span>
              <span className="hesbah-power-btn__tag">{tool.tag}</span>
              {active && <span className="hesbah-power-btn__dot" aria-hidden />}
            </button>
          );
        })}
      </div>

      {activeSpecial === 'speed' && (
        <p className="hesbah-admin-micro">مؤقت {SPEED_QUESTION_SECONDS} ث</p>
      )}

      {timerRunning && (
        <button type="button" className="btn bo bsm hesbah-admin-micro-btn" onClick={onEndTimer}>
          ⏹ إنهاء
        </button>
      )}
    </div>
  );
}
