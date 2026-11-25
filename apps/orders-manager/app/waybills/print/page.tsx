'use client';
import { ordersManagerPath } from "@/lib/app-path";
import {useTranslation} from '@/app/language';

import {printDocuments,printKeys} from '@/lib/print-history';
import {useEffect,useState} from 'react';
import type {Waybill} from '@/lib/types';
import {WaybillPrintSheets} from '@/components/waybill-print-sheets';

export default function BatchWaybillPrint(){
 const t=useTranslation();
 const [waybills,setWaybills]=useState<Waybill[]>([]);
 const [perPage,setPerPage]=useState<3|4>(4);
 const [printDate,setPrintDate]=useState('');
 const [perWaybillPrintDates,setPerWaybillPrintDates]=useState<Record<string,string>>({});
 useEffect(()=>{const now=new Date();const local=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);setPrintDate(local)},[]);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  let active=true;
  async function load(){
   try{
    const ids=new URLSearchParams(window.location.search).get('ids')?.split(',').filter(Boolean)||[];
    const unique=[...new Set(ids)];
    if(!unique.length||unique.length>100||unique.some(x=>!/^[0-9a-f-]{36}$/i.test(x)))throw Error('اختار من 1 إلى 100 بوليصة من لوحة الإدارة');
    const response=await fetch(ordersManagerPath('/api/waybills'),{credentials:'same-origin',cache:'no-store'});
    const body=await response.json();
    if(!response.ok)throw Error(body.error||'تعذر قراءة البوالص');
    const map=new Map<string,Waybill>((body.data as Waybill[]).map(w=>[w.id,w]));
    const selected=unique.map(id=>map.get(id)).filter((w):w is Waybill=>Boolean(w));
    if(selected.length!==unique.length)throw Error('في بوالص مش موجودة أو مش متاحة للطباعة');
    if(active)setWaybills(selected);
   }catch(e){if(active)setError(e instanceof Error?e.message:'تعذر تحميل البوالص')}
   finally{if(active)setLoading(false)}
  }
  void load();return()=>{active=false};
 },[]);
 if(loading)return <main className="shipping-print-state">{t("جاري تجهيز البوالص للطباعة...")}</main>;
 if(error)return <main className="shipping-print-state">{t(error)} <a href={ordersManagerPath("/")}>{t("الرجوع للوحة التحكم")}</a></main>;
 return <main className="shipping-print-view">
   <div className="shipping-print-toolbar">
    <a href={ordersManagerPath("/")}>{t("الرجوع لإدارة الطلبات")}</a>
    <div className="shipping-print-controls">
     <span>{t("عدد البوالص:")} {waybills.length}</span>
     <label className="shipping-print-date-control">{t("تاريخ الطباعة")}
      <input type="date" value={printDate} onChange={e=>setPrintDate(e.target.value)} aria-label={t("تاريخ الطباعة على البوليصة")}/>
     </label>
     <button type="button" className="shipping-print-reset-dates" onClick={()=>setPerWaybillPrintDates({})}>{t("توحيد تاريخ كل البوالص")}</button>
     <label>{t("عدد البوالص في ورقة A4")}
      <select value={perPage} onChange={e=>setPerPage(Number(e.target.value) as 3|4)}>
       <option value={4}>{t("4 بوالص / ورقة")}</option>
       <option value={3}>{t("3 بوالص / ورقة")}</option>
      </select>
     </label>
     <button onClick={()=>void printDocuments(printKeys(waybills.map(w=>({...w,id:w.orderId})))).catch(()=>alert(t('اتفتح مربع الطباعة، لكن حالة الطباعة ما اتحفظتش.')))}>{t("طباعة / حفظ PDF")}</button>
    </div>
   </div>
   <p className="shipping-print-help">{t("تاريخ الطباعة مستقل عن تاريخ إنشاء الأوردر. غير التاريخ العام فوق، أو خصّص تاريخ بوليصة بعينها من الجدول ده. التعديلات هنا للطباعة فقط ولا تغيّر تاريخ الطلب المحفوظ.")}</p>
   <section className="shipping-print-date-editor" aria-label={t("تعديل تاريخ طباعة كل بوليصة")}>
    <h2>{t("تواريخ طباعة البوالص")}</h2>
    <div className="shipping-print-date-list">
     {waybills.map(w=><div className="shipping-print-date-row" key={w.id}>
      <div className="shipping-print-date-customer"><strong>{w.customerName}</strong><small dir="ltr">{w.phone}</small></div>
      <label>{t("تاريخ الطباعة")}
       <input type="date" aria-label={t("تاريخ طباعة بوليصة ")+w.customerName} value={perWaybillPrintDates[w.id]??printDate}
        onChange={e=>setPerWaybillPrintDates(prev=>({...prev,[w.id]:e.target.value}))}/>
      </label>
      <button type="button" disabled={perWaybillPrintDates[w.id]===undefined} onClick={()=>setPerWaybillPrintDates(prev=>{const next={...prev};delete next[w.id];return next})}>{t("استخدم التاريخ العام")}</button>
     </div>)}
    </div>
   </section>
   <WaybillPrintSheets waybills={waybills} perPage={perPage} printDate={printDate} printDates={perWaybillPrintDates}/>
 </main>;
}
