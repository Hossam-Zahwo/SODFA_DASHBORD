import {totalOf,type Order,type Status} from './types';

import {talaExpress} from './tala-shipping';

export const shippingStates:Status[]=['shipped','delivered','postponed','cancelled','refused','returned'];
export const collectionLabels={
 unpaid:'لم نستلم من شركة الشحن',
 partial:'استلام جزئي من الشركة',
 paid:'تم الاستلام من الشركة',
} as const;
export type CollectionState=keyof typeof collectionLabels;
export const collectionStates:CollectionState[]=['unpaid','partial','paid'];



// Keep the three different financial concepts separate:
// item unit price, customer COD, and actual carrier settlement.
const roundMoney=(amount:number)=>Math.round(amount*100)/100;
export const collectionFromCustomer=(order:Order)=>{
 if(order.manualCollection!=null)return order.manualCollection;
 if(order.shippingCompany===talaExpress&&order.status==='delivered'&&order.talaDeliveredAmount!=null&&order.talaDeliveredAmount>0)
  return order.talaDeliveredAmount;
 return Math.max(0,roundMoney(totalOf(order)-order.prepaid));
};
export const productRevenue=(o:Order)=>roundMoney(totalOf(o)-o.shipping);
export const closedWithoutDelivery=(o:Order)=>['cancelled','refused','returned'].includes(o.status);

export function missingFinancialAmount(order:Order):boolean{
 if(order.status!=='delivered')return false;
 if(order.shippingCompany===talaExpress&&order.talaCustomerDue!=null)return false;
 return collectionFromCustomer(order)===0&&order.items.some(item=>item.name.trim().length>0);
}

export function carrierAmounts(order:Order){
 const received=order.carrierReceived??0;
 const isTala=order.shippingCompany===talaExpress;
 const providerDue=isTala&&order.status==='delivered'?order.talaCustomerDue:null;
 const providerFee=isTala?order.talaDeliveryFees:null;
 const shippingFee=isTala?(providerFee??order.shipping):0;
 const unknown=missingFinancialAmount(order);
 const due=closedWithoutDelivery(order)?0:providerDue!=null
  ?Math.max(0,roundMoney(providerDue))
  :Math.max(0,roundMoney(collectionFromCustomer(order)-shippingFee));
 return {due,received,remaining:Math.max(0,roundMoney(due-received)),unknown,
  source:providerDue!=null?'tala':isTala?'tala-fee-or-estimate':'order'};
}

export function financialWarnings(order:Order):string[]{
 const warnings:string[]=[];
 if(order.shippingCompany===talaExpress){
  if(order.talaDeliveryFees!=null&&Math.abs(order.shipping-order.talaDeliveryFees)>0.009)
   warnings.push('رسوم الشحن المخزنة تختلف عن رسوم تالا؛ الحساب يعتمد رسوم تالا الفعلية');
  if(order.status==='delivered'&&order.talaCustomerDue==null&&collectionFromCustomer(order)===0)
   warnings.push('الطلب مسلّم ولكن لا يوجد تحصيل كافٍ في بيانات الطلب أو تالا');
  if(order.status==='delivered'&&order.talaCustomerDue!=null&&order.manualCollection!=null
    &&order.talaDeliveredAmount!=null&&order.talaDeliveredAmount>0
    &&Math.abs(order.manualCollection-order.talaDeliveredAmount)>0.009)
   warnings.push('قيمة التحصيل المسجلة تختلف عن المبلغ الذي سجلته تالا للتسليم');
 }else if(missingFinancialAmount(order)){
  warnings.push('الطلب مسلّم ولا يوجد مبلغ تحصيل موثوق؛ يلزم مطابقة بيانات المصدر');
 }
 return warnings;
}

export function collectionState(order:Order):CollectionState{
 const {received,remaining}=carrierAmounts(order);
 if(received>0)return remaining>0?'partial':'paid';
 return 'unpaid';
}
