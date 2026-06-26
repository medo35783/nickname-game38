import { createPortal } from 'react-dom';
import { LEGAL_DOCUMENTS, SUPPORT_WHATSAPP_URL } from '../../core/legalContent';

function IconWhatsApp({ size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

/**
 * @param {object} props
 * @param {import('../../core/legalContent').LegalDocumentId} props.documentId
 * @param {() => void} props.onClose
 */
export default function LegalModal({ documentId, onClose }) {
  const doc = LEGAL_DOCUMENTS[documentId];
  if (!doc) return null;

  const content = (
    <div
      className="legal-portal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`legal-title-${documentId}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="legal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="legal-modal-head">
          <div className="legal-modal-head-text">
            <h2 id={`legal-title-${documentId}`} className="legal-modal-title">
              {doc.title}
            </h2>
            {doc.subtitle ? <p className="legal-modal-sub">{doc.subtitle}</p> : null}
          </div>
          <button type="button" className="btn bgh bxs legal-modal-close" onClick={onClose} aria-label="إغلاق">
            ✕
          </button>
        </div>

        <div className="legal-modal-body">
          <ul className="legal-points">
            {doc.points.map((point) => (
              <li key={point} className="legal-point">
                {point}
              </li>
            ))}
          </ul>

          {doc.contactWhatsApp ? (
            <div className="legal-contact">
              <span className="legal-contact__label">للتواصل</span>
              <a
                className="legal-contact__wa"
                href={SUPPORT_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="تواصل عبر واتساب"
                title="واتساب"
              >
                <IconWhatsApp />
              </a>
            </div>
          ) : null}
        </div>

        <button type="button" className="btn legal-modal-done" onClick={onClose}>
          حسناً
        </button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
