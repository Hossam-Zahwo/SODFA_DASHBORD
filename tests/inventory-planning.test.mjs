import assert from "node:assert/strict";
import test from "node:test";
import { inventoryVoiceCommand, planInventory } from "../src/lib/inventory-planning.ts";

test("interprets Egyptian Arabic commands and preserves plain product names", () => {
  assert.deepEqual(inventoryVoiceCommand(" ابحث عن تيشيرت أسود "), {
    action: "query",
    query: "تيشيرت أسود",
  });
  assert.deepEqual(inventoryVoiceCommand("وريني رصيد حذاء."), { action: "query", query: "حذاء" });
  assert.deepEqual(inventoryVoiceCommand("بنطلون جينز"), { action: "query", query: "بنطلون جينز" });
  assert.deepEqual(inventoryVoiceCommand("امسح البحث"), { action: "clear" });
  assert.deepEqual(inventoryVoiceCommand("افتح خطة المخزون"), { action: "plan" });
  assert.deepEqual(inventoryVoiceCommand("افتح أوردر جديد"), { action: "order" });
});

const scenario = {
  available: 15,
  incoming: 5,
  committed: 5,
  dailyDemand: 4.5,
  leadDays: 3,
  safetyStock: 4,
  reviewDays: 7,
};

test("reorders at or below the threshold and includes pending and committed units", () => {
  assert.deepEqual(planInventory(scenario), {
    position: 15,
    reorderPoint: 18,
    target: 49,
    quantity: 34,
  });
  assert.equal(planInventory({ ...scenario, available: 18 }).quantity, 31);
  assert.equal(planInventory({ ...scenario, available: 19 }).quantity, 0);
  assert.equal(planInventory({ ...scenario, available: 0, incoming: 0 }).quantity, 54);
});

test("rejects invalid quantities", () => {
  assert.throws(() => planInventory({ ...scenario, available: -1 }), RangeError);
  assert.throws(() => planInventory({ ...scenario, leadDays: NaN }), RangeError);
  assert.throws(() => planInventory({ ...scenario, committed: 1.2 }), RangeError);
});

test("extracts voice sale quantity and rejects missing or invalid values", async () => {
  const { parseSpokenSale } = await import("../src/lib/inventory-planning.ts");
  assert.deepEqual(parseSpokenSale("تم بيع منتج تيشيرت أسود عدد ٣ قطع"), {
    name: "تيشيرت أسود",
    quantity: 3,
  });
  assert.deepEqual(parseSpokenSale("بيع تيشيرت احمر تلاتة قطع"), {
    name: "تيشيرت احمر",
    quantity: 3,
  });
  assert.equal(parseSpokenSale("بيع تيشيرت"), null);
  assert.equal(parseSpokenSale("بيع تيشيرت عدد ٠ قطع"), null);
});

test("extracts labelled order details and multiple lines", async () => {
  const { parseSpokenOrder } = await import("../src/lib/inventory-planning.ts");
  const draft = parseSpokenOrder(
    "اسم العميل اسم تجريبي، العنوان شارع الاختبار، رقم الهاتف ٠١٢٣٤٥٦٧٨٩٠، المنتجات تيشيرت عدد ٢ سعر ١٠٠، ومنتج بنطلون عدد ١ سعر ٢٠٠، تكلفة الشحن ٣٠، شركة الشحن تالا، الإجمالي ٤٣٠",
  );
  assert.deepEqual(draft, {
    invalidAmounts: false,
    name: "اسم تجريبي",
    address: "شارع الاختبار",
    phone: "٠١٢٣٤٥٦٧٨٩٠",
    shipping: 30,
    carrier: "تالا",
    total: 430,
    items: [
      { name: "تيشيرت", quantity: 2, price: 100 },
      { name: "بنطلون", quantity: 1, price: 200 },
    ],
    hasItemText: true,
  });
});

test("calculates the same order total for voice review and staging save", async () => {
  const { calculateOrderTotal } = await import("../src/lib/inventory-planning.ts");
  assert.equal(
    calculateOrderTotal(
      [
        { quantity: 3, price: 19.99 },
        { quantity: 2, price: 5.05 },
      ],
      12.25,
      1.32,
    ),
    81,
  );
});
