import type { Order } from "./types";

const orderFields: Record<string, string> = {
  talaTrackingCode: "tala_tracking_code",
  talaRequestData: "tala_request_data",
  talaDispatchState: "tala_dispatch_state",
  talaStatusCode: "tala_status_code",
  talaStatusName: "tala_status_name",
  talaDeliveredAmount: "tala_delivered_amount",
  talaDeliveryFees: "tala_delivery_fees",
  talaCustomerDue: "tala_customer_due",
  talaCollectedAmount: "tala_collected_amount",
  talaPendingCollectionAmount: "tala_pending_collection_amount",
  talaCollectedFees: "tala_collected_fees",
  manualCollection: "manual_collection",
  manualTotal: "manual_total",
  carrierReceived: "carrier_received",
  shippingCompany: "shipping_company",
  enteredAt: "entered_at",
  createdAt: "created_at",
  updatedAt: "updated_at",
  customerName: "customer_name",
  alternatePhone: "alternate_phone",
  paymentMethod: "payment_method",
  assignedTo: "assigned_to",
  deletedAt: "deleted_at",
};
export function fromDb<T>(row: Record<string, unknown>, fields: Record<string, string>): T {
  const reverse = Object.fromEntries(Object.entries(fields).map(([a, b]) => [b, a]));
  const obj = Object.fromEntries(Object.entries(row).map(([k, v]) => [reverse[k] || k, v]));
  for (const k of ["prepaid", "shipping", "discount", "carrierReceived", "version"])
    if (k in obj) obj[k] = Number(obj[k] ?? 0);
  // Tala amounts are nullable. Zero is a meaningful provider value and must never
  // be substituted for SQL NULL, otherwise missing financial data looks settled.
  for (const k of [
    "talaDeliveredAmount",
    "talaDeliveryFees",
    "talaCustomerDue",
    "talaCollectedAmount",
    "talaPendingCollectionAmount",
    "talaCollectedFees",
  ])
    if (k in obj) obj[k] = obj[k] === null || obj[k] === undefined ? null : Number(obj[k]);
  for (const k of ["manualTotal", "manualCollection"]) if (obj[k] != null) obj[k] = Number(obj[k]);
  for (const k of ["enteredAt", "createdAt", "updatedAt", "deletedAt"])
    if (obj[k] instanceof Date) obj[k] = (obj[k] as Date).toISOString();
  if ("deletedAt" in obj && obj["deletedAt"] == null) obj["deletedAt"] = "";
  return obj as T;
}
export const mapOrderRow = (row: Record<string, unknown>) => fromDb<Order>(row, orderFields);
