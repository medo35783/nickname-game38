import { useState } from 'react';
import LegalModal from './LegalModal';

/** @type {{ id: import('../../core/legalContent').LegalDocumentId; label: string }[]} */
const LINKS = [
  { id: 'terms', label: 'الشروط', title: 'الشروط والأحكام' },
  { id: 'privacy', label: 'الخصوصية', title: 'سياسة الخصوصية' },
  { id: 'refund', label: 'الاسترجاع', title: 'سياسة الاسترجاع' },
];

export default function LegalFooterLinks() {
  const [openDoc, setOpenDoc] = useState(null);

  return (
    <>
      <nav className="site-footer-legal" aria-label="السياسات القانونية">
        {LINKS.map((link, index) => (
          <span key={link.id} className="site-footer-legal-item">
            {index > 0 ? (
              <span className="site-footer-sep" aria-hidden="true">
                ·
              </span>
            ) : null}
            <button
              type="button"
              className="site-footer-legal-link"
              title={link.title}
              onClick={() => setOpenDoc(link.id)}
            >
              {link.label}
            </button>
          </span>
        ))}
      </nav>

      {openDoc ? <LegalModal documentId={openDoc} onClose={() => setOpenDoc(null)} /> : null}
    </>
  );
}
