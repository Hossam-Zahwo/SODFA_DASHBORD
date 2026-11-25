import {neon} from '@neondatabase/serverless';
import {graphql,login} from './tala-api';
import {allowedTalaEndpoint,readTalaSettings} from './tala-settings-store';
import {talaExpress} from './tala-shipping';

type RemoteShipment={
 code:string;refNumber:string|null;
 status:{code:string;name:string}|null;
 deliveredAmount:number|null;deliveryFees:number|null;customerDue:number|null;
 collectedAmount:number|null;pendingCollectionAmount:number|null;collectedFees:number|null;
};
type ShipmentPage={listShipments:{paginatorInfo:{hasMorePages:boolean};data:RemoteShipment[]}};
type TrackedOrder={id:string;tracking_code:string|null;status:string};

const query='query SyncShipments($input: ListShipmentsFilterInput, $page: Int) { listShipments(input: $input, first: 100, page: $page) { paginatorInfo { hasMorePages } data { code refNumber status { code name } deliveredAmount deliveryFees customerDue collectedAmount pendingCollectionAmount collectedFees } } }';

const normalizedStatus=(code:string,current:string):string=>{
 switch(code){
  case 'DTR': return 'delivered';
  case 'HTR': case 'DEX': return 'postponed';
  case 'RJCT': return 'cancelled';
  case 'RTS': case 'RCV': case 'OTR': case 'RTRN': return 'returned';
  case 'PKR': case 'PKM': case 'PKH': case 'PKD': case 'RITS': case 'PRP': case 'PRPD':
  case 'BMT': case 'BMR': case 'STD': case 'OTD': return 'shipped';
  default:return current;
 }
};
const money=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;

export async function syncTalaOrders(){
 const url=process.env.DATABASE_URL;
 if(!url)throw new Error('Neon database is not configured');
 const sql=neon(url);
 // Additive columns keep older installations readable; the migration is also checked in.
 await sql`ALTER TABLE public.tala_order_shipments ADD COLUMN IF NOT EXISTS provider_status_code text`;
 await sql`ALTER TABLE public.tala_order_shipments ADD COLUMN IF NOT EXISTS provider_status_name text`;
 await sql`ALTER TABLE public.tala_order_shipments ADD COLUMN IF NOT EXISTS provider_delivered_amount numeric(14,2)`;
 await sql`ALTER TABLE public.tala_order_shipments ADD COLUMN IF NOT EXISTS provider_delivery_fees numeric(14,2)`;
 await sql`ALTER TABLE public.tala_order_shipments ADD COLUMN IF NOT EXISTS provider_customer_due numeric(14,2)`;
 await sql`ALTER TABLE public.tala_order_shipments ADD COLUMN IF NOT EXISTS provider_collected_amount numeric(14,2)`;
 await sql`ALTER TABLE public.tala_order_shipments ADD COLUMN IF NOT EXISTS provider_pending_collection_amount numeric(14,2)`;
 await sql`ALTER TABLE public.tala_order_shipments ADD COLUMN IF NOT EXISTS provider_collected_fees numeric(14,2)`;

 const orders=await sql`SELECT o.id::text AS id,o.status,s.tracking_code
  FROM public.orders o JOIN public.tala_order_shipments s ON s.order_id=o.id
  WHERE o.brand='homey' AND o.shipping_company=${talaExpress} AND o.deleted_at IS NULL
   AND s.state='sent' AND s.tracking_code IS NOT NULL` as TrackedOrder[];
 if(!orders.length)return {updated:0,tracked:0};
 const {input,endpoint,revision}=await readTalaSettings('homey');
 if(!input||!allowedTalaEndpoint(endpoint))throw new Error('Tala unavailable');
 const token=await login('homey:'+revision,endpoint,input);
 const remote=new Map<string,RemoteShipment>();
 const codes=orders.map(order=>String(order.tracking_code));
 for(let offset=0;offset<codes.length;offset+=100){
  const batch=codes.slice(offset,offset+100);
  for(let page=1;page<=50;page++){
   const result=await graphql<ShipmentPage>(endpoint,query,{input:{code:batch},page},'ar',token);
   const response=result.listShipments;
   if(!response||!Array.isArray(response.data))throw new Error('Tala returned invalid shipment data');
   for(const shipment of response.data)if(shipment.code)remote.set(shipment.code,shipment);
   if(!response.paginatorInfo?.hasMorePages)break;
  }
 }
 let updated=0;
 for(const order of orders){
  const shipment=remote.get(String(order.tracking_code));
  if(!shipment?.status?.code)continue;
  const code=shipment.status.code;
  const status=normalizedStatus(code,order.status);
  await sql`UPDATE public.tala_order_shipments SET provider_status_code=${code},
   provider_status_name=${shipment.status.name||code},
   provider_delivered_amount=${money(shipment.deliveredAmount)},
   provider_delivery_fees=${money(shipment.deliveryFees)},
   provider_customer_due=${money(shipment.customerDue)},
   provider_collected_amount=${money(shipment.collectedAmount)},
   provider_pending_collection_amount=${money(shipment.pendingCollectionAmount)},
   provider_collected_fees=${money(shipment.collectedFees)},updated_at=now()
   WHERE order_id=${order.id}::uuid`;
  if(status!==order.status)await sql`UPDATE public.orders SET status=${status},updated_at=now(),version=version+1
   WHERE id=${order.id}::uuid AND deleted_at IS NULL`;
  updated++;
 }
 return {updated,tracked:orders.length};
}
