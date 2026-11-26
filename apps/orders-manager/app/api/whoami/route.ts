import {NextResponse} from 'next/server';
import {getStaff} from '@/lib/staff-auth';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:Request){try{const user=await getStaff(req);return user?NextResponse.json({ok:true,user},{headers:{'Cache-Control':'no-store'}}):NextResponse.json({error:'Sign in required'},{status:401})}catch{return NextResponse.json({error:'Authentication unavailable'},{status:503})}}
