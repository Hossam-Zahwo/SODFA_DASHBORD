'use client';
import { ordersManagerPath } from "@/lib/app-path";
import {useTranslation} from '@/app/language';

import {printDocuments,printKeys} from '@/lib/print-history';
import {useEffect,useState} from 'react';
import type {Order} from '@/lib/types';
import {OrderInvoice} from '@/components/order-invoice';
export default function Invoice({params}:{params:Promise<{id:string}>}){
 const t=useTranslation();
 const [order,setOrder]=useState<Order|null>(null),[err,setErr]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;params.then(async({id})=>{try{const r=await fetch(ordersManagerPath('/api/orders'),{credentials:'same-origin',cache:'no-store'});const j=await r.json();if(!r.ok)throw Error('لازم تسجّل الدخول الأول');const found=(j.data as Order[]).find(x=>x.id===id);if(!found)throw Error('الطلب غير موجود');if(active)setOrder(found)}catch(e){if(active)setErr(e instanceof Error?e.message:'حصل خطأ')}finally{if(active)setLoading(false)}});return()=>{active=false}},[params]);
 if(loading)return <main className="invoice-state">{t("جاري تحميل الفاتورة...")}</main>;
 if(err||!order)return <main className="invoice-state">{err||t("الفاتورة غير متاحة")} <a href={ordersManagerPath("/")}>{t("رجوع")}</a></main>;
 return <OrderInvoice order={order} onPrint={()=>void printDocuments(printKeys([order])).catch(()=>alert(t('اتفتح مربع الطباعة، لكن حالة الطباعة ما اتحفظتش.')))}/>;
}
