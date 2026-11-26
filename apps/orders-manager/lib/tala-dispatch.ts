import {neon} from '@neondatabase/serverless';
import {collectionFromCustomer} from './carrier-tracking';
import {graphql,login} from './tala-api';
import {allowedTalaEndpoint,readTalaSettings} from './tala-settings-store';
import type {Order} from './types';

export type TalaDestination={serviceId:number;zoneId:number;subzoneId:number;weight:number;piecesCount:number;typeCode:'FDP';openableCode:'Y'|'N'};
type DispatchResult={state:'sent';trackingCode:string}|{state:'review'|'unavailable'};
type Option={id:number};
type TalaLookup={listShipments:{paginatorInfo:{hasMorePages:boolean};data:{id:number;code:string;refNumber:string|null;recipientMobile:string}[]}};
const localPhone=(phone:string)=>phone.replace(/\D/g,'').replace(/^0020(?=1)/,'0').replace(/^20(?=1)/,'0');
const serviceQuery='query { listShippingServicesDropdown(input:{active:true}) { id } }';
const zoneQuery='query ($id:Int!) { listZonesDropdown(input:{active:true,service:{serviceId:$id}}) { id } }';
const subzoneQuery='query ($id:Int!) { listZonesDropdown(input:{active:true,parentId:$id}) { id } }';
const lookupQuery='query ($input:ListShipmentsFilterInput) { listShipments(input:$input,first:10) { paginatorInfo { hasMorePages } data { id code refNumber recipientMobile } } }';
const createQuery='mutation CreateShipment($input:ShipmentInput!) { saveShipment(input:$input) { id code } }';

export function parseTalaDestination(value:unknown):TalaDestination|null{
 if(!value||typeof value!=='object')return null;
 const {serviceId,zoneId,subzoneId,weight,piecesCount,typeCode,openableCode}=value as TalaDestination;
 return [serviceId,zoneId,subzoneId].every(id=>Number.isInteger(id)&&id>0&&id<=2147483647)
  &&Number.isFinite(weight)&&weight>0&&weight<=1000&&Number.isInteger(piecesCount)&&piecesCount>0&&piecesCount<=1000
  &&typeCode==='FDP'&&(openableCode==='Y'||openableCode==='N')
  ?{serviceId,zoneId,subzoneId,weight,piecesCount,typeCode,openableCode}:null;
}

export async function prepareTalaDispatch(destination:TalaDestination){
 const {input,endpoint,revision}=await readTalaSettings('homey');
 if(!input||!allowedTalaEndpoint(endpoint))throw new Error('Tala unavailable');
 const token=await login('homey:'+revision,endpoint,input);
 const [services,zones,subzones]=await Promise.all([
  graphql<{listShippingServicesDropdown:Option[]}>(endpoint,serviceQuery,{},'en',token),
  graphql<{listZonesDropdown:Option[]}>(endpoint,zoneQuery,{id:destination.serviceId},'en',token),
  graphql<{listZonesDropdown:Option[]}>(endpoint,subzoneQuery,{id:destination.zoneId},'en',token),
 ]);
 if(!services.listShippingServicesDropdown.some(item=>item.id===destination.serviceId)||
  !zones.listZonesDropdown.some(item=>item.id===destination.zoneId)||
  !subzones.listZonesDropdown.some(item=>item.id===destination.subzoneId))throw new Error('Invalid Tala destination');
 return {endpoint,token,destination};
}

function buildRequestPayload(order:Order,destination:TalaDestination){
 const price=collectionFromCustomer(order);
 return {
  serviceId:destination.serviceId,recipientZoneId:destination.zoneId,recipientSubzoneId:destination.subzoneId,
  weight:destination.weight,piecesCount:destination.piecesCount,typeCode:destination.typeCode,openableCode:destination.openableCode,
  refNumber:order.id,recipientName:order.customerName,recipientMobile:order.phone,
  ...(order.alternatePhone?{recipientPhone:order.alternatePhone}:{}),
  recipientAddress:order.address.trim(),price,priceTypeCode:'INCLD' as const,paymentTypeCode:price>0?'COLC' as const:'PAID' as const,
  description:order.items.map(item=>item.name+' × '+item.quantity).join(', ').slice(0,240),
  ...(order.notes?{notes:order.notes.slice(0,2000)}:{}),
 };
}

