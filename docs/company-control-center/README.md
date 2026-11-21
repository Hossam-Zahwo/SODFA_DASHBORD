# SODFA Company Control Center — development preview

**Branch:** `feature/company-control-center-20261121`  
**Route:** `/control-center`  
**Safety:** no production migrations, no edits to legacy storefronts, no automatic publishing.

## Current work (2026-11-21)
- Added authenticated SODFA/TanStack Start management page in original **black + purple** palette.
- Reads SODFA inventory via existing `useInventorySummary` read-only query. Existing inventory/finance/order behavior remains untouched.
- New **independent** Neon project `empty-unit-13354156`, DB `company_crm`, main branch `br-cool-waterfall-basvlmjc`. No app connection secrets committed.
- New central index imported **454 product catalog references**: 117 non-deleted HOMEY products and 337 SODFA catalog records. This is metadata only: product ID, source, title, brand. The SODFA catalog can include variants; counts are catalog records, not all unique saleable SKUs.
- Central tables: `brands`, `sales_channels`, `source_systems`, `product_references`, `channel_listings`, `order_references`, `sync_jobs`, `audit_events`.
- All `source_systems.read_enabled=false` and `write_enabled=false` until integration credentials, access controls and reconciliation are complete; all channel listing rows must be explicitly created and are draft by default.
- No purchase prices or customer data copied into central DB.
- Do not mistake UI or product index for a connected order/warehouse/AI system.

## Data ownership and channel policy
1. HOMEY store is source of truth for HOMEY catalog and storefront content.
2. SODFA Dashboard is source of truth for SODFA stock, purchase cost, supplier and financial history where it actually holds that data.
3. Orders Manager is source of truth for shipment workflow, collection state and Tala integration.
4. SODFA Web can have its own published selection and presentation data.
5. Central DB holds **references and explicit per-channel publication policy**, not unconditional replication of all business data.
6. Public storefront APIs never receive purchase cost, suppliers, internal financials, unpublished SKUs, or other brands' records.
7. `channel_listings` is **deny by default**. A product must be explicitly approved and published to exactly one permitted channel. No public API may use raw `product_references` directly.
8. Financial reports reconcile by stable pair `(source_system_id,source_order_id)` and snapshot historical unit costs/prices when writes are later enabled.

## Rollout gates
- [x] Separate Git branch; existing `main` untouched.
- [x] Preview deployment through Git integration.
- [x] Standalone central metadata database.
- [x] Read-only catalog metadata import; no customer data.
- [x] Configure server-to-server *read-only* connection roles on Neon SODFA, Orders Manager, and CRM catalog; preview-branch-only encrypted Vercel environment variables. Vercel build verified; an authenticated end-to-end browser smoke test is still required.
- [ ] Design and test row-level brand/channel permissions and private admin endpoints.
- [x] Direct read-only checks: 117 HOMEY catalog references, 337 SODFA references, and 56 HOMEY orders in Orders Manager; no SODFA orders appeared in the sampled group query.
- [x] Embedded per-project overview, products, orders, shipping, customers, finance and permissions tabs with live read-only server bridge. CSV exports are metadata-only.
- [ ] Run full end-to-end browser tests under an authorized employee session and reconcile missing SODFA Web order source.
- [ ] Build controlled write adapters for creation, stock reservation, Tala updates and payment settlement with idempotency.
- [ ] Test automatic restore using external backup exports (database schema + data + image manifests).
- [ ] Enable scoped AI tools with explicit approvals and audit logs.
- [ ] Only after approval, merge and promote to production.

## Backups and disaster recovery
Existing Neon snapshots cannot be expanded now: **snapshot limit exceeded** for SODFA and Orders Manager. Older snapshots exist but are not a current cross-provider backup.

Required before any write integration:
- Daily independent encrypted export for **each** PostgreSQL source (SODFA, Orders, central CRM) in a separate provider, plus schema, indexes and constraints.
- Supabase exports for HOMEY/HOMEY Images/SODFA and an image-object manifest; store blobs outside the database and separate from the production storage account.
- Retention and access review, checksums, incremental changes or dated full exports.
- Monthly restoration rehearsal into isolated databases; compare counts and checksums; verify site order flow on test instance.
- Alert on failures, credentials rotation, permissions changes, low capacity, migrations, and sync lag.
- Production databases should never be mounted to preview with unrestricted write credentials.

## Implementation warning
This branch is on an existing **public GitHub repository**. Do not commit any secret or unredacted customer data. A private GitHub repository is still recommended if future sensitive integration code or business algorithms require confidentiality. A branch in a public repo is **not** private.

## Second implementation pass: live internal project workspaces
- `src/routes/control-center.tsx`: project switcher for four workspaces (SODFA Dashboard, HOMEY Web, SODFA Web, Orders Manager) plus company overview. Internal tab switching; no customer storefront iframes or redirects.
- `src/lib/company-workspace.functions.ts`: authenticated POST server function. Every call validates the employee's Supabase session via `auth.getUser`, then reads three Neon sources through scoped SELECT-only roles. No orders' names, phone numbers, addresses, notes or other customer PII leave this endpoint.
- The frontend displays true status counts by brand, order identifiers/status/carrier, source-tagged product references, and SODFA Neon website_inventory/sales view figures. Missing integrations show as unavailable, not zero sales.
- Product count and warehouse view rows are distinct measures. The `website_inventory` view is not proof of all SODFA inventory across all warehouses. Purchase-price inventory valuation may be zero if source values are missing.
- The SODFA Web storefront DB `ciuztlmzflyzpwijyoky` is currently inactive; its live published products are **not** currently verified by the CRM. Do not conflate SODFA stock catalog with SODFA storefront listings.
- Source-specific mutation, order creation and shipping actions are deliberately disabled. Connecting these requires authorization mapping, staging migrations, idempotent write adapters and a restore-tested off-platform backup.
- SODFA's original core navigation is preserved. A new `مركز التحكم بالمشاريع` entry was added on the feature branch only.
