self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

function adminTarget(path) {
  const target = new URL("index.html", self.registration.scope);
  target.hash = typeof path === "string" && /^\/admin(?:[/?]|$)/.test(path) ? path : "/admin";
  return target.href;
}

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    const data = { title: "إشعار جديد من هومي", body: "افتح لوحة الإدارة لعرض التفاصيل", id: "homy" };
    try { Object.assign(data, event.data.json()); } catch { /* default payload */ }
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const visible = windows.filter((win) => win.url.startsWith(self.registration.scope) && win.visibilityState === "visible");
    if (visible.length) {
      visible.forEach((win) => win.postMessage({ type: "homy-notification", id: data.id }));
      return;
    }
    const icon = new URL("favicon.svg", self.registration.scope).href;
    await self.registration.showNotification(data.title, {
      body: data.body, icon, tag: data.id, data: { url: adminTarget(data.url) },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = event.notification.data?.url;
    const target = typeof url === "string" && url.startsWith(self.registration.scope) ? url : adminTarget();
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const admin = windows.find((win) => win.url.startsWith(self.registration.scope));
    if (!admin) return self.clients.openWindow(target);
    await admin.navigate(target);
    return admin.focus();
  })());
});
