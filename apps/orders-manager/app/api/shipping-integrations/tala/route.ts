import {NextResponse} from 'next/server';
import {requireAccess} from '@/lib/access';
import {talaShipmentDateRange,type TalaOption,type TalaTracking,type TalaShipmentSummary} from '@/lib/tala-connection';
import {authenticate,getStaff} from '@/lib/staff-auth';
import {allowedTalaEndpoint,readTalaSettings,writeTalaSettings,type TalaSettings} from '@/lib/tala-settings-store';
import {graphql,login,TalaError,invalidateTalaToken} from '@/lib/tala-api';
import type {Brand} from '@/lib/types';
import {syncTalaOrders} from '@/lib/tala-sync';
import type {TalaCoverageGroup} from '@/lib/tala-coverage';

export const dynamic = 'force-dynamic';

const queries = {
 services: 'query Services { listShippingServicesDropdown(input: { active: true }) { id name } }',
 zones: 'query Zones($id: Int!) { listZonesDropdown(input: { active: true, service: { serviceId: $id } }) { id name } }',
 subzones: 'query Subzones($id: Int!) { listZonesDropdown(input: { active: true, parentId: $id }) { id name } }',
 fees: 'query Fees($input: CalculateShipmentFeesInput!) { calculateShipmentFees(input: $input) { amount delivery weight collection post tax return total } }',
 shipments: 'query Shipments($input: ListShipmentsFilterInput, $page: Int) { listShipments(input: $input, first: 100, page: $page) { paginatorInfo { hasMorePages } data { code refNumber date status { code name } recipientZone { name } recipientSubzone { name } service { name } price deliveryFees deliveredAmount } } }',
 tracking: 'query Track($code: String) { shipment(code: $code) { code refNumber status { code name } } }',
};
const coverageCache=new Map<string,{expiresAt:number;groups:TalaCoverageGroup[]}>();

async function fetchServiceCoverage(endpoint:string,token:string,serviceId:number,cacheKey:string){
 const key=cacheKey+':coverage:'+serviceId;
 const cached=coverageCache.get(key);
 if(cached&&cached.expiresAt>Date.now())return cached.groups;
 const zoneResult=await graphql<{listZonesDropdown?:TalaOption[]}>(endpoint,queries.zones,{id:serviceId},'ar',token);
 const zones=(zoneResult.listZonesDropdown??[]).filter(item=>Number.isSafeInteger(item.id)&&item.id>0&&Boolean(item.name));
 const groups:TalaCoverageGroup[]=[];
 for(let offset=0;offset<zones.length;offset+=8){
  const batch=zones.slice(offset,offset+8);
  const responses=await Promise.all(batch.map(zone=>graphql<{listZonesDropdown?:TalaOption[]}>(
   endpoint,queries.subzones,{id:zone.id},'ar',token,
  )));
  for(let index=0;index<batch.length;index++){
   const subzones=(responses[index].listZonesDropdown??[])
    .filter(item=>Number.isSafeInteger(item.id)&&item.id>0&&Boolean(item.name));
   groups.push({zone:batch[index],subzones});
  }
 }
 coverageCache.set(key,{expiresAt:Date.now()+5*60*1000,groups});
 return groups;
}
function publicSettings(settings:TalaSettings){
 return {configured:Boolean(settings.input),username:settings.input?.username??'',endpoint:settings.endpoint,
  documentation:settings.documentation,support:settings.support,revision:settings.revision};
}

export async function GET(request: Request) {
 const blocked=await requireAccess(request);
 if (blocked) return blocked;
 const brand=new URL(request.url).searchParams.get('brand');
 if (brand !== 'homey' && brand !== 'sodfa') return NextResponse.json({error:'invalid'},{status:400});
 try{
  return NextResponse.json(publicSettings(await readTalaSettings(brand)),{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'settings_unavailable'},{status:503})}
}

