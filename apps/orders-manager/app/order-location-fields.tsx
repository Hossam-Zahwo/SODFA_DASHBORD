import { ordersManagerPath } from "@/lib/app-path";

import {useTranslation} from '@/app/language';
import {useEffect,useId,useRef,useState} from 'react';
import {ChevronDown} from 'lucide-react';
import {govs} from '@/lib/types';

const searchable = (value: string) => value.normalize('NFKD')
 .replace(/\p{M}|ـ/gu, '').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim();

type Props = {
 locations: Record<string, string[]>;
 governorate: string;
 city: string;
 required?: boolean;
 onChange: (governorate: string, city: string) => void;
 onAreaAdded?: (governorate:string,city:string)=>void;
};

export function OrderLocationFields({locations, governorate, city, required, onChange,onAreaAdded}: Props) {
 const t=useTranslation();
 const [open,setOpen]=useState(false);
 const [query,setQuery]=useState('');
 const [adding,setAdding]=useState(false);
 const [addError,setAddError]=useState(false);
 const addRequest=useRef<AbortController|null>(null);
 useEffect(()=>()=>addRequest.current?.abort(),[]);
 const picker=useRef<HTMLDivElement>(null);
 const trigger=useRef<HTMLButtonElement>(null);

 useEffect(()=>{
  if(!open)return;
  function closeOutside(event:Event){
   if(event.target instanceof Node&&!picker.current?.contains(event.target))setOpen(false);
  }
  document.addEventListener('pointerdown',closeOutside);
  document.addEventListener('focusin',closeOutside);
  return ()=>{
   document.removeEventListener('pointerdown',closeOutside);
   document.removeEventListener('focusin',closeOutside);
  };
 },[open]);
 const popupId=useId();
 const governorates=govs;
 const cities=locations[governorate]??[];
 const options=city&&!cities.includes(city)?[city,...cities]:cities;
 const matches=options.filter(name=>searchable(name).includes(searchable(query)));
 async function addArea(){
  const name=query.trim();
  if(!onAreaAdded||adding||!governorate||name.length<2)return;
  const controller=new AbortController();
  addRequest.current=controller;
  setAdding(true);setAddError(false);
  try{
   const response=await fetch(ordersManagerPath('/api/order-locations'),{
    method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
    body:JSON.stringify({governorate,city:name}),
   });
   if(!response.ok)throw new Error();
   const {data}=await response.json();
   if(controller.signal.aborted)return;
   onAreaAdded(data.governorate,data.city);
   onChange(data.governorate,data.city);
   setOpen(false);
   trigger.current?.focus({preventScroll:true});
  }catch{if(!controller.signal.aborted)setAddError(true);}
  finally{if(!controller.signal.aborted)setAdding(false);}
 }

 const cityRequired=Boolean(governorate&&(required||cities.length));
 return <>
  <label>{t("المحافظة")}
   <select className="field" name="governorate" disabled={adding} required={required} value={governorate} onChange={e=>{
    setOpen(false);setQuery('');onChange(e.target.value,'');
   }}>
    <option value="">{t("اختار المحافظة")}</option>
    {governorate&&!governorates.includes(governorate)&&<option value={governorate}>{governorate}{t("(مسجلة سابقًا)")}</option>}
    {governorates.map(name=><option key={name} value={name}>{t(name)}</option>)}
   </select>
  </label>
  <div className="order-city-fields" ref={picker}
   onKeyDown={e=>{if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setOpen(false);trigger.current?.focus({preventScroll:true})}}}>
   <span>{t("المدينة / المنطقة")}</span>
   <button type="button" className="field city-trigger" ref={trigger} disabled={!governorate} aria-label={t("المدينة / المنطقة: ")+(city||t("اختار المدينة"))}
    aria-expanded={open} aria-controls={open?popupId:undefined} onClick={()=>{setQuery('');setAddError(false);setOpen(!open)}}>
    <span>{city||(governorate?t("اختار المدينة / المنطقة"):t("اختار المحافظة الأول"))}</span><ChevronDown size={16} aria-hidden="true"/>
   </button>
   <input type="hidden" name="city" value={city}/>
   <input className="city-validation" tabIndex={-1} aria-hidden="true" required={cityRequired} value={city} onChange={()=>{}}
    onInvalid={e=>{e.preventDefault();setQuery('');setOpen(true);trigger.current?.focus({preventScroll:true})}}/>
   {open&&<div className="city-popup" id={popupId}>
    <input className="field" type="search" maxLength={120} readOnly={adding} aria-label={t("ابحث عن مدينة أو منطقة")} placeholder={t("ابحث بالاسم")} value={query}
     onKeyDown={e=>{if(e.key==='Enter')e.preventDefault()}} onChange={e=>setQuery(e.target.value)}/>
    <div className="city-results" role="group" aria-label={t("المدن والمناطق")}>
     {matches.map(name=><button key={name} type="button" aria-pressed={city===name} onClick={()=>{
      onChange(governorate,name);setOpen(false);trigger.current?.focus({preventScroll:true});
     }}>{name}</button>)}
     {onAreaAdded&&query.trim().length>=2&&!options.some(name=>searchable(name)===searchable(query))&&
      <button type="button" className="city-add-option" onClick={()=>void addArea()} disabled={adding}>
       {t(adding?'جاري إضافة المنطقة…':'إضافة المنطقة لهومي')} <bdi>{query.trim()}</bdi>
      </button>}
     {addError&&<small className="notice error" role="alert">{t('تعذّر إضافة المنطقة. راجع الاسم وحاول تاني.')}</small>}
     {matches.length===0&&<small className="muted" role="status">{t("مفيش نتائج مطابقة")}</small>}
    </div>
   </div>}
  </div>
 </>;
}
