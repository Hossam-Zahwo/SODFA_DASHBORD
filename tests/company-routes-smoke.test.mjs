import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const port = 4186;
const base = `http://127.0.0.1:${port}`;
const routes = [
  "/",
  "/login",
  "/inventory",
  "/sales",
  "/returns",
  "/damaged-returns",
  "/warehouses",
  "/categories",
  "/invoices",
  "/transactions",
  "/scanner",
  "/settings",
  "/control-center",
  "/control-center?project=homey&section=orders",
  "/control-center?project=homey&section=orders&queue=confirm",
  "/control-center?project=homey&section=store-admin",
  "/control-center?project=orders&section=shipping",
  "/control-center?project=orders&section=customers",
  "/control-center?project=sodfa_web&section=products",
  "/control-center-products?project=homey",
  "/control-center-products?project=sodfa",
  "/control-center-orders?project=sodfa&brand=sodfa",
  "/control-center-security",
  "/control-center-social",
  "/sales?product=TEST-SKU",
];

test("CRM SSR routes return HTML without 500 errors", { timeout: 40000 }, async (t) => {
  const server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "dev",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    {
      cwd: process.cwd(),
      env: { ...process.env, CI: "1" },
      stdio: "ignore",
    },
  );
  t.after(() => {
    if (server.exitCode === null) server.kill("SIGTERM");
  });
  let started = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (server.exitCode !== null) throw new Error(`Development server exited: ${server.exitCode}`);
    try {
      const response = await fetch(base + "/", { signal: AbortSignal.timeout(1200) });
      if (response.status === 200) {
        started = true;
        break;
      }
    } catch {
      /* server starting */
    }
    await delay(300);
  }
  assert.equal(started, true, "development server must become ready");
  for (const path of routes) {
    const response = await fetch(base + path, { signal: AbortSignal.timeout(10000) });
    const html = await response.text();
    assert.equal(response.status, 200, `Unexpected status at ${path}`);
    assert.ok(
      (response.headers.get("content-type") ?? "").includes("text/html"),
      `HTML at ${path}`,
    );
    assert.ok(html.length > 400, `Nonempty SSR at ${path}`);
    assert.doesNotMatch(
      html,
      /This page didn't load|Unhandled Server Error/,
      `No SSR error at ${path}`,
    );
  }
});
