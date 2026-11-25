import {neon} from '@neondatabase/serverless';
import type {Order,Customer} from './types';
import {fromDb,mapOrderRow} from './order-row';

function sql(){
 const url=process.env.ORDERS_MANAGER_DATABASE_URL;
 if(!url)throw new Error('Neon database is not configured');
 return neon(url);
}
const customerFields:Record<string,string>={alternatePhone:'alternate_phone',createdAt:'created_at',updatedAt:'updated_at',deletedAt:'deleted_at'};
const customer=(row:Record<string,unknown>)=>fromDb<Customer>(row,customerFields);
const orderDate=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)?v+'T12:00:00+02:00':new Date(v).toISOString();

export async function getOrders():Promise<Order[]>{
 const rows=await sql()`SELECT o.*, COALESCE(a.entered_at, CASE WHEN o.version = 1 THEN o.updated_at END, o.created_at) AS entered_at
  FROM public.orders o
  LEFT JOIN (
   SELECT entity_id, min(created_at) AS entered_at
   FROM public.audit_log WHERE entity = 'order' AND action = 'create'
   GROUP BY entity_id
  ) a ON a.entity_id = o.id::text
  WHERE o.deleted_at IS NULL
  ORDER BY entered_at DESC, o.id DESC`;
 if(!rows.length)return [];
 const shipments=await sql()`SELECT order_id,state,tracking_code,to_jsonb(s) AS provider_data FROM public.tala_order_shipments s`.catch(error=>{
  if(error?.code==='42P01')return [];
  throw error;
 });
 const byOrder=new Map(shipments.map(row=>[row.order_id,row]));
 return rows.map(row=>{
  const shipment=byOrder.get(row.id);
  const provider=shipment?.provider_data&&typeof shipment.provider_data==='object'?shipment.provider_data as Record<string,unknown>:{};
  return mapOrderRow({...row,
   tala_tracking_code:shipment?.tracking_code,tala_dispatch_state:shipment?.state,tala_request_data:provider.request_data??null,
   tala_status_code:provider.provider_status_code,tala_status_name:provider.provider_status_name,
   tala_delivered_amount:provider.provider_delivered_amount,tala_delivery_fees:provider.provider_delivery_fees,
   tala_customer_due:provider.provider_customer_due,tala_collected_amount:provider.provider_collected_amount,
   tala_pending_collection_amount:provider.provider_pending_collection_amount,tala_collected_fees:provider.provider_collected_fees,
  });
 });
}
export async function getOrderLocations():Promise<Record<string,string[]>>{
 const rows=await sql()`SELECT g.name AS governorate, l.name AS city
  FROM public.address_governorates g
  LEFT JOIN public.address_localities l ON l.governorate=g.name`;
 const locations:Record<string,string[]>=Object.create(null);
 for(const row of rows){
  const cities=locations[String(row.governorate)]??=[];
  if(row.city!==null)cities.push(String(row.city));
 }
 for(const cities of Object.values(locations))cities.sort((a,b)=>a.localeCompare(b,'ar'));
 return locations;
}

