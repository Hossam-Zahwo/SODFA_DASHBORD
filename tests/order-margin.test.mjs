import assert from "node:assert/strict";
import test from "node:test";
import { calculateOrderMargin } from "../src/lib/order-margin.ts";

test("uses collected revenue and all direct costs on an order", () => {
  assert.deepEqual(calculateOrderMargin(270, 30, 150, 40, 5), {
    contribution: 105,
    rate: 35,
  });
  assert.deepEqual(calculateOrderMargin(0, 0, 0, 25.25, 0), {
    contribution: -25.25,
    rate: null,
  });
  assert.throws(() => calculateOrderMargin(100, 0, -5, 0, 0), RangeError);
});
