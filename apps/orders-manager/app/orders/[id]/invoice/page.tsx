'use client';
import {useTranslation} from '@/app/language';

import {printDocuments,printKeys} from '@/lib/print-history';
import {useEffect,useState} from 'react';
import {Printer,ArrowRight,ShoppingBag} from 'lucide-react';
import type {Order} from '@/lib/types';
import {collectionFromCustomer} from '@/lib/carrier-tracking';
import {calculatedTotal,totalOf} from '@/lib/types';
import {HomeyLogo} from '@/components/homey-logo';
export default function Invoice({params}:{params:Promise<{id:string}>}){
 const t=useTranslation();
 const fmt=(n:number)=>new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+' '+t('ج.م');
 const [order,setOrder]=useState<Order|null>(null),[err,setErr]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;params.then(async({id})=>{try{const r=await fetch('/api/orders',{credentials:'same-origin',cache:'no-store'});const j=await r.json();if(!r.ok)throw Error('لازم تسجّل الدخول الأول');const found=(j.data as Order[]).find(x=>x.id===id);if(!found)throw Error('الطلب غير موجود');if(active)setOrder(found)}catch(e){if(active)setErr(e instanceof Error?e.message:'حصل خطأ')}finally{if(active)setLoading(false)}});return()=>{active=false}},[params]);
 if(loading)return <main className="invoice-state">{t("جاري تحميل الفاتورة...")}</main>;
 if(err||!order)return <main className="invoice-state">{err||t("الفاتورة غير متاحة")} <a href="/">{t("رجوع")}</a></main>;
 const subtotal=order.items.reduce((v,x)=>v+x.price*x.quantity,0);
 const manualAdjustment=Math.round((totalOf(order)-calculatedTotal(order))*100)/100;
 return <main className="invoice-page">
  <div className="invoice-actions"><a href="/"><ArrowRight size={17}/>{t("الرجوع للطلبات")}</a><button onClick={()=>void printDocuments(printKeys([order])).catch(()=>alert(t('اتفتح مربع الطباعة، لكن حالة الطباعة ما اتحفظتش.')))}><Printer size={18}/>{t("طباعة / حفظ PDF")}</button></div>
  <article className="invoice-paper">
   <header className="invoice-head"><div><div className="invoice-logo">{order.brand==='homey'?<HomeyLogo className="invoice-homey-logo"/>:<><ShoppingBag size={27}/><span>{t("صدفة | SODFA")}</span></>}</div><p>{t("فاتورة طلب شراء")}</p></div><div className="invoice-ref"><strong>#{order.id.slice(0,8).toUpperCase()}</strong><span>{t("تاريخ الطلب:")} {new Date(order.createdAt).toLocaleDateString('en-GB')}</span></div></header>
   <div className="invoice-banner">{t("فاتورة شراء")}</div>
   <section className="invoice-customer"><h2>{t("بيانات العميل")}</h2><div className="invoice-details"><div><span>{t("اسم العميل")}</span><strong>{order.customerName}</strong></div><div><span>{t("رقم الهاتف")}</span><strong dir="ltr">{order.phone}</strong></div><div><span>{t("عنوان التسليم")}</span><strong>{[order.governorate,order.city,order.address].filter(Boolean).join('، ')}</strong></div><div><span>{t("رقم بديل")}</span><strong dir="ltr">{order.alternatePhone||'—'}</strong></div></div></section>
   <section><h2>{t("تفاصيل الطلب")}</h2><table className="invoice-table"><thead><tr><th>{t("المنتج")}</th><th>{t("الكمية")}</th><th>{t("سعر الوحدة")}</th><th>{t("الإجمالي")}</th></tr></thead><tbody>{order.items.map((x,i)=><tr key={i}><td>{x.name}{x.sku&&<small>SKU: {x.sku}</small>}</td><td>{x.quantity}</td><td>{fmt(x.price)}</td><td>{fmt(x.price*x.quantity)}</td></tr>)}</tbody></table></section>
   <section className="invoice-summary"><div><span>{t("إجمالي المنتجات")}</span><strong>{fmt(subtotal)}</strong></div>{order.discount>0&&<div><span>{t("الخصم")}</span><strong>-{fmt(order.discount)}</strong></div>}{order.shipping>0&&<div><span>{t("الشحن")}</span><strong>{fmt(order.shipping)}</strong></div>}{manualAdjustment!==0&&<div><span>{t("تعديل السعر الإجمالي")}</span><strong>{fmt(manualAdjustment)}</strong></div>}<div className="invoice-final"><span>{t("إجمالي الفاتورة شامل الشحن")}</span><strong>{fmt(totalOf(order))}</strong></div>{order.prepaid>0&&<div><span>{t("المدفوع مقدمًا")}</span><strong>{fmt(order.prepaid)}</strong></div>}{(order.prepaid>0||order.manualCollection!=null)&&<div><span>{t("المتبقي للتحصيل")}</span><strong>{fmt(collectionFromCustomer(order))}</strong></div>}</section>
   {order.notes&&<p className="invoice-notes"><b>{t("ملاحظات:")}</b> {order.notes}</p>}
   <footer>{t("شكرًا لتعاملك معنا")}<small>{t("الفاتورة صادرة من نظام إدارة الطلبات الداخلي.")}</small></footer>
  </article>
  <style jsx global>{`
   body:has(.invoice-page){background:#eef2e9;color:#24352a}.invoice-state{text-align:center;padding:90px}
   .invoice-page{max-width:850px;margin:0 auto;padding:28px 16px;font-family:Tahoma,Arial,sans-serif}
   .invoice-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:16px}
   .invoice-actions a{display:flex;align-items:center;gap:7px;color:#365b37}
   .invoice-actions button{border:0;border-radius:10px;background:#54743c;color:white;padding:12px 20px;display:flex;align-items:center;gap:8px;font-weight:bold}
   .invoice-paper{background:white;border:1px solid #dce5d7;border-top:7px solid #466235;border-radius:18px;padding:36px;box-shadow:0 30px 80px #2b4d2822}
   .invoice-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:22px}
   .invoice-logo{display:flex;align-items:center;gap:10px;font-weight:bold;color:#385a31;font-size:24px}
   .invoice-head p{color:#859281;font-size:14px}.invoice-ref{display:flex;flex-direction:column;gap:8px;text-align:left;direction:ltr}.invoice-ref strong{font-size:20px}.invoice-ref span{font-size:12px;color:#738173}
   .invoice-banner{background:#edf4e8;color:#335632;text-align:center;border-radius:8px;padding:12px;font-weight:bold;margin:20px 0 25px}
   .invoice-paper h2{font-size:16px;color:#335333;border-bottom:1px solid #e5ede0;padding-bottom:12px;margin:27px 0 16px}
   .invoice-details{display:grid;grid-template-columns:1fr 1fr;gap:18px}.invoice-details div{display:flex;flex-direction:column;gap:7px}.invoice-details span{color:#7b8a79;font-size:12px}.invoice-details strong{font-size:14px}
   .invoice-table{width:100%;border-collapse:collapse;text-align:right}.invoice-table th{background:#f2f6ef;color:#536b50;font-size:12px}.invoice-table td,.invoice-table th{padding:13px 10px;border-bottom:1px solid #eaf0e7;font-size:13px}.invoice-table small{display:block;color:#7c8978;margin-top:5px}.invoice-table td:not(:first-child){white-space:nowrap}
   .invoice-summary{max-width:410px;margin:27px 0 22px auto;background:#f8faf6;border:1px solid #e4ecdf;border-radius:13px;padding:17px;display:grid;gap:14px}.invoice-summary div{display:flex;justify-content:space-between;gap:10px;font-size:13px}.invoice-summary .invoice-final{padding:16px 4px;border-top:1px solid #d5e3cc;color:#2b5429;font-size:17px;font-weight:bold}
   .invoice-notes{padding:12px;background:#f8faf7;border-radius:10px;font-size:13px}.invoice-paper footer{border-top:1px solid #e4eae1;text-align:center;padding-top:19px;color:#6a7d66;font-size:14px}.invoice-paper footer small{display:block;font-size:11px;margin-top:6px}
   @media(max-width:580px){.invoice-paper{padding:20px 14px}.invoice-details{grid-template-columns:1fr}.invoice-table td,.invoice-table th{font-size:11px;padding:10px 4px}.invoice-head{flex-direction:column}.invoice-ref{text-align:right;direction:ltr}}
   @media print{@page{size:A4;margin:12mm}body:has(.invoice-page){background:#fff}.invoice-page{max-width:none;padding:0}.invoice-actions{display:none!important}.invoice-paper{box-shadow:none;border:0;border-top:5px solid #466235;border-radius:0;padding:14px}.invoice-table{break-inside:auto}.invoice-table tr{break-inside:avoid}.invoice-summary{break-inside:avoid}}
  `}</style>
 </main>
}