export async function PATCH(request:Request){
 const blocked=await requireAccess(request);
 if(blocked)return blocked;
 const body=await request.json().catch(()=>null);
 const {brand,revision,email,password,action}=body??{};
 if((brand!=='homey'&&brand!=='sodfa')||!Number.isSafeInteger(revision)||revision<0||
  typeof email!=='string'||email.length>254||typeof password!=='string'||!password||password.length>256||
  (action!=='save'&&action!=='remove')){
  return NextResponse.json({error:'invalid'},{status:400});
 }

 try{
  const current=await getStaff(request);
  if(!current||email.trim().toLowerCase()!==current.email.toLowerCase()){
   return NextResponse.json({error:'reauthentication_failed'},{status:403});
  }
  const confirmed=await authenticate(email,password);
  if(confirmed?.id!==current.id)return NextResponse.json({error:'reauthentication_failed'},{status:403});

  const settings=await readTalaSettings(brand);
  if(settings.revision!==revision)return NextResponse.json({error:'stale_settings'},{status:409});
  if(action==='remove')settings.input=null;
  else{
   const {endpoint,documentation,support,username,carrierPassword}=body;
   if(typeof endpoint!=='string'||endpoint.length>512||!allowedTalaEndpoint(endpoint)){
    return NextResponse.json({error:'endpoint_not_allowed'},{status:400});
   }
   if(typeof documentation!=='string'||documentation.length>512||
    typeof support!=='string'||support.length>254||(support&&!/^[^\s?&#]+@[^\s?&#]+\.[^\s?&#]+$/.test(support))||
    typeof username!=='string'||username.length>254||typeof carrierPassword!=='string'||carrierPassword.length>512){
    return NextResponse.json({error:'invalid'},{status:400});
   }
   if(documentation){
    let url:URL;
    try{url=new URL(documentation)}catch{return NextResponse.json({error:'invalid'},{status:400})}
    if(url.protocol!=='https:'||url.username||url.password)return NextResponse.json({error:'invalid'},{status:400});
   }
   const carrierUser=username.trim();
   const existingPassword=endpoint===settings.endpoint&&carrierUser===settings.input?.username?settings.input.password:'';
   const nextPassword=carrierPassword||existingPassword;
   if(settings.input&&!carrierUser)return NextResponse.json({error:'carrier_credentials_required'},{status:400});
   if(Boolean(carrierUser)!==Boolean(nextPassword))return NextResponse.json({error:'carrier_credentials_required'},{status:400});
   Object.assign(settings,{endpoint,documentation,support,input:carrierUser?{username:carrierUser,password:nextPassword}:null});
  }

  if(!await writeTalaSettings(brand,settings,current.id))return NextResponse.json({error:'stale_settings'},{status:409});
  return NextResponse.json(publicSettings({...settings,revision:revision+1}),{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'settings_unavailable'},{status:503})}
}

export async function POST(request: Request) {
 const blocked=await requireAccess(request);
 if (blocked) return blocked;
 const body=await request.json().catch(()=>null);
 const brand=body?.brand;
 if (brand !== 'homey' && brand !== 'sodfa') return NextResponse.json({error:'invalid'},{status:400});
 const operation:unknown=body.operation;
 const id=body.id;
 const code=typeof body.code==='string'?body.code.trim():'';
 const language=body.language==='en'?'en':'ar';
 if (operation!=='services' && operation!=='zones' && operation!=='subzones' && operation!=='coverage' && operation!=='tracking' && operation!=='shipments' && operation!=='fees' && operation!=='sync-orders') {
  return NextResponse.json({error:'invalid'},{status:400});
 }
 if ((operation==='zones'||operation==='subzones'||operation==='coverage') && (!Number.isSafeInteger(id)||id<1||id>2147483647)) {
  return NextResponse.json({error:'invalid'},{status:400});
 }
  if (operation==='tracking' && (!code||code.length>100)) return NextResponse.json({error:'invalid'},{status:400});
 const fee=body.fees;
 if(operation==='fees'&&(!fee||!Number.isSafeInteger(fee.serviceId)||fee.serviceId<1||fee.serviceId>2147483647||!Number.isSafeInteger(fee.zoneId)||fee.zoneId<1||fee.zoneId>2147483647||!Number.isSafeInteger(fee.subzoneId)||fee.subzoneId<1||fee.subzoneId>2147483647||typeof fee.weight!=='number'||!Number.isFinite(fee.weight)||fee.weight<=0||fee.weight>1000||typeof fee.price!=='number'||!Number.isFinite(fee.price)||fee.price<0||fee.price>999999999999.99)){
  return NextResponse.json({error:'invalid'},{status:400});
 }
 if(operation==='sync-orders'){
  if(brand!=='homey')return NextResponse.json({error:'unsupported_brand'},{status:400});
  try{return NextResponse.json({data:await syncTalaOrders()},{headers:{'Cache-Control':'no-store'}})}
  catch{return NextResponse.json({error:'sync_unavailable'},{status:502})}
 }
 const page:unknown=body.page;
 if(operation==='shipments'&&(typeof page!=='number'||!Number.isSafeInteger(page)||page<1||page>50)){
  return NextResponse.json({error:'invalid'},{status:400});
 }
 const days=body.days===7||body.days===90?body.days:30;
 const variables=operation==='shipments'?{page,input:{date:talaShipmentDateRange(new Date(),days)}}
  :operation==='services'?{}:operation==='tracking'?{code}:operation==='fees'?{input:{serviceId:fee.serviceId,recipientZoneId:fee.zoneId,recipientSubzoneId:fee.subzoneId,weight:fee.weight,price:fee.price,priceTypeCode:'EXCLD',paymentTypeCode:fee.price>0?'COLC':'PAID'}}:{id};
 type Data = {listShippingServicesDropdown?:TalaOption[];listZonesDropdown?:TalaOption[];shipment?:TalaTracking|null;
  listShipments?:{paginatorInfo:{hasMorePages:boolean};data:TalaShipmentSummary[]};
  calculateShipmentFees?:{amount:number;delivery:number;weight:number;collection:number;post:number|null;tax:number|null;return:number;total:number}};
 try {
  const {input,endpoint,revision}=await readTalaSettings(brand as Brand);
  if(!input)return NextResponse.json({error:'missing_credentials'},{status:409});
  if(!allowedTalaEndpoint(endpoint))return NextResponse.json({error:'endpoint_not_allowed'},{status:409});
  const cacheKey=brand+':'+revision;
  let token=await login(cacheKey,endpoint,input);
  let data: Data;
  try {
   if(operation==='coverage'){
    const groups=await fetchServiceCoverage(endpoint,token,Number(id),cacheKey);
    return NextResponse.json({data:{serviceId:Number(id),groups}},{headers:{'Cache-Control':'no-store'}});
   }
   data=await graphql<Data>(endpoint,queries[operation],variables,language,token);
  }
  catch (error) {
   if (!(error instanceof TalaError) || error.code!=='unauthenticated') throw error;
   invalidateTalaToken(cacheKey,token);
   token=await login(cacheKey,endpoint,input);
   if(operation==='coverage'){
    coverageCache.delete(cacheKey+':coverage:'+Number(id));
    const groups=await fetchServiceCoverage(endpoint,token,Number(id),cacheKey);
    return NextResponse.json({data:{serviceId:Number(id),groups}},{headers:{'Cache-Control':'no-store'}});
   }
   data=await graphql<Data>(endpoint,queries[operation],variables,language,token);
  }
  if(operation==='fees'){
   const fees=data.calculateShipmentFees;
   if(!fees||!Number.isFinite(fees.total)||fees.total<0)throw new TalaError('rejected');
   return NextResponse.json({data:fees},{headers:{'Cache-Control':'no-store'}});
  }
  if(operation==='shipments'){
   const result=data.listShipments;
   if(!result||typeof result.paginatorInfo?.hasMorePages!=='boolean'||!Array.isArray(result.data))throw new TalaError('rejected');
   return NextResponse.json({data:{shipments:result.data,hasMore:result.paginatorInfo.hasMorePages}},{headers:{'Cache-Control':'no-store'}});
  }
  return NextResponse.json({data:operation==='tracking'?data.shipment??null:data.listShippingServicesDropdown??data.listZonesDropdown??[]});
 } catch (error) {
  return NextResponse.json({error:error instanceof TalaError?error.code:'unreachable'},{status:502});
 }
}
