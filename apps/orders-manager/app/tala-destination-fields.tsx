'use client';

import {useEffect,useRef,useState} from 'react';
import {useLanguage} from './language';
import type {TalaOption} from '@/lib/tala-connection';
import type {TalaCoverageGroup} from '@/lib/tala-coverage';

export function TalaDestinationFields({retryOrder=false,price,onRateChange}:{retryOrder?:boolean;price:number;onRateChange:(rate:number)=>void}){
 const {language}=useLanguage();
 const [service,setService]=useState('');
 const [zone,setZone]=useState('');
 const [subzone,setSubzone]=useState('');
 const [services,setServices]=useState<TalaOption[]>([]);
 const [serviceCoverage,setServiceCoverage]=useState<TalaCoverageGroup[]>([]);
 const [failed,setFailed]=useState(false);
 const [loading,setLoading]=useState(true);
 const [feeLoading,setFeeLoading]=useState(false);
 const [fee,setFee]=useState<number|null>(null);
 const [feeFailed,setFeeFailed]=useState(false);
 const [retry,setRetry]=useState(0);
 const [weight,setWeight]=useState('1');
 const rateChangeRef=useRef(onRateChange);
 rateChangeRef.current=onRateChange;
 const label=(ar:string,en:string)=>language==='ar'?ar:en;
 const selectedZone=serviceCoverage.find(group=>String(group.zone.id)===zone)?.zone;
 const areas=serviceCoverage.find(group=>String(group.zone.id)===zone)?.subzones??[];
 const selectedArea=areas.find(item=>String(item.id)===subzone);

 async function request(operation:'services'|'coverage',id?:number,signal?:AbortSignal){
  const response=await fetch('/api/shipping-integrations/tala',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({brand:'homey',operation,language:'ar',id}),signal,
  });
  if(!response.ok)throw new Error();
  const result=await response.json();
  if(operation==='coverage'){
   if(!result.data||!Array.isArray(result.data.groups))throw new Error();
   return result.data as {serviceId:number;groups:TalaCoverageGroup[]};
  }
  if(!Array.isArray(result.data))throw new Error();
  return result.data as TalaOption[];
 }

 useEffect(()=>{
  const controller=new AbortController();
  async function load(){
   setLoading(true);setFailed(false);setServices([]);setServiceCoverage([]);setZone('');setSubzone('');setService('');setFee(null);
   try{
    const serviceList=await request('services',undefined,controller.signal) as TalaOption[];
    const activeServices=serviceList.filter(item=>Number.isSafeInteger(item.id)&&item.id>0&&Boolean(item.name));
    if(!activeServices.length)throw new Error();
    setServices(activeServices);
    if(activeServices.length===1)setService(String(activeServices[0].id));
   }catch{if(!controller.signal.aborted)setFailed(true)}
   finally{if(!controller.signal.aborted)setLoading(false)}
  }
  void load();
  return()=>controller.abort();
 },[language,retry]);

 useEffect(()=>{
  if(!service){setServiceCoverage([]);return}
  const controller=new AbortController();
  async function load(){
   setLoading(true);setFailed(false);setServiceCoverage([]);setZone('');setSubzone('');setFee(null);
   try{
    const result=await request('coverage',Number(service),controller.signal) as {serviceId:number;groups:TalaCoverageGroup[]};
    if(controller.signal.aborted)return;
    if(result.serviceId!==Number(service))throw new Error();
    setServiceCoverage(result.groups.filter(group=>Number.isSafeInteger(group.zone?.id)&&group.zone.id>0&&Boolean(group.zone.name)&&Array.isArray(group.subzones)));
   }catch{if(!controller.signal.aborted)setFailed(true)}
   finally{if(!controller.signal.aborted)setLoading(false)}
  }
  void load();
  return()=>controller.abort();
 },[service,language,retry]);

 useEffect(()=>{
  if(!service||!selectedZone||!selectedArea||!Number.isFinite(price)||price<0||!Number.isFinite(Number(weight))||Number(weight)<=0)return;
  const controller=new AbortController();
  setFeeLoading(true);setFeeFailed(false);setFee(null);
  fetch('/api/shipping-integrations/tala',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
   body:JSON.stringify({brand:'homey',operation:'fees',language,fees:{serviceId:Number(service),zoneId:Number(zone),subzoneId:Number(subzone),weight:Number(weight),price}}),cache:'no-store'})
   .then(async response=>{const result=await response.json();if(!response.ok)throw new Error();return result.data as {total:number}})
   .then(result=>{if(controller.signal.aborted||!Number.isFinite(result.total)||result.total<0)throw new Error();setFee(result.total);rateChangeRef.current(result.total)})
   .catch(()=>{if(!controller.signal.aborted){setFee(null);setFeeFailed(true)}})
   .finally(()=>{if(!controller.signal.aborted)setFeeLoading(false)});
  return()=>controller.abort();
 },[service,zone,subzone,selectedZone,selectedArea,weight,price,language,retry]);

 return <fieldset className="full tala-destination">
  <legend>{retryOrder?label('وجهة تالا','Tala destination'):label('وجهة الشحنة في تالا','Shipment destination in Tala')}</legend>
  <p className="muted">{label('المحافظة والمنطقة المحلية محفوظتان في بيانات الطلب. اختار وجهة الشحن من أسماء تالا ومعرّفاتها كما رجعت من النظام، من غير تخمين ربطها بمحافظة.','The order keeps its Egyptian governorate and locality. Choose the Tala destination using the exact names and IDs returned by Tala, without guessing a governorate mapping.')}</p>
  <div className="formgrid order-basics">
   <label>{label('خدمة الشحن عند تالا','Tala shipping service')}
    <select className="field" name="talaService" required value={service} disabled={loading||failed} onChange={event=>{
     setService(event.target.value);setZone('');setSubzone('');setServiceCoverage([]);setFee(null);
    }}><option value="">{label('اختار الخدمة','Select a service')}</option>
     {services.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
   <label>{label('منطقة تالا الرئيسية','Tala zone')}
    <select className="field" name="talaZoneChoice" required value={zone} disabled={!service||loading||failed} onChange={event=>{
     setZone(event.target.value);setSubzone('');setFee(null);
    }}><option value="">{label('اختار منطقة تالا','Select a Tala zone')}</option>
     {serviceCoverage.map(group=><option key={group.zone.id} value={group.zone.id}>{group.zone.name}</option>)}
    </select></label>
   <label>{label('المنطقة الفرعية عند تالا','Tala subzone')}
    <select className="field" name="talaSubzoneChoice" required value={subzone} disabled={!zone||loading||failed||!areas.length} onChange={event=>{
     setSubzone(event.target.value);setFee(null);
    }}><option value="">{!zone?label('اختار منطقة تالا أولاً','Choose a Tala zone first'):label('اختار المنطقة الفرعية','Select a Tala subzone')}</option>
     {areas.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
   <input type="hidden" name="talaZone" value={zone}/>
   <input type="hidden" name="talaSubzone" value={subzone}/>
  </div>
  <div className="formgrid order-basics">
   <label>{label('وزن الشحنة بالكيلو','Shipment weight (kg)')}
    <input type="number" className="field" name="talaWeight" value={weight} onChange={event=>setWeight(event.target.value)} min="0.01" max="1000" step="0.01" inputMode="decimal" required/>
   </label>
   <label>{label('عدد الطرود','Number of parcels')}
    <input type="number" className="field" name="talaPieces" min="1" max="1000" step="1" inputMode="numeric" defaultValue="1" required/>
   </label>
   <label>{label('نوع الشحنة','Shipment type')}
    <select name="talaType" className="field" defaultValue="FDP" required><option value="FDP">{label('توصيل عادي','Regular delivery')}</option></select>
   </label>
   <label>{label('هل مسموح بفتح الطرد؟','Can the recipient open the parcel?')}
    <select name="talaOpenable" className="field" defaultValue="N" required>
     <option value="" disabled>{label('اختار','Select')}</option><option value="Y">{label('مسموح','Allowed')}</option><option value="N">{label('غير مسموح','Not allowed')}</option>
    </select>
   </label>
  </div>
  {service&&zone&&subzone&&<p className="notice" role="status">{label('تكلفة الشحن حسب تسعيرة تالا: ','Shipping fee from Tala: ')}{feeLoading?label('جاري الحساب…','Calculating…'):fee!==null?new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(fee)+' ج.م':label('غير متاحة حالياً','Unavailable right now')}</p>}
  {feeFailed&&<p className="notice" role="alert">{label('تعذّر حساب الشحن من تالا. راجع الخدمة ووجهة الشحنة أو أدخل التكلفة يدويًا.','Could not calculate Tala shipping. Check the service and destination, or enter the fee manually.')}</p>}
  {loading&&<p className="muted" role="status">{label('جاري تحميل خدمات ووجهات تالا…','Loading Tala services and destinations…')}</p>}
  {failed&&<p className="notice error" role="alert">{label('تعذّر تحميل خدمات أو وجهات تالا. أعد المحاولة أو راجع ربط تالا.','Could not load Tala services or destinations. Retry or check the Tala connection.')}{' '}<button type="button" className="btn secondary tiny" onClick={()=>setRetry(value=>value+1)}>{label('أعد المحاولة','Retry')}</button></p>}
  {!loading&&!failed&&service&&!serviceCoverage.length&&<p className="notice" role="status">{label('تالا لم تُرجع وجهات لهذه الخدمة. اختار خدمة أخرى أو راجع التغطية من تالا.','Tala returned no destinations for this service. Choose another service or check Tala coverage.')}</p>}
  <small className="muted">{retryOrder?label('راجع الوجهة والبيانات ثم احفظ وأعد الإرسال.','Review the destination and shipment details, then save and resend.'):label('يُرسل الطلب بمعرّفات الوجهة الدقيقة التي اخترتها من تالا، مع حفظ المحافظة والمنطقة المحلية كما أدخلتهما.','The order is sent with the exact Tala destination IDs you selected, while preserving the governorate and locality entered above.')}</small>
 </fieldset>;
}
