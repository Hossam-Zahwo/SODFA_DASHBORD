import type {Brand} from './types';

export const talaEndpoint = 'https://portal.talaxp.com:8443/graphql';
export const talaDocumentation = 'https://accuratess.github.io/lg-api/';
export const talaSupport = 'mahmoud@accuratess.com';

export type TalaOperation = 'services' | 'zones' | 'subzones' | 'tracking';
export type TalaOption = {id: number; name: string};
export type TalaTracking = {code: string; refNumber: string | null; status: {code: string; name: string} | null};

export function talaCredentialNames(brand: Brand) {
 const prefix = brand === 'homey' ? 'TALA_HOMEY' : 'TALA_SODFA';
 return {username: prefix + '_USERNAME', password: prefix + '_PASSWORD'};
}

export const talaStatusGroups = [
 ['PKR', 'انتظار الشحن', 'Waiting for pickup'],
 ['RITS', 'في المخزن', 'In warehouse'],
 ['DTR', 'تم التسليم', 'Delivered'],
 ['OTD', 'قيد التوصيل', 'Out for delivery'],
 ['HTR', 'إعادة التوصيل', 'Redelivery'],
 ['DEX', 'تعذر التسليم', 'Delivery failed'],
] as const;

export type TalaShipmentSummary = TalaTracking & {
 date?:string;
 recipientZone?:{name:string}|null;
 recipientSubzone?:{name:string}|null;
 service?:{name:string}|null;
 price?:number;
 deliveryFees?:number;
 deliveredAmount?:number;
};
export type TalaShipmentPage = {shipments:TalaShipmentSummary[];hasMore:boolean};

const cairoDate = new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'});

export function talaShipmentDateRange(now:Date,days=30){
 const today=cairoDate.format(now);
 const first=new Date(today+'T00:00:00Z');
 first.setUTCDate(first.getUTCDate()-days+1);
 return {fromDate:first.toISOString().slice(0,10),toDate:today};
}
