import type { Order } from "./types";

export function normalizeOrderSearch(value: string | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) - (digit >= "۰" ? 0x6f0 : 0x660)))
    .replace(/[\p{M}\p{Cf}ـ]/gu, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();
}

export function matchesOrderSearch(order: Order, query: string) {
  const search = normalizeOrderSearch(query).replace(/^#\s*/, "");
  if (!search) return true;

  const reference = order.id.replaceAll("-", "").toLowerCase();
  const phones = [order.phone, order.alternatePhone].map((phone) =>
    normalizeOrderSearch(phone).replace(/\D/g, ""),
  );
  const numeric = search.replace(/[\s()+.\p{Pd}]/gu, "");
  if (/^\d+$/.test(numeric) && phones.some((phone) => phone.includes(numeric))) return true;
  if (/^[0-9a-f-]+$/.test(search) && reference.includes(search.replaceAll("-", "")))
    return /[0-9a-f]/.test(search);

  const fields = [
    order.customerName,
    order.governorate,
    order.city,
    order.address,
    order.id,
    reference,
    order.talaTrackingCode ?? "",
    ...phones,
    ...order.items.flatMap(({ name, sku }) => [name, sku]),
  ]
    .map(normalizeOrderSearch)
    .join(" ");
  return search.split(/\s+/).every((word) => fields.includes(word));
}
