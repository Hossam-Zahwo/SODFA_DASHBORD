import {NextResponse} from 'next/server';
import {getStaff} from '@/lib/staff-auth';
export async function requireAccess(request:Request):Promise<NextResponse|null>{
 try{
  if(!['GET','HEAD','OPTIONS'].includes(request.method)){
   const origin=request.headers.get('origin');
   if(origin&&new URL(origin).host!==new URL(request.url).host)return NextResponse.json({error:'Invalid origin'},{status:403});
   if(request.headers.get('sec-fetch-site')==='cross-site')return NextResponse.json({error:'Invalid request'},{status:403});
  }
  const user=await getStaff(request);
  return user?null:NextResponse.json({error:'Sign in required'},{status:401,headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Dashboard authentication is unavailable'},{status:503})}
}
