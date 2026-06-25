import { createPortal } from 'react-dom';
import {
  LEGAL_DOCUMENTS,
  SUPPORT_WHATSAPP,
  SUPPORT_WHATSAPP_URL,
} from '../../core/legalContent';

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
            <p className="legal-contact">
              للتواصل:{' '}
              <a
                className="legal-contact__link"
                href={SUPPORT_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {SUPPORT_WHATSAPP}
              </a>
            </p>
          ) : null}
        </div>

        <button type="button" className="btn bg legal-modal-done" onClick={onClose}>
          حسناً
        </button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
