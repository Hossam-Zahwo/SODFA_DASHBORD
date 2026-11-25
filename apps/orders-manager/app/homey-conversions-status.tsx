'use client';
import { ordersManagerPath } from "@/lib/app-path";
import {useCallback,useEffect,useState} from 'react';

type Status={
  configured:{webhook:boolean;meta:boolean;tiktok:boolean};
  summary:{total:number;meta_sent:number;tiktok_sent:number;errors:number;pending:number;last_update:string|null};
};
export function HomeyConversionsStatus(){
  const [data,setData]=useState<Status|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const response=await fetch(ordersManagerPath('/api/integrations/homey/conversions/status'),{credentials:'same-origin',cache:'no-store'});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'تعذر قراءة الربط');
      setData(result);
    }catch(e){setError((e as Error).message);}finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  return <section className="panel" aria-label="متابعة تحويلات هومي">
    <div className="sectionhead"><h2>ربط تحويلات HOMEY — Meta وTikTok</h2><button type="button" className="btn tiny secondary" onClick={()=>void load()} disabled={loading}>تحديث الحالة</button></div>
    <p>الأحداث دي خاصة بطلبات موقع هومي فقط. طلبات صدفة والإدخالات اليدوية لا تُرسل تلقائيًا إلى حسابات إعلانات هومي.</p>
    {error&&<p role="alert">{error}</p>}
    {data&&<>
      <p>إعدادات السيرفر: Webhook {data.configured.webhook?'✓':'غير مضبوط'} · Meta {data.configured.meta?'✓':'غير مضبوط'} · TikTok {data.configured.tiktok?'✓':'غير مضبوط'}</p>
      <p>إجمالي سجلات التوصيل: <strong>{data.summary.total}</strong> · Meta ناجحة: <strong>{data.summary.meta_sent}</strong> · TikTok ناجحة: <strong>{data.summary.tiktok_sent}</strong> · أخطاء: <strong>{data.summary.errors}</strong> · معلّقة: <strong>{data.summary.pending}</strong></p>
      <small>آخر تحديث: {data.summary.last_update?new Date(data.summary.last_update).toLocaleString('ar-EG'):'لا توجد أحداث بعد'}</small>
    </>}
  </section>;
}
