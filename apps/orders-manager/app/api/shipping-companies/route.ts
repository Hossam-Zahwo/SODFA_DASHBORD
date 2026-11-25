import {NextResponse} from 'next/server';
import {requireAccess} from '@/lib/access';
import {getShippingCompanies,addShippingCompany} from '@/lib/database';

export const dynamic='force-dynamic';

export async function GET(request:Request){
 const blocked=await requireAccess(request);
 if(blocked)return blocked;
 try{return NextResponse.json({data:await getShippingCompanies()})}
 catch{return NextResponse.json({error:'تعذر تحميل شركات الشحن'},{status:503})}
}

export async function POST(request:Request){
 const blocked=await requireAccess(request);
 if(blocked)return blocked;
 const body=await request.json().catch(()=>null);
 const name=typeof body?.name==='string'?body.name.normalize('NFKC').trim().replace(/\s+/g,' '):'';
 if(name.length<2||name.length>120)return NextResponse.json({error:'اكتب اسم شركة شحن من 2 إلى 120 حرف.'},{status:400});
 try{return NextResponse.json({data:await addShippingCompany(name)})}
 catch{return NextResponse.json({error:'تعذر حفظ شركة الشحن'},{status:503})}
}
