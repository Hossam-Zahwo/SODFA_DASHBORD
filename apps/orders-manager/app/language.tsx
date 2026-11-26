'use client';

import {createContext, useContext, useEffect, useState} from 'react';
import {english} from '@/lib/translations';

type Language = 'ar' | 'en';
const storageKey = 'orders-manager-language';
const LanguageContext = createContext({
 language: 'ar' as Language,
 setLanguage: (_language: Language) => {},
});

export function LanguageProvider({children}: {children: React.ReactNode}) {
 const [language, setCurrentLanguage] = useState<Language>('ar');

 function applyLanguage(next: Language) {
  document.documentElement.lang = next;
  document.documentElement.dir = next === 'en' ? 'ltr' : 'rtl';
  document.title = next === 'en' ? 'Orders Manager | HOMEY & SODFA' : 'إدارة الطلبات | هومي وصدفة';
  setCurrentLanguage(next);
 }

 useEffect(() => {
  if (localStorage.getItem(storageKey) === 'en') applyLanguage('en');
 }, []);

 function setLanguage(next: Language) {
  localStorage.setItem(storageKey, next);
  applyLanguage(next);
 }

 return <LanguageContext.Provider value={{language, setLanguage}}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
 return useContext(LanguageContext);
}

export function useTranslation() {
 const {language} = useLanguage();
 return (message: string) => {
  if (language === 'ar') return message;
  const key = message.trim();
  if (Object.hasOwn(english, key)) return message.replace(key, english[key]);
  const numbered = /^(.*?)(\s+\d+[.!]?)$/u.exec(key);
  if (numbered && Object.hasOwn(english, numbered[1])) return english[numbered[1]] + numbered[2];
  return message;
 };
}

export function LanguageSwitch() {
 const {language, setLanguage} = useLanguage();
 return <button className="btn secondary language-switch" type="button"
  lang={language === 'ar' ? 'en' : 'ar'} onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}>
  {language === 'ar' ? 'English' : 'العربية'}
 </button>;
}
