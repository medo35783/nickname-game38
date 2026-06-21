import { PLATFORM_NAME, PLATFORM_NAME_EN, PLATFORM_TAGLINE, BRAND_ICON_SRC } from '../core/constants';

/** شعار لعيبز — LA3IBZ */
export default function La3ibzBrandMark({ variant = 'hero', className = '', onClick, role }) {
  const isHeader = variant === 'header';

  return (
    <div
      className={`la3ibz-brand la3ibz-brand--${variant}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      role={role}
    >
      <div className="la3ibz-brand__mark" aria-hidden="true">
        <div className="la3ibz-brand__mark-inner">
          <img
            className="la3ibz-brand__icon"
            src={BRAND_ICON_SRC}
            alt=""
            draggable={false}
          />
        </div>
      </div>
      <div className="la3ibz-brand__copy">
        <span className="la3ibz-brand__name">{PLATFORM_NAME}</span>
        {!isHeader ? (
          <p className="la3ibz-brand__tagline">{PLATFORM_TAGLINE}</p>
        ) : (
          <span className="la3ibz-brand__en">{PLATFORM_NAME_EN}</span>
        )}
      </div>
    </div>
  );
}
