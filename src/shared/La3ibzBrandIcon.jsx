import { BRAND_ICON_SRC } from '../core/constants';

/** أيقونة L3B — للشريط السفلي والفوتر وغيرها */
export default function La3ibzBrandIcon({ size = 'md', className = '', alt = '' }) {
  return (
    <img
      className={`la3ibz-icon-img la3ibz-icon-img--${size}${className ? ` ${className}` : ''}`}
      src={BRAND_ICON_SRC}
      alt={alt}
      draggable={false}
    />
  );
}
