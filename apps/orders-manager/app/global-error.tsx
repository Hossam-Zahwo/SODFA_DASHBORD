'use client';

import {useEffect,useState} from 'react';

export default function GlobalError({reset}:{error:Error & {digest?:string};reset:()=>void}){
 const [english,setEnglish]=useState(false);
 useEffect(()=>{setEnglish(localStorage.getItem('orders-manager-language')==='en')},[]);
 return <html lang={english?'en':'ar'} dir={english?'ltr':'rtl'}><body style={{margin:0,background:'#f5f7f3',fontFamily:'Tahoma,Arial,sans-serif'}}>
  <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:20}}>
   <section style={{background:'white',borderRadius:18,padding:28,maxWidth:460,width:'100%'}}>
    <h1 style={{color:'#697b4a'}}>{english?'Could not open Orders Manager':'تعذّر فتح سيستم الأوردرات'}</h1>
    <p>{english?'Refresh the page and try again.':'حدّث الصفحة وحاول تاني.'}</p>
    <button onClick={reset} style={{padding:'12px 22px',background:'#697b4a',color:'#fff',border:0,borderRadius:10}}>{english?'Try again':'حاول تاني'}</button>
   </section>
  </main>
 </body></html>;
}
