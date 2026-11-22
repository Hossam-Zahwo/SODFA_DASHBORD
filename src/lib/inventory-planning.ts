export function inventoryVoiceCommand(transcript: string) {
  const phrase = transcript
    .trim()
    .replace(/[.!؟،]+$/u, "")
    .trim();
  if (/^(?:امسح|إمسح|فضي|فضّي) البحث$/u.test(phrase)) return { action: "clear" as const };
  if (/^(?:افتح|إفتح|احسب|إحسب) (?:خطة المخزون|إعادة الطلب|اعادة الطلب)$/u.test(phrase)) {
    return { action: "plan" as const };
  }
  if (/^(?:افتح|إفتح) (?:نموذج )?(?:طلب|أوردر|اوردر)(?: جديد)?$/u.test(phrase)) {
    return { action: "order" as const };
  }
  const query = phrase
    .replace(
      /^(?:(?:ابحث|إبحث|دور|دوّر)\s+(?:عن|على)\s+|(?:وريني|ورّيني|اعرض|إعرض)\s+(?:مخزون|رصيد)\s+)/u,
      "",
    )
    .trim()
    .slice(0, 100);
  return { action: "query" as const, query };
}

export function planInventory(input: {
  available: number;
  incoming: number;
  committed: number;
  dailyDemand: number;
  leadDays: number;
  safetyStock: number;
  reviewDays: number;
}) {
  if (Object.values(input).some((value) => !Number.isFinite(value) || value < 0)) {
    throw new RangeError("Invalid inventory planning input");
  }
  const { available, incoming, committed, dailyDemand, leadDays, safetyStock, reviewDays } = input;
  const position = available + incoming - committed;
  const reorderPoint = Math.ceil(dailyDemand * leadDays + safetyStock);
  const target = Math.ceil(dailyDemand * (leadDays + reviewDays) + safetyStock);
  const quantity = position <= reorderPoint ? Math.max(0, Math.ceil(target - position)) : 0;
  if (![position, reorderPoint, target, quantity].every(Number.isSafeInteger)) {
    throw new RangeError("Invalid inventory planning result");
  }
  return { position, reorderPoint, target, quantity };
}

export function spokenNumber(text: string) {
  const digits = text
    .trim()
    .replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) - (digit >= "۰" ? 0x6f0 : 0x660)))
    .replace("٫", ".");
  const words: Record<string, number> = {
    واحد: 1,
    واحدة: 1,
    اتنين: 2,
    اثنين: 2,
    ثلاثة: 3,
    تلاتة: 3,
    أربعة: 4,
    اربعة: 4,
    خمسة: 5,
    ستة: 6,
    سبعة: 7,
    ثمانية: 8,
    تمانية: 8,
    تسعة: 9,
    عشرة: 10,
  };
  return /^\d+(?:\.\d{1,2})?$/.test(digits) ? Number(digits) : words[digits];
}

export function parseSpokenSale(text: string) {
  const match =
    /^(?:تم\s+)?بيع\s+(?:منتج\s+)?(.+?)\s+(?:عدد\s+)?([^\s]+)\s*(?:قطع|قطعة|وحدات|وحدة)?[.!؟،]?$/u.exec(
      text.trim(),
    );
  const name = match?.[1]?.trim();
  const quantity = spokenNumber(match?.[2] ?? "");
  if (
    !name ||
    quantity === undefined ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 999
  )
    return null;
  return { name, quantity };
}

export function parseSpokenOrder(text: string) {
  const fields = Array.from(
    text.matchAll(
      /(?:^|\s|[،,])(?:اسم العميل|باسم العميل|باسم عميل|العنوان|رقم الهاتف|رقم تليفونه|رقم تليفون|المنتجات|المنتج|تكلفة الشحن|شركة الشحن|الإجمالي)(?=\s|:)/gu,
    ),
  );
  const values = new Map(
    fields.map((field, index) => [
      field[0].trim().replace(/^[،,]/u, "").trim(),
      text
        .slice(field.index + field[0].length, fields[index + 1]?.index)
        .replace(/^[:\s]+|[،,.\s]+$/gu, ""),
    ]),
  );
  const items = (values.get("المنتجات") ?? values.get("المنتج") ?? "")
    .split(/\s+(?:ومنتج|و المنتج|و منتج)\s+|[،,]/u)
    .filter((item) => item.trim())
    .map((item) => {
      const line = /^(.+?)\s+عدد\s+(\S+)(?:\s+(?:قطع|قطعة))?\s+سعر\s+(\S+)$/u.exec(
        item.trim().replace(/^و\s*منتج\s+/u, ""),
      );
      const name = line?.[1];
      const quantity = spokenNumber(line?.[2] ?? "");
      const price = spokenNumber(line?.[3] ?? "");
      return name &&
        quantity !== undefined &&
        Number.isInteger(quantity) &&
        quantity >= 1 &&
        quantity <= 999 &&
        price !== undefined
        ? { name, quantity, price }
        : null;
    });
  const shipping = spokenNumber(values.get("تكلفة الشحن") ?? "");
  const total = spokenNumber(values.get("الإجمالي") ?? "");
  return {
    invalidAmounts:
      (values.has("تكلفة الشحن") && shipping === undefined) ||
      (values.has("الإجمالي") && total === undefined),
    name: values.get("اسم العميل") ?? values.get("باسم العميل") ?? values.get("باسم عميل"),
    address: values.get("العنوان"),
    phone: values.get("رقم الهاتف") ?? values.get("رقم تليفونه") ?? values.get("رقم تليفون"),
    shipping,
    carrier: values.get("شركة الشحن"),
    total,
    items: items.every((item) => item !== null) ? items.filter((item) => item !== null) : [],
    hasItemText: values.has("المنتجات") || values.has("المنتج"),
  };
}

export function calculateOrderTotal(
  items: ReadonlyArray<{ quantity: number; price: number }>,
  shipping: number,
  discount: number,
) {
  const cents = (value: number) => Math.round(value * 100);
  return (
    (items.reduce((sum, item) => sum + item.quantity * cents(item.price), 0) +
      cents(shipping) -
      cents(discount)) /
    100
  );
}
