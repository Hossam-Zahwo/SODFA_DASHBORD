'use client';
import { ordersManagerPath } from "@/lib/app-path";
import {useTranslation} from '@/app/language';


import {useEffect,useState} from 'react';

type InstallPrompt = Event & {prompt: () => Promise<unknown>};

export function InstallApp() {
 const t=useTranslation();
 const [prompt,setPrompt]=useState<InstallPrompt|null>(null);
 const [installed,setInstalled]=useState(true);
 const [showHelp,setShowHelp]=useState(false);

 useEffect(()=>{
  if('serviceWorker' in navigator)void navigator.serviceWorker.register(ordersManagerPath('/service-worker.js')).catch(()=>{});
  const iosStandalone=(navigator as Navigator & {standalone?:boolean}).standalone;
  setInstalled(window.matchMedia('(display-mode: standalone)').matches||iosStandalone===true);
  function onPrompt(event:Event){event.preventDefault();setPrompt(event as InstallPrompt)}
  function onInstalled(){setInstalled(true);setPrompt(null)}
  window.addEventListener('beforeinstallprompt',onPrompt);
  window.addEventListener('appinstalled',onInstalled);
  return ()=>{
   window.removeEventListener('beforeinstallprompt',onPrompt);
   window.removeEventListener('appinstalled',onInstalled);
  };
 },[]);

 if(installed)return null;
 return <div className="install-app">
  <button type="button" className="btn secondary tiny" onClick={async()=>{
   if(prompt){
    try{await prompt.prompt()}catch{setShowHelp(true)}
    setPrompt(null);
   }else setShowHelp(!showHelp);
  }}>{t("تثبيت التطبيق")}</button>
  {showHelp&&<p className="muted">{t("على iPhone افتح الرابط في Safari، واضغط مشاركة ← إضافة إلى الشاشة الرئيسية، وفعّل «فتح كتطبيق ويب» لو ظهر. على Android افتح قائمة Chrome واختر «تثبيت التطبيق».")}</p>}
 </div>;
}
