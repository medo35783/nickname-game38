import { SUPPORT_WHATSAPP_URL } from './constants';

/** @typedef {'terms' | 'privacy' | 'refund'} LegalDocumentId */

/** @typedef {{ id: LegalDocumentId; title: string; subtitle?: string; points: string[]; contactWhatsApp?: boolean }} LegalDocument */

export const LEGAL_ORG_SUBTITLE = 'مؤسسة لعيب زون للخدمات التجارية';

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
      'يمكنك طلب حذف بياناتك في أي وقت عبر التواصل معنا',
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
