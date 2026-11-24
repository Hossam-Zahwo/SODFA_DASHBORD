import assert from "node:assert/strict";
import test from "node:test";
import { orderStatusLabel, scopedCount } from "../src/lib/company-dashboard.ts";

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
