'use client';
import { ordersManagerPath } from "@/lib/app-path";

import {Edit3,Package,Printer,Truck,X} from 'lucide-react';
import {useEffect,useState} from 'react';
import {useLanguage,useTranslation} from './language';
import {carrierAmounts,collectionFromCustomer,collectionLabels,collectionState,financialWarnings,missingFinancialAmount} from '@/lib/carrier-tracking';
import {canPrepareShipment} from '@/lib/shipping-handoff';
import {statusLabels,totalOf,type Order} from '@/lib/types';

type Props = {
 order:Order;
 close:()=>void;
 edit:()=>void;
 print:()=>void;
 prepare:()=>void;
};

function TalaOrderStatus({code,brand}:{code:string;brand:Order['brand']}){
 const t=useTranslation();
 const {language}=useLanguage();
 const [result,setResult]=useState<{key:string;status:string}|null>(null);
 const key=brand+':'+code+':'+language;
 useEffect(()=>{
  const controller=new AbortController();
  fetch(ordersManagerPath('/api/shipping-integrations/tala'),{
   method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
   body:JSON.stringify({brand,code,language,operation:'tracking'}),
  }).then(async response=>{
   if(!response.ok)throw new Error();
   const {data}=await response.json();
   if(!controller.signal.aborted)setResult({key,status:data?.status?.name||data?.status?.code||''});
  }).catch(()=>{
   if(!controller.signal.aborted)setResult({key,status:''});
  });
  return ()=>controller.abort();
 },[brand,code,key,language]);
 return <span role="status">{result?.key!==key?t('جاري قراءة حالة تالا…'):result.status||t('حالة تالا غير متاحة حاليًا')}</span>;
}

export function OrderDetails({order,close,edit,print,prepare}:Props){
 const t=useTranslation();
 const number=new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
 const money=(value:number)=>number.format(value)+' '+t('ج.م');
 const due=carrierAmounts(order);
 return <div className="modalshade order-detail-shade" onClick={event=>{if(event.target===event.currentTarget)close();}}>
  <section className="modal order-details" role="dialog" aria-modal="true" aria-labelledby="order-details-title" onKeyDown={event=>{if(event.key==='Escape')close();}}>
   <header className="order-details-heading">
    <div><span className="order-ref" dir="ltr">#{order.id.slice(0,8).toUpperCase()}</span><h2 id="order-details-title">{order.customerName}</h2></div>
    <button type="button" autoFocus className="btn secondary icon-button" onClick={close} aria-label={t('إغلاق')}><X size={19}/></button>
   </header>
   <div className="order-detail-status">
    <span className={'status-pill tracking-'+order.status}>{t(statusLabels[order.status])}</span>
    <span className="status-pill neutral">{t(collectionLabels[collectionState(order)])}</span>
   </div>
   <section className="order-summary-group">
    <h3><Truck size={17}/>{t('بيانات التوصيل')}</h3>
    <dl>
     <dt>{t('رقم التليفون')}</dt><dd><a href={'tel:'+order.phone} dir="ltr">{order.phone}</a>{order.alternatePhone&&<> · <a href={'tel:'+order.alternatePhone} dir="ltr">{order.alternatePhone}</a></>}</dd>
     <dt>{t('العنوان')}</dt><dd>{[t(order.governorate),order.city,order.address].filter(Boolean).join(' · ')||'—'}</dd>
     {order.talaTrackingCode&&<><dt>{t('رقم التتبع')}</dt><dd><bdi>{order.talaTrackingCode}</bdi></dd>
      <dt>{t('الحالة عند تالا')}</dt><dd><TalaOrderStatus code={order.talaTrackingCode} brand={order.brand}/></dd></>}
     {order.talaDispatchState&&order.talaDispatchState!=='sent'&&<><dt>{t('ربط شركات الشحن')}</dt><dd>{t('راجع حالة الإرسال في تالا')}</dd></>}
     <dt>{t('شركة الشحن')}</dt><dd>{t(order.shippingCompany||'توصيل بنفسي')}</dd>
    </dl>
   </section>
   <section className="order-summary-group">
    <h3><Package size={17}/>{t('المنتجات')}</h3>
    <div className="order-summary-items">
     {order.items.map((item,index)=><div key={index}>
      <span>{item.name}<small dir="ltr">× {item.quantity}</small></span><strong>{item.price===0&&collectionFromCustomer(order)>0?'سعر المنتج غير محفوظ':money(item.price*item.quantity)}</strong>
     </div>)}
    </div>
   </section>
   <section className="order-summary-group order-summary-money">
    <h3>{t('الشحن والتحصيل')}</h3>
    {financialWarnings(order).length>0&&<div className="finance-review-box" role="status"><strong>مراجعة مالية مطلوبة</strong><ul>{financialWarnings(order).map((warning,index)=><li key={index}>{warning}</li>)}</ul><small>البيانات الأصلية لم تتغير؛ راجع أسعار المنتجات ومبلغ التحصيل ورسوم الشحن قبل التسوية.</small></div>}
    <dl>
     <dt>{t('تكلفة الشحن')}</dt><dd>{money(order.shipping)}{order.shippingCompany==='تالا إكسبريس'&&order.talaDeliveryFees!=null&&<small className="muted"> (حسب تالا)</small>}</dd>
     <dt>{t('الإجمالي')}</dt><dd>{money(totalOf(order))}</dd>
     <dt>{t('التحصيل من العميل')}</dt><dd>{missingFinancialAmount(order)?'غير معروف — يحتاج مراجعة':money(collectionFromCustomer(order))}</dd>
     {order.shippingCompany==='تالا إكسبريس'&&order.talaCustomerDue!=null&&<><dt>صافي المستحق حسب تالا</dt><dd>{money(order.talaCustomerDue)}</dd></>}
     {order.shippingCompany&&<><dt>{t('المستلم من شركات الشحن')}</dt><dd>{money(due.received)}</dd>
      <dt>{t('المتبقي')}</dt><dd>{missingFinancialAmount(order)?'غير معروف — يحتاج مراجعة':money(due.remaining)}</dd></>}
    </dl>
   </section>
   {order.notes&&<section className="order-summary-group"><h3>{t('ملاحظات الأوردر')}</h3><p>{order.notes}</p></section>}
   <footer className="order-detail-actions">
    <button type="button" className="btn" onClick={edit}><Edit3 size={16}/>{t('تعديل أوردر')}</button>
    <button type="button" className="btn secondary" onClick={print}><Printer size={16}/>{t('طباعة البوليصة')}</button>
    {canPrepareShipment(order)&&<button type="button" className="btn secondary" onClick={prepare}><Truck size={16}/>{t('تجهيز ملف الشحن')}</button>}
   </footer>
  </section>
 </div>;
}
