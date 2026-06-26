import { useState } from 'react';
import LegalModal from '../layout/LegalModal';

/** @type {{ id: import('../../core/legalContent').LegalDocumentId; label: string }[]} */
const LINKS = [
  { id: 'terms', label: 'الشروط والأحكام' },
  { id: 'privacy', label: 'سياسة الخصوصية' },
  { id: 'refund', label: 'سياسة الاسترجاع' },
];

export default function PackagesLegalNotice() {
  const [openDoc, setOpenDoc] = useState(null);

  return (
    <>
      <aside className="pkg-legal-notice" aria-label="السياسات القانونية">
        <p className="pkg-legal-notice__text">
          بالضغط على <strong>«اشترك»</strong> فأنت توافق على الشروط والأحكام وسياسة الخصوصية
        </p>
        <div className="pkg-legal-notice__chips">
          {LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              className="pkg-legal-notice__chip"
              onClick={() => setOpenDoc(link.id)}
            >
              {link.label}
            </button>
          ))}
        </div>
      </aside>

      {openDoc ? <LegalModal documentId={openDoc} onClose={() => setOpenDoc(null)} /> : null}
    </>
  );
}
