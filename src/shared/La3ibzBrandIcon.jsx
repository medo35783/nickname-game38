import { BRAND_ICON_SRC } from '../core/constants';

/** أيقونة L3B — للشريط السفلي والفوتر وغيرها */
export default function La3ibzBrandIcon({ size = 'md', className = '', alt = '' }) {
  return (
    <span className={`la3ibz-icon-chip la3ibz-icon-chip--${size}${className ? ` ${className}` : ''}`}>
      <img src={BRAND_ICON_SRC} alt={alt} draggable={false} />
    </span>
  );
}
