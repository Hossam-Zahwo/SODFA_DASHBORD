'use client';

import {useEffect, useState} from 'react';
import {LockKeyhole,LockKeyholeOpen} from 'lucide-react';
import {useLanguage} from './language';
import {TalaShipments} from './tala-shipments';
import {talaDocumentation, talaEndpoint, talaSupport, type TalaOperation, type TalaOption, type TalaTracking} from '@/lib/tala-connection';
import type {Brand} from '@/lib/types';

type ConnectionSettings = {
 configured:boolean;
 username:string;
 endpoint:string;
 documentation:string;
 support:string;
 revision:number;
};

export function TalaSettings({brand,orderIds,openOrder}: {brand: Brand;orderIds:ReadonlySet<string>;openOrder:(id:string)=>void}) {
 const {language}=useLanguage();
 const label=(ar:string,en:string)=>language==='en'?en:ar;
 const [settings,setSettings]=useState<ConnectionSettings|null>(null);
 const [draft,setDraft]=useState<ConnectionSettings|null>(null);
 const [action,setAction]=useState<'save'|'remove'>('save');
 const [email,setEmail]=useState('');
 const [staffPassword,setStaffPassword]=useState('');
 const [carrierPassword,setCarrierPassword]=useState('');
 const [saveError,setSaveError]=useState('');
 const [saved,setSaved]=useState(false);
 const configured=settings?.configured??null;
 const [configError,setConfigError]=useState(false);
 const [connected,setConnected]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [services,setServices]=useState<TalaOption[]>([]);
 const [zones,setZones]=useState<TalaOption[]>([]);
 const [subzones,setSubzones]=useState<TalaOption[]>([]);
 const [service,setService]=useState('');
 const [zone,setZone]=useState('');
 const [code,setCode]=useState('');
 const [tracking,setTracking]=useState<TalaTracking|null>();
 const api='/api/shipping-integrations/tala';

 useEffect(()=>{
  const controller=new AbortController();
  fetch(api+'?brand='+brand,{cache:'no-store',signal:controller.signal}).then(async response=>{
   if(!response.ok)throw new Error();
   const data=await response.json();
   setSettings(data);
  }).catch(()=>{if(!controller.signal.aborted)setConfigError(true)});
  return ()=>controller.abort();
 },[brand]);

 async function request(operation:TalaOperation, value?:number|string) {
  setBusy(true);
  setError('');
  try {
   const response=await fetch(api,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({brand,operation,language,id:typeof value==='number'?value:undefined,code:typeof value==='string'?value:undefined}),
   });
   const result=await response.json();
   if(!response.ok)throw new Error(result.error);
   switch(operation){
    case 'services': setServices(result.data);setConnected(true);break;
    case 'zones': setZones(result.data);break;
    case 'subzones': setSubzones(result.data);break;
    case 'tracking': setTracking(result.data);break;
   }
  } catch(e) {
   if(operation==='services')setConnected(false);
   setError(e instanceof Error?e.message:'unreachable');
  } finally {setBusy(false)}
 }

 function closeEditor(){
  setDraft(null);setEmail('');setStaffPassword('');setCarrierPassword('');setSaveError('');
 }

 async function saveSettings(event:React.FormEvent){
  event.preventDefault();
  if(!draft||busy)return;
  setBusy(true);setSaveError('');
  try{
   const result=await fetch(api,{
    method:'PATCH',headers:{'Content-Type':'application/json'},cache:'no-store',
    body:JSON.stringify({...draft,brand,action,email,password:staffPassword,carrierPassword}),
   });
   const data=await result.json();
   if(!result.ok){
    if(data.error==='stale_settings'){
     const latest=await fetch(api+'?brand='+brand,{cache:'no-store'});
     if(latest.ok)setSettings(await latest.json());
    }
    throw new Error(data.error);
   }
   setSettings(data);closeEditor();setSaved(true);setConnected(false);
   setServices([]);setZones([]);setSubzones([]);setService('');setZone('');setTracking(undefined);setError('');
  }catch(error){
   setSaveError(error instanceof Error?error.message:'settings_unavailable');
   setStaffPassword('');
  }finally{setBusy(false)}
 }

 const saveMessages:Record<string,[string,string]>={
  reauthentication_failed:['بيانات مدير الطلبات غير صحيحة. استخدم نفس الحساب اللي داخل بيه.','Use the current Orders Manager account and its correct password.'],
  endpoint_not_allowed:['رابط API ده غير معتمد على السيرفر.','This API endpoint is not approved on the server.'],
  stale_settings:['الإعدادات اتعدّلت من جلسة تانية. اقفل التعديل وافتحه تاني عشان تشوف آخر نسخة.','Settings changed in another session. Lock and reopen the editor to load the latest version.'],
  carrier_credentials_required:['اكتب اسم المستخدم وباسورد تالا للحساب الجديد.','Enter the Tala username and password for the new account.'],
  invalid:['راجع البيانات اللي دخلتها.','Check the details you entered.'],
  settings_unavailable:['تعذّر حفظ الإعدادات.','Could not save settings.'],
 };
 const saveMessage=saveMessages[saveError]??saveMessages.settings_unavailable;

 return <section className="panel tala-settings">
  <div className="sectionhead"><h2>{label('إعدادات ربط تالا إكسبريس','Tala Express integration settings')}</h2>
   <span className="muted">{brand==='homey'?'HOMEY':'SODFA'}</span></div>
  <dl className="tala-connection-details">
   <dt>{label('طريقة الربط','Connection method')}</dt><dd>GraphQL · {label('اسم مستخدم وكلمة مرور من تالا','Tala-issued username and password')}</dd>
   <dt>Endpoint</dt><dd><code dir="ltr">{settings?.endpoint??talaEndpoint}</code></dd>
   <dt>{label('التوثيق والدعم','Documentation and support')}</dt>
   <dd>{(settings?.documentation??talaDocumentation)&&<a href={settings?.documentation??talaDocumentation} target="_blank" rel="noreferrer">{label('توثيق API','API documentation')}</a>}
    {(settings?.support??talaSupport)&&<span> <a href={'mailto:'+(settings?.support??talaSupport)}>{settings?.support??talaSupport}</a></span>}
    {settings&&!settings.documentation&&!settings.support&&'—'}</dd>
   <dt>{label('بيانات الدخول على السيرفر','Server credentials')}</dt>
   <dd>{configured?label('محفوظة على السيرفر','Stored on the server'):label('غير مضافة','Not configured')}</dd>
  </dl>
  <p role="status">{configError?label('تعذّر قراءة إعدادات الربط.','Could not load connection settings.')
   :connected?label('تم تسجيل الدخول وقراءة الخدمات.','Sign-in and service lookup succeeded.')
   :configured===null?label('جاري فحص الإعدادات…','Checking configuration…')
   :configured?label('بيانات الحساب موجودة. اختبر الاتصال.','Credentials are configured. Test the connection.')
   :label('في انتظار بيانات حساب تالا لهذا المتجر. افتح التعديل لإضافتها.','Waiting for this store’s Tala account. Unlock editing to add it.')}</p>
  <div className="toolbar tala-connection-actions">
   <span className="status-pill neutral" role="status">{draft?<LockKeyholeOpen size={15}/>:<LockKeyhole size={15}/>} {draft?label('التعديل مفتوح','Editing unlocked'):label('الإعدادات مقفولة','Settings locked')}</span>
   {draft?<button type="button" className="btn secondary" disabled={busy} onClick={closeEditor}>{label('قفل الإعدادات','Lock settings')}</button>
    :<button type="button" className="btn secondary" disabled={!settings||busy} onClick={()=>{
     setDraft(settings);setAction('save');setSaved(false);
    }}>{label('فتح التعديل','Unlock editing')}</button>}
  </div>
  {saved&&<p className="notice" role="status">{label('تم حفظ الإعدادات وقفل التعديل.','Settings saved and locked.')}</p>}
  {draft&&<form onSubmit={saveSettings} className="tracking-settings">
   {action==='save'&&<div className="formgrid">
    <label>API endpoint<input className="field" type="url" dir="ltr" value={draft.endpoint} maxLength={512} required
     onChange={e=>setDraft({...draft,endpoint:e.target.value})}/></label>
    <label>{label('رابط التوثيق','Documentation URL')}<input className="field" type="url" dir="ltr" value={draft.documentation} maxLength={512}
     onChange={e=>setDraft({...draft,documentation:e.target.value})}/></label>
    <label>{label('بريد الدعم','Support email')}<input className="field" type="email" dir="ltr" value={draft.support} maxLength={254}
     onChange={e=>setDraft({...draft,support:e.target.value})}/></label>
    <label>{label('اسم مستخدم تالا','Tala username')}<input className="field" dir="ltr" autoComplete="off" required={settings?.configured} value={draft.username} maxLength={254}
     onChange={e=>setDraft({...draft,username:e.target.value})}/></label>
    <label>{label('كلمة مرور تالا الجديدة','New Tala password')}<input className="field" type="password" autoComplete="new-password" value={carrierPassword} maxLength={512}
     required={Boolean(draft.username.trim())&&(!settings?.configured||draft.username.trim()!==settings.username||draft.endpoint!==settings.endpoint)}
     onChange={e=>setCarrierPassword(e.target.value)}/></label>
   </div>}
   {action==='remove'&&<p>{label('أكد حذف بيانات حساب تالا من المتجر.','Confirm removal of Tala credentials for this store.')}</p>}
   <fieldset disabled={busy}>
    <legend>{label('أكد بحساب مدير الطلبات اللي داخل بيه','Confirm with your current Orders Manager account')}</legend>
    <label>{label('إيميل مدير الطلبات','Orders Manager email')}<input className="field" autoComplete="username" type="email" dir="ltr" required value={email} maxLength={254}
     onChange={e=>setEmail(e.target.value)}/></label>
    <label>{label('باسورد مدير الطلبات','Orders Manager password')}<input className="field" type="password" autoComplete="current-password" required value={staffPassword} maxLength={256}
     onChange={e=>setStaffPassword(e.target.value)}/></label>
   </fieldset>
   {saveError&&<p className="notice error" role="alert">{label(...saveMessage)}</p>}
   <div className="toolbar">
    <button className={action==='remove'?'btn danger':'btn'} disabled={busy}>{action==='remove'?label('تأكيد حذف حساب تالا','Confirm Tala account removal'):label('حفظ الإعدادات','Save settings')}</button>
    {settings?.configured&&<button type="button" className="btn secondary" disabled={busy} onClick={()=>{
     setAction(action==='remove'?'save':'remove');setStaffPassword('');setSaveError('');
    }}>{action==='remove'?label('رجوع للتعديل','Back to editing'):label('حذف حساب تالا','Remove Tala account')}</button>}
   </div>
  </form>}
  <button className="btn" type="button" disabled={!configured||busy||Boolean(draft)} onClick={()=>void request('services')}>
   {label('اختبار الاتصال وجلب الخدمات','Test connection and load services')}
  </button>
  {error&&<p className="notice error" role="alert">{error==='missing_credentials'
   ?label('بيانات حساب تالا مطلوبة.','Tala account credentials are required.')
   :error==='unreachable'?label('تعذّر الوصول إلى سيرفر تالا. حاول تاني.','Could not reach Tala. Try again.')
   :label('تالا رفضت الطلب. راجع بيانات الحساب والصلاحيات.','Tala rejected the request. Check account credentials and permissions.')}</p>}
  {connected&&<>
   <h3>{label('أكواد الخدمات والمناطق','Service and area codes')}</h3>
   <div className="toolbar">
    <label>{label('الخدمة','Service')} <select className="field" value={service} disabled={busy} onChange={event=>{
     const value=event.target.value;
     setService(value);setZone('');setZones([]);setSubzones([]);
     if(value)void request('zones',Number(value));
    }}><option value="">{label('اختار الخدمة','Select a service')}</option>
     {services.map(item=><option key={item.id} value={item.id}>{item.name} ({item.id})</option>)}</select></label>
    <label>{label('المنطقة','Zone')} <select className="field" value={zone} disabled={busy||!zones.length} onChange={event=>{
     const value=event.target.value;
     setZone(value);setSubzones([]);
     if(value)void request('subzones',Number(value));
    }}><option value="">{label('اختار المنطقة','Select a zone')}</option>
     {zones.map(item=><option key={item.id} value={item.id}>{item.name} ({item.id})</option>)}</select></label>
   </div>
   {zone && !busy && <div><strong>{label('المناطق الفرعية','Subzones')}</strong>
    {subzones.length?<ul>{subzones.map(item=><li key={item.id}>{item.name} ({item.id})</li>)}</ul>
    :<p>{label('مفيش مناطق فرعية معروضة.','No subzones to display.')}</p>}</div>}
   <h3>{label('استعلام عن شحنة موجودة','Look up an existing shipment')}</h3>
   <form className="toolbar" onSubmit={event=>{event.preventDefault();setTracking(undefined);void request('tracking',code.trim())}}>
    <label>{label('رقم تتبع تالا','Tala tracking number')} <input className="field" dir="ltr" value={code} maxLength={100} onChange={event=>setCode(event.target.value)} required /></label>
    <button className="btn secondary" disabled={busy||!code.trim()}>{label('استعلام','Look up')}</button>
   </form>
   {tracking===null&&<p role="status">{label('الشحنة مش موجودة في الحساب.','Shipment not found in this account.')}</p>}
   {tracking&&<p role="status"><b dir="ltr">{tracking.code}</b> · {tracking.status?.name??'—'} {tracking.refNumber&&<>· <bdi>{tracking.refNumber}</bdi></>}</p>}
  </>}
  {settings?.configured&&!draft&&<TalaShipments key={brand+':'+settings.revision} brand={brand} revision={settings.revision} orderIds={orderIds} openOrder={openOrder}/>}
  <p className="muted">{label('اختبار الاتصال والاستعلام لا ينشئان شحنات. الاستعلام ما بيغيّرش حالات الأوردرات المحفوظة في هومي.',
   'Connection tests and lookups do not create shipments. Lookups do not change saved Homey order statuses.')}</p>
 </section>;
}
