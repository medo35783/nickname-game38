import {
  PLATFORM_NAME,
  PLATFORM_NAME_EN,
  PLATFORM_SLOGAN,
  BRAND_LOGO_VERTICAL_SRC,
  BRAND_LOGO_HEADER_SRC,
} from '../core/constants';

/** شعار لعيب زون — عمودي في الرئيسية، أفقي في الهيدر */
export default function La3ibzBrandMark({ variant = 'hero', className = '', onClick, role }) {
  if (variant === 'header') {
    return (
      <div
        className={`la3ibz-brand la3ibz-brand--header${className ? ` ${className}` : ''}`}
        onClick={onClick}
        role={role}
      >
        <img
          className="la3ibz-brand__logo-header"
          src={BRAND_LOGO_HEADER_SRC}
          alt={`${PLATFORM_NAME} — ${PLATFORM_NAME_EN}`}
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div
      className={`la3ibz-brand la3ibz-brand--hero${className ? ` ${className}` : ''}`}
      onClick={onClick}
      role={role}
    >
      <img
        className="la3ibz-brand__logo-vertical"
        src={BRAND_LOGO_VERTICAL_SRC}
        alt={`${PLATFORM_NAME} — ${PLATFORM_NAME_EN}`}
        draggable={false}
      />
      <p className="la3ibz-brand__slogan">{PLATFORM_SLOGAN}</p>
    </div>
  );
}
