import type { NextConfig } from "next";

const dashboardOrigin = process.env.DASHBOARD_PREVIEW_ORIGIN;
const frameAncestor = dashboardOrigin ? new URL(dashboardOrigin).origin : null;

const config: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${frameAncestor ?? "'none'"}`,
          },
        ],
      },
    ];
  },
};

export default config;
