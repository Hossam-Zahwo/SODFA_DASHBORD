import {NextResponse} from 'next/server';
import {authenticate,getStaff,setStaffCookie,clearStaffCookie} from '@/lib/staff-auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'no-store'};
function failure(message:string,status=503){return NextResponse.json({error:message},{status,headers:noStore})}
function configError():string|null{
  if(!process.env.DATABASE_URL)return 'اتصال قاعدة البيانات مش متظبط: DATABASE_URL ناقص في إعدادات التشغيل المحلية.';
  const key=process.env.SESSION_SIGNING_SECRET||process.env.NEON_AUTH_COOKIE_SECRET;
  if(!key||key.length<32)return 'مفتاح جلسة الدخول ناقص أو غير صالح: تأكد من SESSION_SIGNING_SECRET أو NEON_AUTH_COOKIE_SECRET.';
  return null;
}
export async function GET(req:Request){
  const config=configError();if(config)return failure(config);
  try{
    const user=await getStaff(req);
    return user?NextResponse.json({user},{headers:noStore}):failure('لازم تسجّل دخول الأول.',401);
  }catch(error){
    console.error('[staff-session:get] Session validation failed',error);
    return failure('تعذر قراءة جلسة الدخول من Neon. تأكد من DATABASE_URL واتصال قاعدة البيانات.');
  }
}
export async function POST(req:Request){
  const origin=req.headers.get('origin');
  if(origin&&new URL(origin).host!==new URL(req.url).host)return failure('طلب دخول من مصدر غير موثوق.',403);
  if(req.headers.get('sec-fetch-site')==='cross-site')return failure('طلب دخول غير مسموح.',403);
  const config=configError();if(config)return failure(config);
  let body:unknown;
  try{body=await req.json()}catch{return failure('بيانات الدخول غير صالحة.',400)}
  const input=body as Record<string,unknown>|null;
  const email=input?.email,password=input?.password;
  if(typeof email!=='string'||typeof password!=='string'||email.length>254||password.length>256||!password)return failure('راجع البريد وكلمة المرور.',400);
  try{
    const user=await authenticate(email,password);
    if(!user)return failure('البريد الإلكتروني أو كلمة المرور غير صحيحة، أو الحساب مقفول مؤقتًا.',401);
    const response=NextResponse.json({user},{headers:noStore});
    response.headers.append('Set-Cookie',setStaffCookie(user));
    return response;
  }catch(error){
    console.error('[staff-session:post] Login database or cookie error',error);
    return failure('تعذر التحقق من الحساب في قاعدة Neon. تأكد إن DATABASE_URL صحيح وإن جدول staff_users موجود، وراجع أخطاء السيرفر.');
  }
}
export async function DELETE(req:Request){
  const origin=req.headers.get('origin');
  if(origin&&new URL(origin).host!==new URL(req.url).host)return failure('طلب غير مسموح.',403);
  const response=NextResponse.json({ok:true},{headers:noStore});
  response.headers.append('Set-Cookie',clearStaffCookie());
  return response;
}