export async function keepTalaRequestForReview(order:Order,destination:TalaDestination){
 const url=process.env.ORDERS_MANAGER_DATABASE_URL;
 if(!url)throw new Error('Database not configured');
 const sql=neon(url);
 await sql`ALTER TABLE public.tala_order_shipments ADD COLUMN IF NOT EXISTS request_data jsonb NOT NULL DEFAULT '{}'::jsonb`;
 const payload=buildRequestPayload(order,destination);
 await sql`INSERT INTO public.tala_order_shipments(order_id,state,request_data,updated_at)
  VALUES (${order.id}::uuid,'review',${JSON.stringify(payload)}::jsonb,now()-interval '2 minutes')
  ON CONFLICT(order_id) DO UPDATE SET request_data=EXCLUDED.request_data`;
}

export async function dispatchTalaOrder(order:Order,config:Awaited<ReturnType<typeof prepareTalaDispatch>>,retry=false):Promise<DispatchResult>{
 const url=process.env.ORDERS_MANAGER_DATABASE_URL;
 if(!url)return {state:'unavailable'};
 const sql=neon(url);
 const {endpoint,token,destination}=config;
 const requestPayload=buildRequestPayload(order,destination);
 async function markSent(shipment:{id:number;code:string}){
  await sql`UPDATE public.tala_order_shipments SET state='sent',tracking_code=${shipment.code},external_id=${shipment.id},
   updated_at=now() WHERE order_id=${order.id}::uuid`;
  return {state:'sent',trackingCode:shipment.code} as const;
 }
 try{
  await sql`ALTER TABLE public.tala_order_shipments ADD COLUMN IF NOT EXISTS request_data jsonb NOT NULL DEFAULT '{}'::jsonb`;
  if(retry){
   const [existing]=await sql`SELECT state,tracking_code FROM public.tala_order_shipments WHERE order_id=${order.id}::uuid`;
   if(existing?.state==='sent'&&existing.tracking_code)return {state:'sent',trackingCode:String(existing.tracking_code)};
   if(existing?.state!=='review')return {state:'review'};
   const result=await graphql<TalaLookup>(
    endpoint,lookupQuery,{input:{refNumber:[order.id]}},'en',token,
   );
   if(!result.listShipments?.data||result.listShipments.paginatorInfo?.hasMorePages!==false)return {state:'review'};
   const matches=result.listShipments.data.filter(shipment=>shipment.refNumber===order.id);
   if(matches.length>1)return {state:'review'};
   const match=matches[0];
   if(match){
    if(!match.code||!Number.isSafeInteger(match.id))return {state:'review'};
    return await markSent(match);
   }
   const phoneMatches=await graphql<TalaLookup>(endpoint,lookupQuery,{
    input:{search:order.phone,date:{fromDate:order.createdAt.slice(0,10)}},
   },'en',token);
   const recent=phoneMatches.listShipments;
   if(!recent?.data||recent.paginatorInfo?.hasMorePages!==false||
    recent.data.some(shipment=>shipment.recipientMobile&&localPhone(shipment.recipientMobile)===localPhone(order.phone)))return {state:'review'};
  }
  const claim=retry
   ?await sql`UPDATE public.tala_order_shipments SET state='sending',request_data=${JSON.stringify(requestPayload)}::jsonb,updated_at=now()
    WHERE order_id=${order.id}::uuid AND state='review' AND tracking_code IS NULL AND updated_at<now()-interval '2 minutes'
    RETURNING order_id`
   :await sql`INSERT INTO public.tala_order_shipments(order_id,state,request_data) VALUES (${order.id}::uuid,'sending',${JSON.stringify(requestPayload)}::jsonb)
   ON CONFLICT(order_id) DO NOTHING RETURNING order_id`;
  if(!claim.length){
   const [existing]=await sql`SELECT state,tracking_code FROM public.tala_order_shipments WHERE order_id=${order.id}::uuid`;
   return existing?.state==='sent'&&existing.tracking_code?{state:'sent',trackingCode:String(existing.tracking_code)}:{state:'review'};
  }
 }catch{return {state:'unavailable'}}

 try{
  const {saveShipment:shipment}=await graphql<{saveShipment:{id:number;code:string}|null}>(endpoint,createQuery,{input:requestPayload},'en',token);
  if(!shipment?.code||!Number.isSafeInteger(shipment.id))throw new Error('Missing tracking code');
  return await markSent(shipment);
 }catch{
  await sql`UPDATE public.tala_order_shipments SET state='review',updated_at=now() WHERE order_id=${order.id}::uuid`.catch(()=>{});
  return {state:'review'};
 }
}
