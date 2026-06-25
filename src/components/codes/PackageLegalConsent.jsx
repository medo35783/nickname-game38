import { useState } from 'react';
import LegalModal from '../layout/LegalModal';

export default function PackageLegalConsent() {
  const [openDoc, setOpenDoc] = useState(null);

  return (
    <>
      <p className="pkg-tier__consent">
        <span className="pkg-tier__consent-icon" aria-hidden="true">
          ✓
        </span>
        بالضغط على &quot;اشترك&quot; فأنت توافق على{' '}
        <button type="button" className="pkg-tier__consent-link" onClick={() => setOpenDoc('terms')}>
          الشروط والأحكام
        </button>{' '}
        و{' '}
        <button type="button" className="pkg-tier__consent-link" onClick={() => setOpenDoc('privacy')}>
          سياسة الخصوصية
        </button>
      </p>

      {openDoc ? <LegalModal documentId={openDoc} onClose={() => setOpenDoc(null)} /> : null}
    </>
  );
}
