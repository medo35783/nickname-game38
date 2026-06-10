import { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { fetchBankStats, fetchMyContributions } from '../question-bank/qbank.helpers';
import KnowledgeBankSpotlight from './KnowledgeBankSpotlight';

function formatStatsLine(items) {
  if (!items.length) return 'لم ترسل مقترحاً بعد — اضغط لإضافة سؤال';
  const approved = items.filter((q) => q.status === 'approved').length;
  const pending = items.filter((q) => q.status === 'pending').length;
  const rejected = items.filter((q) => q.status === 'rejected').length;
  const parts = [];
  if (approved > 0) parts.push(`${approved} معتمد`);
  if (pending > 0) parts.push(`${pending} قيد المراجعة`);
  if (rejected > 0) parts.push(`${rejected} مرفوض`);
  return parts.length ? `مقترحاتك: ${parts.join(' · ')}` : 'مقترحاتك المرسلة';
}

/**
 * بنك المعرفة في حسابي — بطاقة موحّدة مع إحصائيات المساهمات
 */
export default function AccountKnowledgeBank({ onOpenContribute }) {
  const [bankTotal, setBankTotal] = useState(null);
  const [statsLine, setStatsLine] = useState('…');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [stats, rows] = await Promise.all([
          fetchBankStats().catch(() => null),
          fetchMyContributions({ uid: auth.currentUser?.uid || null }).catch(() => []),
        ]);
        if (!active) return;
        setBankTotal(stats?.total ?? null);
        setStatsLine(formatStatsLine(rows));
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <div style={{ marginBottom: 12 }}>
      <KnowledgeBankSpotlight
        wide
        onClick={onOpenContribute}
        bankTotal={bankTotal}
        statsLine={ready ? statsLine : 'جاري التحميل…'}
      />
    </div>
  );
}
