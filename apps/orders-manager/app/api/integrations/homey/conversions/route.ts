import {NextResponse} from 'next/server';
import {createHash,timingSafeEqual} from 'node:crypto';
import {neon} from '@neondatabase/serverless';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=45;
const PIXEL_ID='1062573933474128';
const TIKTOK_ID='DC0ACP3C77U78FB32HAG';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Provider='meta'|'tiktok';
type WebhookPayload={
  type?:unknown;table?:unknown;schema?:unknown;
  record?:Record<string,unknown>;
};
function json(body:unknown,status=200){return NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});}
function authorized(value:string|null,secret:string):boolean{
  if(!value||!secret)return false;
  const a=createHash('sha256').update(value).digest();
  const b=createHash('sha256').update(secret).digest();
  return timingSafeEqual(a,b);
}
function numberField(value:unknown):number|null{
  const num=typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):NaN;
  return Number.isFinite(num)&&num>=0?num:null;
}
async function deliver(provider:Provider,orderId:string,time:number,value:number):Promise<{ok:boolean;http:number;reason:string}>{
  try{
    if(provider==='meta'){
      const token=process.env.META_CAPI_ACCESS_TOKEN;
      if(!token)return {ok:false,http:0,reason:'missing Meta secret'};
      const response=await fetch('https://graph.facebook.com/v24.0/'+PIXEL_ID+'/events',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
        body:JSON.stringify({data:[{
          event_name:'Purchase',event_id:orderId,event_time:time,
          action_source:'website',event_source_url:'https://www.homeyegypt.com/cart',
          custom_data:{currency:'EGP',value,order_id:orderId}
        }]}),signal:AbortSignal.timeout(10000)
      });
      const result=await response.json().catch(()=>null) as {error?:unknown;events_received?:number}|null;
      return {ok:response.ok&&!result?.error&&typeof result?.events_received==='number'&&result.events_received>0,http:response.status,reason:response.ok?'provider did not acknowledge event':'provider rejected event'};
    }
    const token=process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN;
    if(!token)return {ok:false,http:0,reason:'missing TikTok secret'};
    const response=await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/',{
      method:'POST',headers:{'Content-Type':'application/json','Access-Token':token},
      body:JSON.stringify({event_source:'web',event_source_id:TIKTOK_ID,data:[{
        event:'PlaceAnOrder',event_id:orderId,event_time:time,
        properties:{currency:'EGP',value,order_id:orderId,content_type:'product'}
      }]}),signal:AbortSignal.timeout(10000)
    });
    const result=await response.json().catch(()=>null) as {code?:number}|null;
    return {ok:response.ok&&result?.code===0,http:response.status,reason:'provider response not accepted'};
  }catch{return {ok:false,http:0,reason:'transport timeout or network error'};}
}
export async function POST(request:Request){
  if(!process.env.DATABASE_URL||!process.env.HOMEY_WEBHOOK_SECRET)return json({error:'Not configured'},503);
  if(!authorized(request.headers.get('x-homey-webhook-secret'),process.env.HOMEY_WEBHOOK_SECRET))return json({error:'Unauthorized'},401);
  if(Number(request.headers.get('content-length')||0)>32768)return json({error:'Payload too large'},413);
  let raw:string;
  try{raw=await request.text();if(raw.length>32768)return json({error:'Payload too large'},413);}catch{return json({error:'Unreadable request'},400);}
  let payload:WebhookPayload;
  try{payload=JSON.parse(raw);}catch{return json({error:'Invalid JSON'},400);}
  if(payload.type!=='INSERT'||payload.schema!=='public'||payload.table!=='homly_orders')return json({skipped:'not a Homey order INSERT'});
  const o=payload.record;
  if(!o||!UUID.test(String(o.id||'')))return json({error:'Invalid order ID'},422);
  // Only store-originated, explicitly consented transactions, never staff-entered SODFA orders.
  if(o.analytics_consent!==true)return json({skipped:'customer did not opt into optional ad tracking'});
  const total=numberField(o.total_minor),shipping=numberField(o.shipping_minor);
  if(total===null||shipping===null||shipping>total)return json({error:'Invalid monetary totals'},422);
  const value=Number(((total-shipping)/100).toFixed(2));
  const eventTime=Math.floor(new Date(String(o.created_at||'')).getTime()/1000);
  if(!Number.isFinite(eventTime)||eventTime<=0||eventTime>Date.now()/1000+300)return json({error:'Invalid event time'},422);
  const id=String(o.id),db=neon(process.env.DATABASE_URL);
  const states:Record<string,string>={};
  for(const provider of ['meta','tiktok'] as const){
    // A unique (order,platform) record and short lease prevent parallel webhook retries
    // from sending the same conversion simultaneously. Successful events are never resent.
    let reserved;
    try{
      reserved=await db`
        INSERT INTO public.homey_conversion_deliveries
        (source_order_id,provider,event_name,event_time,value_egp,consent_verified,state,attempts,lease_until)
        VALUES (${id}::uuid,${provider},${provider==='meta'?'Purchase':'PlaceAnOrder'},${eventTime},${value},true,'sending',1,now()+interval '90 seconds')
        ON CONFLICT(source_order_id,provider) DO UPDATE
        SET state='sending',attempts=homey_conversion_deliveries.attempts+1,
            lease_until=now()+interval '90 seconds',updated_at=now()
        WHERE homey_conversion_deliveries.state IN ('pending','error')
           OR (homey_conversion_deliveries.state='sending' AND homey_conversion_deliveries.lease_until < now())
        RETURNING source_order_id
      `;
    }catch{return json({error:'Ledger unavailable; apply migration first'},503);}
    if(!reserved.length){states[provider]='already processed or in progress';continue;}
    const sent=await deliver(provider,id,eventTime,value);
    try{
      await db`UPDATE public.homey_conversion_deliveries
        SET state=${sent.ok?'sent':'error'},
          last_http_status=${sent.http||null},last_error=${sent.ok?null:sent.reason},
          sent_at=CASE WHEN ${sent.ok} THEN now() ELSE sent_at END,
          lease_until=NULL,updated_at=now()
        WHERE source_order_id=${id}::uuid AND provider=${provider}`;
    }catch{return json({error:'Delivery ledger update failed; reconcile before retrying'},503);}
    states[provider]=sent.ok?'sent':'error';
  }
  return json({orderId:id,platforms:states},Object.values(states).includes('error')?502:200);
}
