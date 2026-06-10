import { HesbahPanelTitle, HESBAH_TOOLS_HELP } from './HesbahHelpTip';
import { HESBAH_SPECIAL_TOOLS } from './HesbahHelpers';

export default function HesbahAdminTools({
  activeSpecial,
  timerRunning,
  timerWaiting = false,
  onSetSpecial,
  onEndTimer,
}) {
  const activeTool = HESBAH_SPECIAL_TOOLS.find((tool) => tool.id === activeSpecial);
  const canPick = timerWaiting || timerRunning;

  const stateLabel = timerRunning
    ? '● مباشر'
    : activeSpecial
      ? '🎯 مُجهّز'
      : '⏸ قبل المؤقت';

  const hintText = timerRunning
    ? 'الكرت نشط — المتسابقون يرونه الآن'
    : activeSpecial
      ? 'الكرت مختار — يظهر للمتسابقين عند «بدء المؤقت»'
      : 'اختر كرتاً للجولة — يُعلَن للمتسابقين عند بدء المؤقت فقط';

  return (
    <div className="hesbah-admin-tools">
      <div className="hesbah-admin-tools__head">
        <HesbahPanelTitle help={HESBAH_TOOLS_HELP} helpLabel="أدوات الإثارة">
          ⚡ كروت الإثارة
        </HesbahPanelTitle>
        <span className={`hesbah-admin-tools__state ${timerRunning ? 'is-live' : activeSpecial ? 'is-ready' : 'is-wait'}`}>
          {stateLabel}
        </span>
      </div>

      <p className="hesbah-admin-tools__hint">{hintText}</p>

      <div className="hesbah-power-grid" role="group" aria-label="أدوات الإثارة">
        {HESBAH_SPECIAL_TOOLS.map((tool) => {
          const active = activeSpecial === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              className={`hesbah-power-btn hesbah-power-btn--${tool.id} ${active ? 'is-on' : ''} ${!canPick ? 'is-locked' : ''}`}
              title={tool.desc}
              aria-pressed={active}
              disabled={!canPick}
              onClick={() => onSetSpecial(tool.id)}
            >
              <span className="hesbah-power-btn__ico" aria-hidden>
                {tool.icon}
              </span>
              <span className="hesbah-power-btn__tag">{tool.tag}</span>
              <span className="hesbah-power-btn__name">{tool.title.replace('كرت ', '')}</span>
              {active && <span className="hesbah-power-btn__dot" aria-hidden />}
            </button>
          );
        })}
      </div>

      {activeTool && (
        <div className={`hesbah-power-active hesbah-power-active--${activeTool.id}`}>
          <strong>{activeTool.icon} {activeTool.title}</strong>
          <span>{activeTool.short}</span>
        </div>
      )}

      {timerRunning && (
        <button type="button" className="btn bo bsm hesbah-admin-tools__end" onClick={onEndTimer}>
          ⏹ إنهاء المؤقت
        </button>
      )}
    </div>
  );
}
