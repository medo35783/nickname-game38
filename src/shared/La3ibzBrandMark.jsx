import {
  PLATFORM_NAME,
  PLATFORM_NAME_EN,
  PLATFORM_SLOGAN,
  BRAND_LOGO_VERTICAL_SRC,
  BRAND_LOGO_VERTICAL_DARK_SRC,
  BRAND_LOGO_HEADER_SRC,
  BRAND_LOGO_HEADER_DARK_SRC,
} from '../core/constants';

function BrandLogoPair({ variant, alt }) {
  const cls = variant === 'header' ? 'la3ibz-brand__logo-header' : 'la3ibz-brand__logo-vertical';

  return (
    <>
      <img className={`${cls} la3ibz-brand__logo--light`} src={variant === 'header' ? BRAND_LOGO_HEADER_SRC : BRAND_LOGO_VERTICAL_SRC} alt={alt} draggable={false} />
      <img className={`${cls} la3ibz-brand__logo--dark`} src={variant === 'header' ? BRAND_LOGO_HEADER_DARK_SRC : BRAND_LOGO_VERTICAL_DARK_SRC} alt="" aria-hidden="true" draggable={false} />
    </>
  );
}

/** شعار لعيب زون — عمودي في الرئيسية، أفقي في الهيدر */
export default function La3ibzBrandMark({ variant = 'hero', className = '', onClick, role }) {
  const alt = `${PLATFORM_NAME} — ${PLATFORM_NAME_EN}`;

  if (variant === 'header') {
    return (
      <div
        className={`la3ibz-brand la3ibz-brand--header${className ? ` ${className}` : ''}`}
        onClick={onClick}
        role={role}
      >
        <BrandLogoPair variant="header" alt={alt} />
      </div>
    );
  }

  return (
    <div
      className={`la3ibz-brand la3ibz-brand--hero${className ? ` ${className}` : ''}`}
      onClick={onClick}
      role={role}
    >
      <BrandLogoPair variant="hero" alt={alt} />
      <p className="la3ibz-brand__slogan">{PLATFORM_SLOGAN}</p>
    </div>
  );
}
