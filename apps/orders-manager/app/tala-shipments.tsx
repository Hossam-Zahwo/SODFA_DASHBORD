'use client';
import { ordersManagerPath } from "@/lib/app-path";

import {useEffect,useRef,useState} from 'react';
import {Clock3,RefreshCw,Search,Truck} from 'lucide-react';
import {useLanguage} from './language';
import {talaStatusGroups,type TalaShipmentPage,type TalaShipmentSummary} from '@/lib/tala-connection';
import type {Brand} from '@/lib/types';

type Snapshot = {shipments:TalaShipmentSummary[];updatedAt:Date;partial:boolean};
const api=ordersManagerPath('/api/shipping-integrations/tala');
const refreshMs=3*60*1000;

export function TalaShipments({brand,revision,orderIds,openOrder,trackingOrders,onSettings,dashboard=false}:{
 brand:Brand;revision:number;orderIds:ReadonlySet<string>;openOrder:(id:string)=>void;
 trackingOrders?:ReadonlyMap<string,string>;onSettings?:()=>void;dashboard?:boolean;
}){
 const {language}=useLanguage();
 const label=(ar:string,en:string)=>language==='ar'?ar:en;
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
 const [error,setError]=useState('');
 const [filter,setFilter]=useState('');
 const [busy,setBusy]=useState(false);
 const [limit,setLimit]=useState(30);
 const [query,setQuery]=useState('');
 const [range,setRange]=useState(30);
 const [expanded,setExpanded]=useState('');
 const dateFormat=new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'Africa/Cairo'});
 const moneyFormat=new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
 const amount=(value?:number)=>typeof value==='number'&&Number.isFinite(value)?moneyFormat.format(value)+' '+label('ج.م','EGP'):'—';
 const sheetDate=(value?:string)=>value&&Number.isFinite(Date.parse(value))?dateFormat.format(new Date(value)):'—';
 const refresh=useRef<()=>void>(()=>{});

 useEffect(()=>{
  const controller=new AbortController();
  let pending=false;
  async function load(){
   if(pending||controller.signal.aborted)return;
   pending=true;
   setBusy(true);
   setError('');
   try{
    const shipments=new Map<string,TalaShipmentSummary>();
    let hasMore=true;
    for(let page=1;page<=50&&hasMore;page++){
     const response=await fetch(api,{
      method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
      body:JSON.stringify({brand,language,operation:'shipments',page,days:range}),
     });
     const result=await response.json();
     if(!response.ok)throw new Error(result.error);
     const data:TalaShipmentPage=result.data;
     hasMore=data.hasMore;
     for(const shipment of data.shipments)if(shipment.code)shipments.set(shipment.code,shipment);
    }
    if(!controller.signal.aborted)setSnapshot({shipments:[...shipments.values()],updatedAt:new Date(),partial:hasMore});
   }catch(failure){
    if(!controller.signal.aborted)setError(failure instanceof Error?failure.message:'unreachable');
   }finally{
    pending=false;
    if(!controller.signal.aborted)setBusy(false);
   }
  }
  refresh.current=()=>{void load()};
  void load();
  const timer=window.setInterval(()=>{if(!document.hidden)void load()},refreshMs);
  return ()=>{window.clearInterval(timer);controller.abort()};
 },[brand,language,revision,range]);

 const shipments=snapshot?.shipments??[];
 const totals=new Map<string,number>();
 for(const shipment of shipments){
  const code=shipment.status?.code??'';
  totals.set(code,(totals.get(code)??0)+1);
 }
 const normalizedQuery=query.trim().toLocaleLowerCase();
 const visible=shipments.filter(shipment=>(!filter||shipment.status?.code===filter)&&
  (!normalizedQuery||[shipment.code,shipment.refNumber,shipment.recipientZone?.name,shipment.recipientSubzone?.name]
   .some(value=>value?.toLocaleLowerCase().includes(normalizedQuery))));
 const otherStatuses=[...new Map(shipments.filter(shipment=>shipment.status?.code&&!talaStatusGroups.some(([code])=>code===shipment.status!.code))
  .map(shipment=>[shipment.status!.code,shipment.status!.name])).entries()];

 return <section className={dashboard?'panel tala-command-panel':'tala-live-shipments'} aria-label={label('متابعة تالا إكسبريس','Tala Express tracking')}>
  <div className="sectionhead">
   <div className="tala-panel-title">
    {dashboard&&<span className="tala-panel-icon"><Truck size={22}/></span>}
    <div>{dashboard?<h2>{label('متابعة تالا إكسبريس','Tala Express tracking')}</h2>
     :<h3>{label('شحنات تالا خلال آخر 30 يوم','Tala shipments over the last 30 days')}</h3>}
     {snapshot&&<small className="muted tala-refresh-time"><Clock3 size={13}/> {label('آخر تحديث','Last updated')} {snapshot.updatedAt.toLocaleTimeString('en-GB',{timeStyle:'short',timeZone:'Africa/Cairo'})}</small>}
    </div>
   </div>
   <div className="toolbar tala-panel-actions">
    {dashboard&&<select className="field" aria-label={label('فترة شحنات تالا','Tala shipment period')} value={range}
     onChange={event=>{setSnapshot(null);setRange(Number(event.target.value));setFilter('');setExpanded('');setLimit(30)}}>
     {[7,30,90].map(days=><option key={days} value={days}>{label('آخر '+days+' يوم','Last '+days+' days')}</option>)}
    </select>}
    <button type="button" className="btn secondary" disabled={busy} onClick={()=>refresh.current()}>
     <RefreshCw size={16}/>{busy?label('جاري التحديث…','Refreshing…'):label('تحديث الشحنات','Refresh shipments')}
    </button>
    {onSettings&&<button type="button" className="btn secondary" onClick={onSettings}>{label('إعدادات تالا','Tala settings')}</button>}
   </div>
  </div>
  {error&&<p className="notice error" role="alert">{error==='missing_credentials'?label('ضيف حساب تالا الأول.','Add your Tala account first.')
   :error==='unauthenticated'?label('بيانات دخول تالا غير مقبولة. راجع اسم المستخدم وكلمة المرور من إعدادات الربط.','Tala login was rejected. Check the username and password in integration settings.')
   :error==='forbidden'?label('حساب تالا لا يملك صلاحية قراءة قائمة الشحنات. اطلب من تالا تفعيل صلاحية عرض الشحنات (listShipments).','This Tala account cannot read the shipment list. Ask Tala to enable the listShipments permission.')
   :error==='rejected'?label('تالا رفضت طلب قراءة الشحنات. حدّث الصفحة، ولو استمرت المشكلة أرسل رمز الخطأ للدعم.','Tala rejected the shipment query. Refresh, and send the error code to support if it continues.')
   :error==='unreachable'?label('تعذّر الاتصال بخدمة تالا. حاول التحديث بعد قليل.','Could not connect to Tala. Try refreshing shortly.')
   :label('تعذّر قراءة شحنات تالا. راجع إعدادات الربط أو أعد المحاولة.','Could not load Tala shipments. Check the integration settings or try again.')}
   {snapshot&&<> {label('ظاهر آخر تحديث ناجح.','Showing the last successful refresh.')}</>}</p>}
  {snapshot&&<>
   {snapshot.partial&&<p className="notice" role="status">{label('النتائج المعروضة جزئية لأن القائمة تخطّت حد الجلب.','The shipment list exceeded the fetch limit. Counts are partial.')}</p>}
   <div className="tracking-grid tracking-shipping">
    {talaStatusGroups.map(([code,ar,en])=><button className="tracking-card" type="button" key={code} aria-pressed={filter===code}
     onClick={()=>{setFilter(filter===code?'':code);setLimit(30);setExpanded('')}}><span>{label(ar,en)}</span><strong>{totals.get(code)??0}</strong></button>)}
   </div>
   <div className="toolbar tala-shipments-toolbar">
    <button type="button" className="btn secondary tiny" onClick={()=>{setFilter('');setLimit(30)}} aria-pressed={!filter}>{label('كل الشحنات','All shipments')} ({shipments.length})</button>
    {dashboard&&<>
     <label className="tala-search"><Search size={16}/><input className="field" type="search" value={query}
      aria-label={label('ابحث في شحنات تالا','Search Tala shipments')}
      placeholder={label('رقم التتبع أو المنطقة','Tracking number or area')}
      onChange={event=>{setQuery(event.target.value);setLimit(30);setExpanded('')}}/></label>
     <select className="field" aria-label={label('حالة شحنة تالا','Tala shipment status')} value={filter}
      onChange={event=>{setFilter(event.target.value);setLimit(30);setExpanded('')}}>
      <option value="">{label('كل الحالات','All statuses')}</option>
      {talaStatusGroups.map(([code,ar,en])=><option key={code} value={code}>{label(ar,en)}</option>)}
      {otherStatuses.map(([code,name])=><option key={code} value={code}>{name||code}</option>)}
     </select>
    </>}
   </div>
   {visible.length>0?<div className="tracking-table-scroll" tabIndex={0}>
    <table className="table tala-shipments-table"><thead><tr>
     <th>{label('رقم التتبع','Tracking number')}</th><th>{label('مرجع الأوردر','Order reference')}</th><th>{label('الحالة عند تالا','Tala status')}</th>
     {dashboard&&<><th>{label('المنطقة','Area')}</th><th>{label('التاريخ','Date')}</th><th>{label('المطلوب من العميل','Collection amount')}</th></>}
    </tr></thead>
     <tbody>{visible.slice(0,limit).flatMap(shipment=>{
      const orderId=shipment.refNumber&&orderIds.has(shipment.refNumber)?shipment.refNumber:trackingOrders?.get(shipment.code);
      const area=[shipment.recipientZone?.name,shipment.recipientSubzone?.name].filter(Boolean).join(' · ');
      return [<tr key={shipment.code}>
       <td>{dashboard?<button className="order-name-link" type="button" aria-expanded={expanded===shipment.code}
        onClick={()=>setExpanded(expanded===shipment.code?'':shipment.code)}><bdi>{shipment.code}</bdi></button>:<bdi>{shipment.code}</bdi>}</td>
       <td>{orderId?<button type="button" className="order-name-link" onClick={()=>openOrder(orderId)}><bdi>{orderId.slice(0,8).toUpperCase()}</bdi></button>
        :<bdi>{shipment.refNumber||'—'}</bdi>}</td><td><span className="status-pill neutral">{shipment.status?.name||shipment.status?.code||'—'}</span></td>
       {dashboard&&<><td>{area||'—'}</td><td>{sheetDate(shipment.date)}</td><td>{amount(shipment.price)}</td></>}
      </tr>,...(dashboard&&expanded===shipment.code?[<tr key={shipment.code+':details'}><td colSpan={6}>
       <dl className="tala-shipment-detail">
        <div><dt>{label('الخدمة','Service')}</dt><dd>{shipment.service?.name||'—'}</dd></div>
        <div><dt>{label('رسوم التوصيل','Delivery fees')}</dt><dd>{amount(shipment.deliveryFees)}</dd></div>
        <div><dt>{label('المحصّل من المستلم','Collected from recipient')}</dt><dd>{amount(shipment.deliveredAmount)}</dd></div>
       </dl>
      </td></tr>]:[])];
     })}</tbody>
    </table>
   </div>:<p>{label('مفيش شحنات للعرض.','No shipments to show.')}</p>}
   {visible.length>limit&&<button className="btn secondary" type="button" onClick={()=>setLimit(limit+30)}>{label('عرض المزيد','Show more')}</button>}
  </>}
 </section>;
}
