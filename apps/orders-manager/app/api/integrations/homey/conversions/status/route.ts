import {NextResponse} from 'next/server';
import {neon} from '@neondatabase/serverless';
import {requireAccess} from '@/lib/access';
export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(request:Request){
  const blocked=await requireAccess(request);
  if(blocked)return blocked;
  if(!process.env.ORDERS_MANAGER_DATABASE_URL)return NextResponse.json({error:'Neon غير متصل'},{status:503});
  try{
    const db=neon(process.env.ORDERS_MANAGER_DATABASE_URL);
    const [records]=await db`
      SELECT count(*)::integer AS total,
       count(*) FILTER(WHERE provider='meta' AND state='sent')::integer AS meta_sent,
       count(*) FILTER(WHERE provider='tiktok' AND state='sent')::integer AS tiktok_sent,
       count(*) FILTER(WHERE state='error')::integer AS errors,
       count(*) FILTER(WHERE state IN ('pending','sending'))::integer AS pending,
       max(updated_at) AS last_update
      FROM public.homey_conversion_deliveries
    `;
    return NextResponse.json({
      configured:{
        webhook:!!process.env.HOMEY_WEBHOOK_SECRET,
        meta:!!process.env.META_CAPI_ACCESS_TOKEN,
        tiktok:!!process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN
      },
      summary:records
    },{headers:{'Cache-Control':'no-store'}});
  }catch{
    return NextResponse.json({error:'جدول ربط التحويلات غير متاح؛ راجع تنفيذ Migration'},{status:503});
  }
}
