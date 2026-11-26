import {NextResponse} from 'next/server';
import {requireAccess} from '@/lib/access';
import {getPrintHistory,recordPrintHistory} from '@/lib/database';

export async function GET(request:Request){
 const blocked=await requireAccess(request);
 if(blocked)return blocked;
 return NextResponse.json({data:await getPrintHistory()},{headers:{'Cache-Control':'no-store'}});
}

export async function POST(request:Request){
 const blocked=await requireAccess(request);
 if(blocked)return blocked;
 const body=await request.json().catch(()=>null);
 const keys=body?.keys;
 if(!Array.isArray(keys)||keys.length>10000||keys.some(key=>typeof key!=='string'||!(/^(order:[\da-f-]{36}|customer:(homey|sodfa):\d{1,30})$/i.test(key)))){
  return NextResponse.json({error:'بيانات الطباعة غير صالحة'},{status:400});
 }
 if(keys.length)await recordPrintHistory([...new Set<string>(keys)]);
 return NextResponse.json({ok:true});
}
