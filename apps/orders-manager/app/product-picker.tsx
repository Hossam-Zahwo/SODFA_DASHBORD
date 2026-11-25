'use client';
import {useTranslation} from '@/app/language';


import {useState} from 'react';
import {Package} from 'lucide-react';
import type {Item} from '@/lib/types';

function ProductThumbnail({imageUrl,imageUrls}:{imageUrl?:string;imageUrls?:string[]}){
 const sources=[...new Set([imageUrl,...(imageUrls??[])].filter((url):url is string=>typeof url==='string'&&/^https?:\/\//i.test(url)))];
 const [failed,setFailed]=useState<string[]>([]);
 const source=sources.find(url=>!failed.includes(url));
 return source
  ? <img key={source} src={source} alt="" referrerPolicy="no-referrer" loading="lazy" onError={()=>setFailed(previous=>[...previous,source])}/>
  : <Package aria-hidden="true"/>;
}

export function ProductPicker({item,products,onChange}:{item:Item;products:Item[];onChange:(patch:Partial<Item>)=>void}){
 const t=useTranslation();
 const [open,setOpen]=useState(false);
 const [query,setQuery]=useState('');
 const matches=products.filter(product=>[product.name,product.sku].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
 const catalogItem=products.find(product=>product.sku===item.sku&&product.name===item.name);
 return <div className="order-product-picker">
  <label>{t("المنتج")}
   <input className="field" placeholder={t("اسم المنتج")} required value={item.name} onChange={e=>onChange({name:e.target.value,imageUrl:undefined})}/>
  </label>
  {products.length>0&&<button type="button" className="btn tiny secondary" aria-expanded={open} onClick={()=>{setOpen(!open);setQuery('')}}>{open?t("إغلاق الكتالوج"):t("اختيار من الكتالوج")}</button>}
  {item.name&&(item.imageUrl||catalogItem?.imageUrl)&&<span className="product-option order-product-thumbnail"><ProductThumbnail imageUrl={item.imageUrl||catalogItem?.imageUrl} imageUrls={catalogItem?.imageUrls}/></span>}
  {open&&<>
   <input className="field" aria-label={t("بحث عن منتج")} placeholder={t("ابحث بالاسم أو SKU")} value={query} onChange={e=>setQuery(e.target.value)}/>
   <div className="product-results">
    {matches.map(product=><button key={product.sku+'|'+product.name} type="button" className="btn secondary product-option" title={product.name} onClick={()=>{
     onChange({name:product.name,sku:product.sku,price:product.price,imageUrl:product.imageUrl});
     setOpen(false);
    }}><ProductThumbnail imageUrl={product.imageUrl} imageUrls={product.imageUrls}/><span>{product.name}</span></button>)}
    {!matches.length&&<small className="muted">{t("مفيش نتائج مطابقة. تقدر تدخل اسم المنتج يدويًا.")}</small>}
   </div>
  </>}
 </div>;
}
