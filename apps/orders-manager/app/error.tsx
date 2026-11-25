'use client';
import {useTranslation} from '@/app/language';

import {useEffect} from 'react';
export default function Error({error,reset}:{error:Error & {digest?:string};reset:()=>void}){
 const t=useTranslation();
 useEffect(()=>{console.error('Orders manager error:',error)},[error]);
 return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f6f7f5',fontFamily:'Tahoma,Arial,sans-serif',padding:20}}>
  <section style={{background:'#fff',padding:30,borderRadius:20,maxWidth:520,width:'100%',boxShadow:'0 3px 20px #00000010'}}>
   <h1 style={{color:'#687b4a'}}>{t("تعذر عرض لوحة الأوردرات")}</h1>
   <p>{t("حصل خطأ أثناء تحميل لوحة الإدارة.")}</p>
   <p style={{color:'#686868',fontSize:13}}>{t("حدّث الصفحة وحاول تاني.")}</p>
   <button onClick={()=>reset()} style={{background:'#687b4a',color:'#fff',padding:'12px 18px',border:0,borderRadius:10,cursor:'pointer'}}>{t("إعادة المحاولة")}</button>
  </section></main>
}
