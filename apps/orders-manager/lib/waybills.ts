import {neon} from '@neondatabase/serverless';
import type {Waybill,WaybillDraft} from './types';

const sql=()=>{if(!process.env.DATABASE_URL)throw Error('Database not configured');return neon(process.env.DATABASE_URL)};
function convert(row:Record<string,unknown>):Waybill{
 const names:Record<string,string>={customer_id:'customerId',order_id:'orderId',created_at:'createdAt',updated_at:'updatedAt',customer_name:'customerName',alternate_phone:'alternatePhone',invoice_amount:'invoiceAmount',shipping_cost:'shippingCost',collection_amount:'collectionAmount',payment_method:'paymentMethod'};
 const o=Object.fromEntries(Object.entries(row).map(([k,v])=>[names[k]||k,v]));
 for(const field of ['invoiceAmount','shippingCost','prepaid','collectionAmount'])o[field]=Number(o[field]||0);
 for(const field of ['createdAt','updatedAt'])if(o[field] instanceof Date)o[field]=(o[field] as Date).toISOString();
 return o as Waybill;
}
export async function getWaybills(){
 const rows=await sql()`SELECT * FROM public.waybills ORDER BY created_at DESC LIMIT 3000`;
 return rows.map(convert);
}
export async function getWaybill(id:string):Promise<Waybill|null>{
 const rows=await sql()`SELECT * FROM public.waybills WHERE id=${id}::uuid LIMIT 1`;
 return rows.length?convert(rows[0]):null;
}
export async function createWaybill(w:WaybillDraft):Promise<Waybill>{
 const rows=await sql()`INSERT INTO public.waybills
 (brand,customer_id,order_id,customer_name,phone,alternate_phone,governorate,city,address,invoice_amount,shipping_cost,prepaid,payment_method,description,notes)
 VALUES (${w.brand},${w.customerId||null}::uuid,${w.orderId||null}::uuid,${w.customerName.trim()},${w.phone.trim()},${w.alternatePhone||''},${w.governorate||''},${w.city||''},${w.address.trim()},${w.invoiceAmount},${w.shippingCost},${w.prepaid},${w.paymentMethod||'الدفع عند الاستلام'},${w.description||''},${w.notes||''}) RETURNING *`;
 return convert(rows[0]);
}
