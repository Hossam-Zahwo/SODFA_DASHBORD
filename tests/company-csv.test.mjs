import assert from "node:assert/strict";
import test from "node:test";
import { companyCsv } from "../src/lib/company-csv.ts";

test("keeps Arabic, commas, quotes and newlines inside their exported fields", () => {
  assert.equal(
    companyCsv([
      ["اسم", 'تيشيرت "قمر", أسود'],
      ["رقم", "سطر\nثاني"],
    ]),
    '\ufeff"اسم","تيشيرت ""قمر"", أسود"\r\n"رقم","سطر\nثاني"',
  );
});

test("preserves leading plus and minus as text in spreadsheet imports", () => {
  assert.equal(companyCsv([["+20", "-42", "42"]]), '\ufeff"\'+20","\'-42","42"');
});
