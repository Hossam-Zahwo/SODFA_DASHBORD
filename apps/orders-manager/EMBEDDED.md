# Orders Manager inside SODFA Dashboard

The source comes from Homey & SODFA Orders Manager main at commit
`9a8a682433079867f02f3a4d4c5fa228d5cb10a3`. Vercel Services routes
`/orders-manager` to the Next.js app on the dashboard's origin. Its session
cookie and service worker are scoped to that path.

From the dashboard root, install both dependency sets with `npm ci` and
`npm ci --prefix apps/orders-manager`. Start the manager with
`DASHBOARD_PREVIEW_ORIGIN=http://127.0.0.1:5173 npm run dev:orders`.
In a separate terminal, start the dashboard with
`npm run dev -- --host 127.0.0.1 --port 5173`. Open
`http://127.0.0.1:5173/control-center-orders`.

The embedded app uses `ORDERS_MANAGER_DATABASE_URL` for its isolated database.
Use separate staff accounts and a separate signing secret. See `.env.example`
for its server configuration.
