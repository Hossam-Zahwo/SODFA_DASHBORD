'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {useTranslation} from '@/app/language';

import type {Waybill} from '@/lib/types';
import {HomeyLogo} from '@/components/homey-logo';

const latin=(value:string)=>String(value||'').replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-0x6f0));

// The chosen date is only part of the print preview. It does not change
// the original order date or add a database field.
const formatPrintDate=(date:string)=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return '';
 const [year,month,day]=date.split('-').map(Number);
 const value=new Date(year,month-1,day);
 if(value.getFullYear()!==year||value.getMonth()+1!==month||value.getDate()!==day)return '';
 return [String(day).padStart(2,'0'),String(month).padStart(2,'0'),String(year)].join('/');
};

export function WaybillLabel({waybill:w,printDate}:{waybill:Waybill;printDate?:string}){
 const t=useTranslation();
 const currency=(value:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2,numberingSystem:'latn'}).format(Math.max(0,Number(value)||0))+' '+t('ج.م');
 const printedDate=printDate?formatPrintDate(printDate):'';
 return <article className="shipping-label">
   <header className={'shipping-label-header '+(w.brand==='homey'?'shipping-label-header-homey':'')}>{w.brand==='homey'?<HomeyLogo className="shipping-label-homey-logo"/>:<><strong>{t("صدفة")}</strong><span>SODFA</span></>}</header>
   <div className="shipping-label-print-date" aria-hidden={!printedDate}>
    {printedDate&&<><span>{t("تاريخ الإنشاء")}</span><strong dir="ltr">{printedDate}</strong></>}
   </div>
   <div className="shipping-label-title">{t("بيانات المستلم")}</div>
   <div className="shipping-label-detail"><span>{t("اسم العميل")}</span><strong>{w.customerName}</strong></div>
   <div className="shipping-label-detail"><span>{t("رقم الهاتف")}</span><strong className="shipping-label-phone" dir="ltr">{latin(w.phone)}</strong></div>
   <div className="shipping-label-detail"><span>{t("رقم بديل")}</span><strong className="shipping-label-phone" dir="ltr">{latin(w.alternatePhone||'—')}</strong></div>
   <div className="shipping-label-dual">
    <div className="shipping-label-detail"><span>{t("المحافظة")}</span><strong>{w.governorate||'—'}</strong></div>
    <div className="shipping-label-detail"><span>{t("المدينة / المنطقة")}</span><strong>{w.city||'—'}</strong></div>
   </div>
   <div className="shipping-label-text">
    <div className="shipping-label-detail shipping-label-address"><span>{t("العنوان بالتفصيل")}</span><strong>{w.address?.trim()||'—'}</strong></div>
    {w.notes?.trim()&&<div className="shipping-label-note"><span>{t("ملاحظات")}</span><strong>{w.notes.trim()}</strong></div>}
   </div>
   <div className="shipping-label-total"><span>{t("المطلوب تحصيله")}</span><strong dir="ltr">{currency(w.collectionAmount)}</strong></div>
 </article>;
}

export function WaybillPrintSheets({waybills,perPage,printDate,printDates}:{waybills:Waybill[];perPage:3|4;printDate?:string;printDates?:Record<string,string>}){
 const t=useTranslation();
 const container=useRef<HTMLDivElement>(null);
 const [previewScale,setPreviewScale]=useState(1);
 useEffect(()=>{
  const preview=container.current;
  if(!preview)return;
  function resize(){
   const sheet=preview?.querySelector<HTMLElement>('.shipping-sheet');
   if(sheet?.offsetWidth&&preview?.clientWidth){
    setPreviewScale(Math.min(1,preview.clientWidth/sheet.offsetWidth));
   }
  }
  resize();
  const observer=new ResizeObserver(resize);
  observer.observe(preview);
  return ()=>observer.disconnect();
 },[waybills.length]);
 const chunks:Waybill[][]=[];
 for(let i=0;i<waybills.length;i+=perPage)chunks.push(waybills.slice(i,i+perPage));
 return <div ref={container} className={'shipping-sheets shipping-sheets-'+perPage}
  style={{'--waybill-preview-scale':previewScale} as CSSProperties}>
  {chunks.map((group,idx)=><div className="shipping-sheet-frame" key={idx}><section className="shipping-sheet" aria-label={t("صفحة ")+(idx+1)}>
    {group.map(w=><WaybillLabel key={w.id} waybill={w} printDate={printDates?.[w.id]??printDate}/>)}
  </section></div>)}
 </div>;
}
