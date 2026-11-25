import type {Brand} from './types';

export function customerPrintKey(brand:Brand,phone:string){
 const digits=phone.replace(/[٠-٩۰-۹]/g,d=>String(d.charCodeAt(0)-(d.charCodeAt(0)>=0x6f0?0x6f0:0x660))).replace(/\D/g,'');
 return digits?'customer:'+brand+':'+digits:'';
}

export function printKeys(rows:{id?:string|null;brand:Brand;phone:string}[]){
 return [...new Set(rows.flatMap(row=>[row.id?'order:'+row.id:'',customerPrintKey(row.brand,row.phone)]).filter(Boolean))];
}

export async function printDocuments(keys:string[]){
 const recording=fetch('/api/print-history',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({keys}),keepalive:JSON.stringify({keys}).length<60000,
 });
 window.print();
 const response=await recording;
 if(!response.ok)throw new Error('اتفتح مربع الطباعة، لكن حالة الطباعة ما اتحفظتش.');
}
