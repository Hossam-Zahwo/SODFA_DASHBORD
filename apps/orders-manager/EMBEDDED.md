# Orders Manager inside SODFA Dashboard

This copy uses Homey & SODFA Orders Manager main at commit
`9a8a682433079867f02f3a4d4c5fa228d5cb10a3`. It runs as a separate Next.js
process so its pages, API routes, assets and staff login retain their own origin.

From the dashboard root, install both dependency sets with `npm ci` and
`npm ci --prefix apps/orders-manager`. Start the manager with
`DASHBOARD_PREVIEW_ORIGIN=http://127.0.0.1:5173 npm run dev:orders`.
In a separate terminal, start the dashboard with
`npm run dev -- --host 127.0.0.1 --port 5173`. Open
`http://127.0.0.1:5173/control-center-orders`.

For an externally hosted development preview, run the manager on a dedicated
HTTPS origin under the same site as the dashboard so its SameSite staff cookie
works in the frame. Set `DASHBOARD_PREVIEW_ORIGIN` to the dashboard's exact
origin in the manager runtime, and set `VITE_ORDERS_MANAGER_URL` to the manager
origin when building the dashboard. Use the isolated preview database and its
own staff credentials and signing secret. See `.env.example` for server
configuration. Leave live carrier credentials and webhook secrets unset.
