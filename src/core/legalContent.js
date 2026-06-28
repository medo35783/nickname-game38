import { SUPPORT_WHATSAPP_URL } from './constants';

/** @typedef {'terms' | 'privacy' | 'refund'} LegalDocumentId */

/** @typedef {{ id: LegalDocumentId; title: string; subtitle?: string; points: string[]; contactWhatsApp?: boolean }} LegalDocument */

export const LEGAL_ORG_SUBTITLE = 'مؤسسة لعيب زون للخدمات التجارية';

export const LEGAL_CR_NUMBER = '7054655910';

export const LEGAL_ADDRESS = 'المملكة العربية السعودية — القصيم';

/** @type {string | null} يُضاف عند التسجيل في ضريبة القيمة المضافة */
export const LEGAL_VAT_NUMBER = null;

/** @type {{ name: string; crNumber: string; address: string; vatNumber: string | null }} */
export const LEGAL_ENTITY = {
  name: LEGAL_ORG_SUBTITLE,
  crNumber: LEGAL_CR_NUMBER,
  address: LEGAL_ADDRESS,
  vatNumber: LEGAL_VAT_NUMBER,
};

/** @type {Record<LegalDocumentId, LegalDocument>} */
export const LEGAL_DOCUMENTS = {
  terms: {
    id: 'terms',
    title: 'الشروط والأحكام',
    subtitle: LEGAL_ORG_SUBTITLE,
    points: [
      'الاشتراك يمنح المشرف صلاحية إنشاء غرف لعب وإدارة جلسات تفاعلية خلال مدة الباقة المختارة',
      'تبدأ مدة الباقة فور تفعيل الكود',
      'الكود للاستخدام الشخصي ولا يُشارك مع أطراف أخرى',
      'تحتفظ المنصة بحق إيقاف أي حساب يُساء استخدامه',
      'الأسعار بالريال السعودي وتشمل ضريبة القيمة المضافة',
      'نستقبل الشكاوى والاستفسارات عبر واتساب أو صفحة «صوتك» أو البريد، ونرد خلال 24–48 ساعة عمل',
    ],
  },
  privacy: {
    id: 'privacy',
    title: 'سياسة الخصوصية',
    subtitle: LEGAL_ORG_SUBTITLE,
    points: [
      'نجمع فقط البيانات الضرورية لتشغيل الخدمة (اسم المستخدم، رقم الجلسة)',
      'لا نشارك بياناتك مع أطراف ثالثة',
      'بيانات الدفع تُعالَج عبر مُيسّر المرخصة من البنك المركزي السعودي ولا تُخزَّن لدينا',
      'يمكنك طلب حذف حسابك وبياناتك في أي وقت عبر «حسابي → المزيد → طلب حذف الحساب» أو التواصل معنا',
    ],
  },
  refund: {
    id: 'refund',
    title: 'سياسة الاسترجاع',
    subtitle: LEGAL_ORG_SUBTITLE,
    points: [
      'بسبب طبيعة الخدمة الرقمية، لا يُقبل الاسترجاع بعد تفعيل الكود واستخدام الخدمة',
      'في حال وجود خلل تقني يمنع الاستخدام الكامل، يُرجى التواصل معنا خلال 24 ساعة وسنعوّضك بكود جديد',
    ],
    contactWhatsApp: true,
  },
};

export { SUPPORT_WHATSAPP_URL };
