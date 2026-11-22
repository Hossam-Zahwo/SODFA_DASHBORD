import { test } from "node:test";
import assert from "node:assert/strict";
import { selectedDraftChannels, requiresCrossBrandApproval, channelBrand } from "../src/lib/company-draft-selection.ts";

test("Homey channel belongs only to Homey", () => assert.equal(channelBrand("homey_web"), "homey"));
test("Sodfa channel belongs only to Sodfa", () => assert.equal(channelBrand("sodfa_web"), "sodfa"));
test("No channel selected means no listing draft", () => assert.deepEqual(selectedDraftChannels([]), []));
test("Only the requested channel gets a draft", () => assert.deepEqual(selectedDraftChannels(["homey_web"]), ["homey_web"]));
test("Deduplicate repeated selections", () => assert.deepEqual(selectedDraftChannels(["homey_web", "homey_web"]), ["homey_web"]));
test("Native Homey listing requires no cross-brand approval", () => assert.equal(requiresCrossBrandApproval("homey", ["homey_web"]), false));
test("Homey product targeting Sodfa requires cross-brand approval", () => assert.equal(requiresCrossBrandApproval("homey", ["sodfa_web"]), true));
test("Sodfa product targeting Homey requires cross-brand approval", () => assert.equal(requiresCrossBrandApproval("sodfa", ["homey_web"]), true));
test("Mixed targets need cross-brand approval", () => assert.equal(requiresCrossBrandApproval("homey", ["homey_web","sodfa_web"]), true));
