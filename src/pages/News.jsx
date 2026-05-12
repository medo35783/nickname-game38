export default function News() {
  return (
    <div className="scr">
      <div className="ptitle">🔔 آخر الأخبار</div>
      <div className="psub">تحديثات التطبيق والميزات الجديدة</div>
      {[{id:1,date:'2025-03-29',title:'🎉 إطلاق النسخة التجريبية',body:'تم إطلاق لعبة الألقاب رسمياً مع دعم الغرف الحقيقية عبر Firebase!',isNew:true},{id:2,date:'2025-03-25',title:'⚡ نظام الهجوم المتزامن',body:'الكل يهاجم في نفس الوقت — سرية تامة ثم كشف مفاجئ.',isNew:true},{id:3,date:'2025-03-20',title:'📊 إحصائيات الإثارة',body:'أكثر لقب مطاردة وأقل اسم استهدافاً.',isNew:false}].map(n=>(
      <div key={n.id} className="news-item"><div className="news-date">{n.isNew&&<span className="news-new">جديد</span>}{n.date}</div><div className="news-title">{n.title}</div><div className="news-body">{n.body}</div></div>
    ))}</div>
  );
}
