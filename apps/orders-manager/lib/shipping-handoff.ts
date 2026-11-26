import {closedWithoutDelivery, collectionFromCustomer} from './carrier-tracking';
import type {Order} from './types';

export function canPrepareShipment(order: Order) {
 return Boolean(order.shippingCompany && !order.deletedAt && !closedWithoutDelivery(order) && order.status !== 'delivered');
}

export function shipmentDetails(order: Order) {
 return {
  order_reference: order.id,
  recipient_name: order.customerName,
  phone: order.phone,
  alternate_phone: order.alternatePhone,
  governorate: order.governorate,
  city: order.city,
  address: order.address,
  cash_on_delivery_egp: collectionFromCustomer(order).toFixed(2),
 };
}

function csvCell(value: string) {
 // Protect spreadsheet users from formula evaluation in customer-entered fields.
 const safe = /^[\t\r\n]|^[\s\uFEFF]*[=+@-]/u.test(value) ? "'" + value : value;
 return '"' + safe.replaceAll('"', '""') + '"';
}

export function shipmentCsv(orders: Order[], includeContents: boolean) {
 const rows = orders.map(order => ({
  ...shipmentDetails(order),
  ...(includeContents ? {contents: order.items.map(item => `${item.name} × ${item.quantity}`).join(' | ')} : {}),
 }));
 if (!rows.length) return '';
 return '\uFEFF' + [Object.keys(rows[0]), ...rows.map(row => Object.values(row))]
  .map(row => row.map(csvCell).join(',')).join('\r\n');
}
