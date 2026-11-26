import {NextResponse} from 'next/server';
import {requireAccess} from '@/lib/access';
import {getWaybill} from '@/lib/waybills';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:Request,ctx:{params:Promise<{id:string}>}){
 const blocked=await requireAccess(req);if(blocked)return blocked;
 const {id}=await ctx.params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'معرّف غير صحيح'},{status:400});
 try{
 const record=await getWaybill(id);
 if(!record)return NextResponse.json({error:'البوليصة مش موجودة'},{status:404});
 return NextResponse.json({data:record},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'تعذر تحميل البوليصة'},{status:503})}
}
