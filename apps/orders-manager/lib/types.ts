export type Brand = 'homey' | 'sodfa';
export type Status = 'new'|'contacted'|'confirmed'|'preparing'|'shipped'|'delivered'|'cancelled'|'returned'|'postponed'|'refused';
export type Item = {name:string; sku:string; quantity:number; price:number; imageUrl?:string; imageUrls?:string[]};
export type TalaRequestData={serviceId:number;recipientZoneId:number;recipientSubzoneId:number;weight:number;piecesCount:number;typeCode:'FDP';openableCode:'Y'|'N';refNumber:string;recipientName:string;recipientMobile:string;recipientPhone?:string;recipientAddress:string;price:number;priceTypeCode:'INCLD';paymentTypeCode:'COLC'|'PAID';description:string;notes?:string};
export type Order = {id:string; creationRequestId?:string; talaRequestData?:TalaRequestData|null; talaTrackingCode?:string|null; talaDispatchState?:'sending'|'sent'|'review'; talaStatusCode?:string|null;talaStatusName?:string|null;talaDeliveredAmount?:number|null;talaDeliveryFees?:number|null;talaCustomerDue?:number|null;talaCollectedAmount?:number|null;talaPendingCollectionAmount?:number|null;talaCollectedFees?:number|null; enteredAt?:string; brand:Brand; createdAt:string; updatedAt:string; version:number; customerName:string; phone:string; alternatePhone:string; governorate:string; city:string; address:string; source:string; paymentMethod:string; prepaid:number; shipping:number; discount:number;manualTotal?:number|null; manualCollection?:number|null; items:Item[]; status:Status; shippingCompany?:string; courier?:string; carrierReceived?:number; notes:string; assignedTo:string; deletedAt:string;};
export type Customer = {id:string; brand:Brand; name:string; phone:string; alternatePhone:string; governorate:string; city:string; address:string; notes:string; createdAt:string; updatedAt:string; deletedAt:string};
export const statuses:Status[]=['new','contacted','confirmed','preparing','shipped','delivered','cancelled','returned','postponed','refused'];
export const statusLabels:Record<Status,string>={new:'جديد',contacted:'تم التواصل',confirmed:'مؤكد',preparing:'قيد التجهيز',shipped:'تم التسليم لشركة الشحن',delivered:'تم التسليم للعميل',cancelled:'تم الإلغاء',returned:'مرتجع من شركة الشحن',postponed:'مؤجل',refused:'رفض الاستلام'};
export const govs=['القاهرة','الجيزة','الإسكندرية','القليوبية','البحيرة','مطروح','الدقهلية','الغربية','المنوفية','كفر الشيخ','دمياط','بورسعيد','الإسماعيلية','السويس','الشرقية','الفيوم','بني سويف','المنيا','أسيوط','سوهاج','قنا','الأقصر','أسوان','البحر الأحمر','الوادي الجديد','شمال سيناء','جنوب سيناء'];
export const calculatedTotal=(o:Order)=>o.items.reduce((s,i)=>s+i.price*i.quantity,0)+o.shipping-o.discount;
export const totalOf=(o:Order)=>o.manualTotal??(o.manualCollection!=null?o.manualCollection+o.prepaid:calculatedTotal(o));

export type Waybill={
 id:string;brand:Brand;customerId:string|null;orderId:string|null;createdAt:string;updatedAt:string;
 customerName:string;phone:string;alternatePhone:string;governorate:string;city:string;address:string;
 invoiceAmount:number;shippingCost:number;prepaid:number;collectionAmount:number;
 paymentMethod:string;description:string;notes:string;reference:string;
};
export type WaybillDraft=Omit<Waybill,'id'|'createdAt'|'updatedAt'|'collectionAmount'|'reference'>;
