import { BRAND_ICON_SRC, BRAND_ICON_DARK_SRC } from '../core/constants';

/** أيقونة L3B — للشريط السفلي والفوتر وغيرها */
export default function La3ibzBrandIcon({ size = 'md', className = '', alt = '' }) {
  const base = `la3ibz-icon-img la3ibz-icon-img--${size}${className ? ` ${className}` : ''}`;

  return (
    <>
      <img className={`${base} la3ibz-icon-img--light`} src={BRAND_ICON_SRC} alt={alt} draggable={false} />
      <img className={`${base} la3ibz-icon-img--dark`} src={BRAND_ICON_DARK_SRC} alt="" aria-hidden="true" draggable={false} />
    </>
  );
}