export async function saveOrder(input:Order,creationRequestId?:string):Promise<Order>{
 const db=sql(),date=orderDate(input.createdAt);
 const governorate=input.governorate||'',city=input.city||'';
 if(governorate||city){
  const locations=await db`SELECT 1 FROM public.address_localities WHERE governorate=${governorate} AND name=${city}
   UNION ALL
   SELECT 1 FROM public.orders WHERE id=${input.id||null}::uuid
    AND governorate=${governorate} AND city=${city} AND deleted_at IS NULL`;
  if(!locations.length)throw new Error('INVALID_ORDER_LOCATION');
 }
 if(input.id){
  const rows=await db`UPDATE public.orders SET
   brand=${input.brand},created_at=${date}::timestamptz,updated_at=now(),
   customer_name=${input.customerName.trim()},phone=${input.phone},alternate_phone=${input.alternatePhone||''},
   governorate=${input.governorate||''},city=${input.city||''},address=${input.address||''},
   source=${input.source||''},payment_method=${input.paymentMethod||''},
   prepaid=${input.prepaid},
   shipping=CASE WHEN ${input.shippingCompany=== 'تالا إكسبريس'} THEN COALESCE(
    (SELECT provider_delivery_fees FROM public.tala_order_shipments WHERE order_id=${input.id}::uuid),
    ${input.shipping}::numeric) ELSE ${input.shipping}::numeric END,
   discount=${input.discount},
   manual_collection=CASE WHEN ${input.manualCollection!==undefined} THEN ${input.manualCollection??null}::numeric ELSE manual_collection END,
   manual_total=CASE WHEN ${input.manualTotal!==undefined} THEN ${input.manualTotal??null}::numeric ELSE manual_total END,
   items=${JSON.stringify(input.items)}::jsonb,status=${input.status},
   shipping_company=COALESCE(${input.shippingCompany??null},shipping_company),carrier_received=COALESCE(${input.carrierReceived??null},carrier_received),
   notes=${input.notes||''},assigned_to=${input.assignedTo||''},courier=COALESCE(${input.courier??null},courier),version=version+1
   WHERE id=${input.id}::uuid AND version=${input.version} AND deleted_at IS NULL RETURNING *`;
  if(!rows.length)throw new Error('CONFLICT');
  return mapOrderRow(rows[0]);
 }
 const rows=await db`INSERT INTO public.orders
  (id,brand,created_at,customer_name,phone,alternate_phone,governorate,city,address,source,payment_method,
   prepaid,shipping,discount,items,status,shipping_company,carrier_received,notes,assigned_to,courier,manual_total,manual_collection)
  VALUES (COALESCE(${creationRequestId??null}::uuid,gen_random_uuid()),${input.brand},${date}::timestamptz,${input.customerName.trim()},${input.phone},${input.alternatePhone||''},
  ${input.governorate||''},${input.city||''},${input.address||''},${input.source||''},${input.paymentMethod||''},
  ${input.prepaid},${input.shipping},${input.discount},${JSON.stringify(input.items)}::jsonb,${input.status},${input.shippingCompany??''},${input.carrierReceived??0},
  ${input.notes||''},${input.assignedTo||''},${input.courier??''},${input.manualTotal??null},${input.manualCollection??null}) ON CONFLICT(id) DO NOTHING RETURNING *`;
 if(rows.length)return mapOrderRow(rows[0]);
 const [existing]=await db`SELECT * FROM public.orders WHERE id=${creationRequestId??null}::uuid AND brand=${input.brand} AND deleted_at IS NULL`;
 if(!existing)throw new Error('CONFLICT');
 return mapOrderRow(existing);
}
export async function removeOrder(id:string,version:number):Promise<Order>{
 const rows=await sql()`UPDATE public.orders SET deleted_at=now(),updated_at=now(),version=version+1
  WHERE id=${id}::uuid AND version=${version} AND deleted_at IS NULL RETURNING *`;
 if(!rows.length)throw new Error('CONFLICT');
 return mapOrderRow(rows[0]);
}
export async function getCustomers():Promise<Customer[]>{
 const rows=await sql()`SELECT * FROM public.customers WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5000`;
 return rows.map(customer);
}
export async function saveCustomer(input:Customer):Promise<Customer>{
 const db=sql();
 if(input.id){
  const rows=await db`UPDATE public.customers SET brand=${input.brand},name=${input.name.trim()},
   phone=${input.phone},alternate_phone=${input.alternatePhone||''},governorate=${input.governorate||''},
   city=${input.city||''},address=${input.address||''},notes=${input.notes||''},updated_at=now()
   WHERE id=${input.id}::uuid AND deleted_at IS NULL RETURNING *`;
  if(!rows.length)throw new Error('NOT_FOUND');
  return customer(rows[0]);
 }
 const rows=await db`INSERT INTO public.customers(brand,name,phone,alternate_phone,governorate,city,address,notes)
 VALUES (${input.brand},${input.name.trim()},${input.phone},${input.alternatePhone||''},${input.governorate||''},
 ${input.city||''},${input.address||''},${input.notes||''}) RETURNING *`;
 return customer(rows[0]);
}
export async function removeCustomer(id:string){
 const rows=await sql()`UPDATE public.customers SET deleted_at=now(),updated_at=now()
 WHERE id=${id}::uuid AND deleted_at IS NULL RETURNING id`;
 if(!rows.length)throw new Error('NOT_FOUND');
}
export async function audit(action:string,entity:string,entityId:string,brand:string,details:string,actor='authorized-user'){
 await sql()`INSERT INTO public.audit_log(actor,action,entity,entity_id,brand,details)
 VALUES (${actor},${action},${entity},${entityId},${brand},${details})`;
}

export async function getPrintHistory(){
 const rows=await sql()`SELECT DISTINCT entity_id FROM public.audit_log WHERE action='print' AND entity='print_document'`;
 return rows.map(row=>String(row.entity_id));
}

export async function recordPrintHistory(keys:string[]){
 await sql()`INSERT INTO public.audit_log(actor,action,entity,entity_id,brand,details)
  SELECT 'authorized-user','print','print_document',key,'', ''
  FROM unnest(${keys}::text[]) AS documents(key)
  WHERE NOT EXISTS (
   SELECT 1 FROM public.audit_log
   WHERE action='print' AND entity='print_document' AND entity_id=key
  )`;
}

export async function getShippingCompanies():Promise<string[]>{
 const rows=await sql()`SELECT name FROM public.shipping_companies ORDER BY name`;
 return rows.map(row=>String(row.name));
}

export async function addShippingCompany(name:string):Promise<string>{
 const rows=await sql()`INSERT INTO public.shipping_companies(name) VALUES (${name})
 ON CONFLICT ((lower(name))) DO UPDATE SET name=shipping_companies.name RETURNING name`;
 return String(rows[0].name);
}

export async function addOrderLocality(governorate:string,city:string):Promise<boolean>{
 const rows=await sql()`INSERT INTO public.address_localities(governorate,name)
  SELECT name,${city} FROM public.address_governorates WHERE name=${governorate}
  ON CONFLICT (governorate,name) DO UPDATE SET name=EXCLUDED.name RETURNING name`;
 return rows.length>0;
}
