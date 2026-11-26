import assert from "node:assert/strict";
import test from "node:test";
import {
  canReadOrderDetails,
  hasCatalogDraft,
  needsOrderConfirmation,
  orderStatusLabel,
  scopedCount,
} from "../src/lib/company-dashboard.ts";

test("separates unavailable data from a verified zero", () => {
  assert.equal(scopedCount([], "sodfa", false), null);
  assert.equal(scopedCount([], "sodfa", true), 0);
});

test("keeps totals scoped to brand and matches current shipping statuses", () => {
  const rows = [
    { brand: "homey", status: "delivered", count: 5 },
    { brand: "sodfa", status: "shipped", count: 2 },
    { brand: "sodfa", status: "returned", count: 3 },
  ];
  assert.equal(scopedCount(rows, "sodfa", true), 5);
  assert.equal(scopedCount(rows, "all", true), 10);
  assert.equal(
    scopedCount(
      rows,
      "sodfa",
      true,
      (row) => row.status === "shipped" || row.status === "delivered",
    ),
    2,
  );
  assert.equal(orderStatusLabel("shipped"), "مع شركة الشحن");
  assert.equal(orderStatusLabel("legacy"), "legacy");
});

test("only operational roles can read order details", () => {
  assert.equal(canReadOrderDetails("viewer"), false);
  assert.equal(canReadOrderDetails(undefined), false);
  assert.equal(canReadOrderDetails("operator"), true);
  assert.equal(canReadOrderDetails("manager"), true);
  assert.equal(canReadOrderDetails("admin"), true);
});

test("today's work includes pending orders and saved hide or zero-price drafts", () => {
  assert.equal(needsOrderConfirmation("new"), true);
  assert.equal(needsOrderConfirmation("contacted"), true);
  assert.equal(needsOrderConfirmation("confirmed"), false);
  assert.equal(hasCatalogDraft({ draft_visibility: false, draft_price: null }), true);
  assert.equal(hasCatalogDraft({ draft_visibility: null, draft_price: 0 }), true);
  assert.equal(hasCatalogDraft({ draft_visibility: null, draft_price: null }), false);
});
