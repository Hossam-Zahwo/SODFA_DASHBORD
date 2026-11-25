'use client';
import { ordersManagerPath } from "@/lib/app-path";
import {useTranslation} from '@/app/language';

import {printDocuments,printKeys} from '@/lib/print-history';
import {useEffect,useState} from 'react';
import type {Waybill} from '@/lib/types';
import {WaybillPrintSheets} from '@/components/waybill-print-sheets';

export default function WaybillPrint({params}:{params:Promise<{id:string}>}){
 const t=useTranslation();
 const [record,setRecord]=useState<Waybill|null>(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [perPage,setPerPage]=useState<3|4>(4);
 const [printDate,setPrintDate]=useState('');
 useEffect(()=>{const now=new Date();const local=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);setPrintDate(local)},[]);
 useEffect(()=>{
  let active=true;
  params.then(async({id})=>{
   try{
    const response=await fetch(ordersManagerPath('/api/waybills/')+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store'});
    const json=await response.json();
    if(!response.ok)throw Error(json.error||'تعذر تحميل البوليصة');
    if(active)setRecord(json.data);
   }catch(e){if(active)setError(e instanceof Error?e.message:'تعذر تحميل البوليصة')}
   finally{if(active)setLoading(false)}
  });
  return()=>{active=false};
 },[params]);
 if(loading)return <main className="shipping-print-state">{t("جاري تجهيز بوليصة الشحن...")}</main>;
 if(!record||error)return <main className="shipping-print-state">{error||t("البوليصة غير موجودة")} <a href={ordersManagerPath("/")}>{t("الرجوع للوحة التحكم")}</a></main>;
 return <main className="shipping-print-view">
   <div className="shipping-print-toolbar">
    <a href={ordersManagerPath("/")}>{t("الرجوع لإدارة الطلبات")}</a>
    <div className="shipping-print-controls">
     <label className="shipping-print-date-control">{t("تاريخ الطباعة")}
      <input type="date" value={printDate} onChange={e=>setPrintDate(e.target.value)} aria-label={t("تاريخ الطباعة على البوليصة")}/>
     </label>
     <label>{t("عدد البوالص في ورقة A4")}
      <select value={perPage} onChange={e=>setPerPage(Number(e.target.value) as 3|4)}><option value={4}>{t("4 بوالص")}</option><option value={3}>{t("3 بوالص")}</option></select>
     </label>
     <button onClick={()=>void printDocuments(printKeys([{...record,id:record.orderId}])).catch(()=>alert(t('اتفتح مربع الطباعة، لكن حالة الطباعة ما اتحفظتش.')))}>{t("طباعة / حفظ PDF")}</button>
    </div>
   </div>
   <p className="shipping-print-help">{t("دي معاينة ملصق الشحن المختصر. لو بتطبع بوليصة واحدة هتظهر في أول مكان من الورقة، وتقدر تجمع 3 أو 4 بوالص من صفحة «البوالص».")}</p>
   <WaybillPrintSheets waybills={[record]} perPage={perPage} printDate={printDate}/>
 </main>;
}
