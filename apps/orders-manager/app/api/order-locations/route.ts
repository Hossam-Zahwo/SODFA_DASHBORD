import {NextResponse} from 'next/server';
import {requireAccess} from '@/lib/access';
import {addOrderLocality,getOrderLocations} from '@/lib/database';
import {govs} from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
 const blocked = await requireAccess(request);
 if (blocked) return blocked;
 try {
  const data=await getOrderLocations();
  for(const governorate of govs)if(!Object.hasOwn(data,governorate))data[governorate]=[];
  return NextResponse.json({data});
 } catch {
  return NextResponse.json({error: 'تعذر تحميل المحافظات والمدن. حاول تاني.'}, {status: 503});
 }
}

export async function POST(request:Request){
 const blocked=await requireAccess(request);
 if(blocked)return blocked;
 const body=await request.json().catch(()=>null);
 const governorate=typeof body?.governorate==='string'?body.governorate.trim():'';
 const city=typeof body?.city==='string'?body.city.normalize('NFC').trim().replace(/ +/g,' '):'';
 if(!governorate||governorate.length>120||city.length<2||city.length>120||!/[\p{L}]/u.test(city)||/[\p{Cc}\p{Cf}]/u.test(city)){
  return NextResponse.json({error:'invalid_location'},{status:400});
 }
 try{
  if(!await addOrderLocality(governorate,city))return NextResponse.json({error:'invalid_location'},{status:400});
  return NextResponse.json({data:{governorate,city}});
 }catch{return NextResponse.json({error:'location_unavailable'},{status:503})}
}
