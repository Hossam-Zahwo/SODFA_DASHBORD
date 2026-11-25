import {NextResponse} from 'next/server';
import {requireAccess} from '@/lib/access';
import {createWaybill,getWaybills} from '@/lib/waybills';
import {audit} from '@/lib/database';
import type {WaybillDraft} from '@/lib/types';
export const runtime='nodejs';export const dynamic='force-dynamic';
const okText=(x:unknown,n=300)=>typeof x==='string'&&x.length<=n;
function valid(w:WaybillDraft){
 const money=[w.invoiceAmount,w.shippingCost,w.prepaid];
 return ['homey','sodfa'].includes(w.brand)&&okText(w.customerName,150)&&w.customerName.trim().length>1&&
 okText(w.phone,25)&&/^[+0-9 ()-]{8,25}$/.test(w.phone)&&
 okText(w.address,600)&&w.address.trim().length>2&&
 ['alternatePhone','governorate','city','paymentMethod','description','notes'].every(k=>okText(w[k as keyof WaybillDraft],k==='notes'?2000:500))&&
 money.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100000000)&&w.prepaid<=w.invoiceAmount+w.shippingCost&&
 (!w.customerId||/^[0-9a-f-]{36}$/i.test(w.customerId))&&(!w.orderId||/^[0-9a-f-]{36}$/i.test(w.orderId));
}
export async function GET(req:Request){
 const blocked=await requireAccess(req);if(blocked)return blocked;
 try{return NextResponse.json({data:await getWaybills()},{headers:{'Cache-Control':'no-store'}})}
 catch{return NextResponse.json({error:'تعذر تحميل البوالص'},{status:503})}
}
export async function POST(req:Request){
 const blocked=await requireAccess(req);if(blocked)return blocked;
 try{
 const w=await req.json() as WaybillDraft;
 if(!w||!valid(w))return NextResponse.json({error:'راجع بيانات البوليصة وقيمة الفاتورة والشحن'},{status:400});
 const saved=await createWaybill(w);await audit('create','waybill',saved.id,saved.brand,saved.reference).catch(console.error);
 return NextResponse.json({data:saved},{status:201});
 }catch{return NextResponse.json({error:'تعذر حفظ البوليصة، تأكد من بيانات العميل والطلب'},{status:503})}
}
