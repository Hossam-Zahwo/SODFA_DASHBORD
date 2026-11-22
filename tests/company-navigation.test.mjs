import assert from "node:assert/strict";
import test from "node:test";
import { companyLocation, companySections } from "../src/lib/company-navigation.ts";

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
