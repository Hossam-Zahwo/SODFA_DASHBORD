# HOMEY & SODFA Orders Manager

Independent Next.js 16 dashboard on Vercel with **Neon PostgreSQL + secure username/password sessions**. Data remains independent of HOMEY and SODFA storefront databases. HOMEY published catalog can be read through a protected, optional server-side API.

## Infrastructure

- Neon Free project: `homey-sodfa-orders-manager` (project ID `rapid-lab-94017333`; database `orders_manager`).
- Tables: `public.orders`, `public.customers`, `public.audit_log`; see `neon/schema.sql` for reproducible definition.
- Authorized staff users live in `public.staff_users` and store **salted PBKDF2-SHA256 hashes**, never plaintext passwords. Sessions use HttpOnly, signed cookies and `NEON_AUTH_COOKIE_SECRET`. The second staff user is provisioned separately when supplied.
- Every order/customer/waybill API rechecks a signed staff cookie against Neon. No unauthenticated data API.
- All PostgreSQL queries happen server-side using `@neondatabase/serverless`; no database credentials are exposed to the browser.
- Vercel environment: `DATABASE_URL` (server-only), `NEON_AUTH_COOKIE_SECRET` (server-only signing secret), and optional `HOMEY_CATALOG_URL` + `HOMEY_CATALOG_KEY` (publishable, server-side).
- Restrict staff provisioning to trusted operators; maintain login rate limiting and secure cookie settings.
- Vercel deployment protection may additionally require Vercel authentication; if applicable, configure project-level access for the two users.

## Functionality

Separate HOMEY/SODFA order/customer records; add/edit/soft-delete, products and quantities, delivery, payment, prepayments, notes, source, date, search, CSV export, day/week/month/custom reports, and customer purchase history. Responsive Arabic layout.

## Verification

```bash
npm install
npm run typecheck
npm run build
```

Never treat a passing deployment as proof of working login or CRUD. Verify both authorized password logins, third-user rejection, API 401/403, and create/read/update/soft-delete using sample orders before entering customer data.

No secrets in GitHub or browser code. This is separate from HOMEY's production Supabase databases.


## HOMEY brand image (required local asset)
The UI uses the **original image** supplied by the store owner, not a recreation.
Place the file at the exact path `public/HOMEY-olive (3).png` in the Next.js project root.
The folder must be spelled `public` (**not** `puplic`). Keep the filename unchanged, including
spaces, parentheses, capitalization, and extension. Check `http://localhost:3001/HOMEY-olive%20(3).png`
(or substitute your local port) to confirm the asset loads.

The image file exists on the operator's computer; it is **not** bundled automatically by GitHub
code changes. Before any future production deployment, add and commit the image to the
same Git branch:

```powershell
git add -- "public/HOMEY-olive (3).png"
git commit -m "Add original HOMEY olive logo artwork"
git push origin feature/username-password-order-workflow
```

Responsive styles support desktop, tablet and mobile dashboards, forms and navigation.
A4 paper preview intentionally retains physical A4 size and scrolls horizontally on small
screens; print output remains 3 or 4 stickers per page.

## Shipping integrations

In the private dashboard, open **ربط شركات الشحن**, choose a carrier, and select the orders to export for the active brand. The carrier directory opens the same view for a specific company. The bulk action in Orders carries the selection over when every selected order is eligible and belongs to the same carrier.

The generic CSV includes the stable order ID, recipient and delivery fields, and the amount the carrier should collect from the recipient in EGP. That amount comes from the existing order calculation, including manual collection overrides. Staff can opt in to exporting shipment contents. Confirm the carrier's required headers, field formats, and area codes before uploading. Exporting leaves the order and collection status untouched.

### Adding a carrier connection

1. Obtain the carrier's API documentation or file specification, account ID, area and service codes, test access, supported operations, and tracking and settlement formats. Configure credentials on the server.
2. Map the request from the saved order and extend the shipment data only where the carrier requires it. Persist a separate shipment record with the carrier shipment ID, tracking number, waybill metadata, and last synchronized order version. Use the order reference as the external reference and the carrier's idempotency mechanism. Reconcile an unknown result before retrying creation.
3. Create shipments only after the configured dispatch trigger for that carrier. Sync permitted changes to an existing shipment by its external ID, respecting the carrier's editing and cancellation rules.
4. Verify incoming webhook messages or poll the provider, deduplicate events, and map delivery and return codes. Apply events only to the matching shipment. Keep carrier settlement amounts separate from delivery events and from the amount to collect at the door.

Tala's current rates and settlement calculations work through the existing order flow. The shipping CSV is available for Tala and other assigned carriers. Live adapters, carrier templates, tracking callbacks, and settlement ingestion require the provider specifications and are not enabled by this change.

### Tala Express connection settings

In **Settings** or the Tala entry under **Shipping integrations**, staff can verify the Tala-issued account, read service and zone IDs, and look up an existing shipment. Set `TALA_HOMEY_USERNAME` and `TALA_HOMEY_PASSWORD` as server environment variables. If Tala issues a separate SODFA account, use `TALA_SODFA_USERNAME` and `TALA_SODFA_PASSWORD` for that store. The app does not expose the credentials or bearer token to the browser. The official endpoint and documentation are shown in settings.

This connection test uses GraphQL login and reads only. The dashboard does not send orders or accept callbacks until shipment persistence, area mapping, and trusted callback verification are implemented.

### Editing Tala settings in the dashboard

Apply `neon/migrations/20261115_tala_settings.sql` before enabling dashboard writes in production. The editor opens locked and confirms each save or removal against the active staff account using its email and password. Saving closes the editor. The database stores encrypted carrier credentials and the staff account that last updated the settings.

Server environment credentials remain the initial fallback. A saved configuration, including one with its credentials explicitly removed, takes precedence. Configure a stable `TALA_SETTINGS_ENCRYPTION_SECRET` before first use if session keys are rotated independently. Changing the encryption secret requires re-encrypting the existing settings. Additional Tala endpoints must be approved via `TALA_ALLOWED_ENDPOINTS` before staff can select them, and changing endpoints requires re-entering Tala's password.

### Creating Tala shipments from Homey orders

Apply `neon/migrations/20261115_tala_dispatch.sql` before releasing automatic dispatch. For a new Homey order assigned to Tala Express, the order form requires Tala's service, zone, and subzone. Saving sends that order using its UUID as Tala's external reference. Existing orders and edits do not trigger dispatch. Order details show the carrier tracking number when available.

The application reserves one shipment attempt per saved order. If the upstream response is ambiguous, check the order reference in Tala before attempting a manual send. This integration does not retry an uncertain create or change the staff-managed order status.
