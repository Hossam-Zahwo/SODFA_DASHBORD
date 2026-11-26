import {NextResponse} from 'next/server';
import {requireAccess} from '@/lib/access';
import {getOrders,saveOrder,removeOrder,audit,addOrderLocality} from '@/lib/database';
import {statuses,type Order} from '@/lib/types';
import {talaExpress} from '@/lib/tala-shipping';
import {dispatchTalaOrder,keepTalaRequestForReview,parseTalaDestination,prepareTalaDispatch} from '@/lib/tala-dispatch';
import {closedWithoutDelivery} from '@/lib/carrier-tracking';
export const maxDuration=45;
export const runtime='nodejs';export const dynamic='force-dynamic';
function replyError(e:unknown){const msg=e instanceof Error?e.message:'Unexpected error';if(msg==='INVALID_ORDER_LOCATION')return NextResponse.json({error:'اختار المدينة أو المنطقة التابعة للمحافظة.'},{status:400});return NextResponse.json({error:msg==='CONFLICT'?'الطلب اتعدل من مكان تاني. حدّث البيانات وحاول تاني':msg==='NOT_FOUND'?'الطلب غير موجود':msg.includes('not configured')?'Neon مش مربوط':'حصل خطأ في الاتصال بقاعدة البيانات'},{status:msg==='CONFLICT'?409:msg==='NOT_FOUND'?404:503})}
function normalizePhone(value:unknown){
 if(typeof value!=='string')return '';
 return value.normalize('NFKC')
  .replace(/[٠-٩۰-۹]/g,d=>String(d.charCodeAt(0)-(d.charCodeAt(0)>=0x6f0?0x6f0:0x660)))
  .replace(/[\s\p{Cf}().\p{Pd}]/gu,'');
}
function validationError(o:Order){
 if(!o||!['homey','sodfa'].includes(o.brand))return 'اختار المتجر للطلب.';
 if(typeof o.customerName!=='string'||o.customerName.trim().length<2)return 'اكتب اسم العميل بحرفين على الأقل.';
 if(!/^\+?\d{8,15}$/.test(normalizePhone(o.phone)))return 'راجع رقم موبايل العميل. اكتب من 8 إلى 15 رقم.';
 if(!Array.isArray(o.items)||!o.items.length||o.items.length>50)return 'أضف من منتج واحد إلى 50 منتج.';
 for(const [index,item] of o.items.entries()){
  if(typeof item?.name!=='string'||!item.name.trim())return `اكتب اسم المنتج رقم ${index+1}.`;
  if(!Number.isFinite(item.quantity)||item.quantity<=0)return `راجع عدد القطع للمنتج رقم ${index+1}.`;
  if(!Number.isFinite(item.price)||item.price<0)return `راجع سعر المنتج رقم ${index+1}.`;
 }
 if(typeof o.governorate!=='string'||typeof o.city!=='string')return 'راجع المحافظة والمدينة.';
 if(o.courier!==undefined&&(typeof o.courier!=='string'||o.courier.length>120))return 'راجع اسم المندوب.';
 if(!statuses.includes(o.status))return 'اختار حالة صحيحة للطلب.';
 if([o.shipping,o.discount,o.prepaid].some(value=>!Number.isFinite(value)||value<0))return 'راجع مبالغ الشحن والخصم والمدفوع مقدمًا.';
 if(o.shippingCompany!==undefined&&(typeof o.shippingCompany!=='string'||o.shippingCompany.length>120))return 'راجع اسم شركة الشحن.';
 if(o.manualTotal!=null&&(!Number.isFinite(o.manualTotal)||o.manualTotal<0||o.manualTotal>999999999999.99||Math.abs(o.manualTotal-Math.round(o.manualTotal*100)/100)>1e-8))return 'راجع السعر الإجمالي. اكتب مبلغ بالجنيه بحد أقصى رقمين بعد العلامة العشرية.';
 if(o.manualCollection!=null&&(!Number.isFinite(o.manualCollection)||o.manualCollection<0||o.manualCollection>999999999999.99||Math.abs(o.manualCollection-Math.round(o.manualCollection*100)/100)>1e-8))return 'راجع المبلغ المطلوب تحصيله. اكتب مبلغ بالجنيه بحد أقصى رقمين بعد العلامة العشرية.';
 if(o.carrierReceived!==undefined&&(!Number.isFinite(o.carrierReceived)||o.carrierReceived<0||o.carrierReceived>999999999999.99||Math.abs(o.carrierReceived-Math.round(o.carrierReceived*100)/100)>1e-8))return 'راجع المبلغ المستلم من شركة الشحن.';
 return '';
}
export async function GET(r:Request){const blocked=await requireAccess(r);if(blocked)return blocked;try{return NextResponse.json({data:await getOrders()})}catch(e){return replyError(e)}}
export async function POST(r:Request){
 const blocked=await requireAccess(r);
 if(blocked)return blocked;
 try{
  const o=await r.json() as Order & {talaDestination?:unknown;retryTala?:boolean};
  const error=validationError(o);
  if(error)return NextResponse.json({error},{status:400});
  const creationRequestId=!o.id&&typeof o.creationRequestId==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(o.creationRequestId)?o.creationRequestId:undefined;
  const retry=Boolean(o.id&&o.retryTala===true);
  const shouldDispatch=(!o.id||retry)&&o.brand==='homey'&&o.shippingCompany===talaExpress&&!closedWithoutDelivery(o)&&o.status!=='delivered';
  const destination=shouldDispatch?parseTalaDestination(o.talaDestination):null;
  if(shouldDispatch&&(!destination||typeof o.address!=='string'||!o.address.trim()||typeof o.city!=='string'||o.city.trim().length<2))return NextResponse.json({error:'اختار منطقة تالا واكتب العنوان بالتفصيل.'},{status:400});
  if(shouldDispatch&&destination&&!await addOrderLocality(o.governorate,o.city.trim()))return NextResponse.json({error:'راجع المحافظة والمنطقة المختارتين لتالا.'},{status:400});
  const saved=await saveOrder({...o,city:o.city.trim(),customerName:o.customerName.trim(),phone:normalizePhone(o.phone)},creationRequestId);
  await audit(o.id?'update':'create','order',saved.id,saved.brand,JSON.stringify({status:saved.status,shippingCompany:saved.shippingCompany,carrierReceived:saved.carrierReceived})).catch(console.error);
  let tala;
  if(shouldDispatch&&destination){
   try{
    const dispatch=await prepareTalaDispatch(destination);
    tala=await dispatchTalaOrder(saved,dispatch,retry);
   }catch{
    await keepTalaRequestForReview(saved,destination).catch(console.error);
    tala={state:'unavailable' as const};
   }
  }
  return NextResponse.json({data:saved,tala});
 }catch(e){return replyError(e)}
}
export async function DELETE(r:Request){const blocked=await requireAccess(r);if(blocked)return blocked;try{const {id,version}=await r.json();if(typeof id!=='string'||!Number.isInteger(version))return NextResponse.json({error:'Invalid request'},{status:400});const o=await removeOrder(id,version);await audit('delete','order',id,o.brand,'soft deleted').catch(console.error);return NextResponse.json({ok:true})}catch(e){return replyError(e)}}
