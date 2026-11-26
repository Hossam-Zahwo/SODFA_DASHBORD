import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { ordersManagerBasePath } from "./lib/app-path";

const dashboardOrigin = process.env.DASHBOARD_PREVIEW_ORIGIN;
const frameAncestors = dashboardOrigin
  ? `'self' ${new URL(dashboardOrigin).origin}`
  : "'self'";

const config: NextConfig = {
  basePath: ordersManagerBasePath,
  turbopack: { root: fileURLToPath(new URL(".", import.meta.url)) },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Content-Security-Policy", value: `frame-ancestors ${frameAncestors}` }],
      },
    ];
  },
};

export default config;
