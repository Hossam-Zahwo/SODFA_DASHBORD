import assert from "node:assert/strict";
import test from "node:test";
import {
  companyLocation,
  companySections,
  homeyAdminUrl,
  orderWaybillUrl,
} from "../src/lib/company-navigation.ts";

test("deep links preserve project and supported section", () => {
  assert.deepEqual(companyLocation({ project: "homey", section: "orders" }), {
    project: "homey",
    section: "orders",
  });
  assert.deepEqual(companyLocation({ project: "sodfa_web", section: "shipping" }), {
    project: "sodfa_web",
  });
  assert.deepEqual(companyLocation({ project: ["homey"], section: "unknown" }), {});
});

test("project shortcuts only offer the relevant sections", () => {
  assert.ok(companySections("orders").includes("shipping"));
  assert.ok(!companySections("orders").includes("products"));
  assert.ok(!companySections("sodfa", true).includes("finance"));
});

test("uses the original admin and only valid waybill identifiers", () => {
  assert.equal(homeyAdminUrl("products"), "https://www.homeyegypt.com/admin/products");
  assert.equal(homeyAdminUrl("shipping"), null);
  assert.equal(orderWaybillUrl(null), null);
  const id = "2580eedc-5400-4bc0-b961-805dae414179";
  assert.equal(orderWaybillUrl(id), "https://homey-sodfa-orders-manager.vercel.app/waybills/" + id);
});
