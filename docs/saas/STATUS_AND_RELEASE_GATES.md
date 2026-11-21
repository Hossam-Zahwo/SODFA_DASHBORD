# SaaS + ERP + CRM — Implementation Register

Date: 2026-11-21. Branch: `feature/saas-erp-crm-foundation-20261121`.

## Deployment state

**Development only.** New code was committed to the GitHub feature branch and the company CRM Neon staging branch. It has NOT been deployed to the public Vercel production hostname. Vercel deployment API previously returned HTTP 402 `api-deployments-free-per-day`. No preview of this feature branch has yet been confirmed READY. Never link to the earlier control-center preview as if it includes the SaaS implementation.

## Verified staging assets

- Neon project: `empty-unit-13354156`
- Staging branch: `br-calm-voice-bays2b2x`, database `company_crm`
- Isolated app role: `saas_runtime_staging`; `rolsuper=false`, `rolbypassrls=false`
- All **35** SaaS tables have `relrowsecurity=true` and `relforcerowsecurity=true`.
- Verified authorization: existing tenant owner sees 454 products; unknown tenant context sees 0; unrelated user without membership sees 0; an unauthorized row insert was rejected by RLS.
- Default tenant `sodfa-company`; 3 already verified SODFA admin identities have staging `owner` membership, never copied passwords.
- Seeded **454** product references: 117 HOMEY and 337 SODFA; **117 HOMEY prices** and **63 SODFA prices** available in timestamped source snapshots. **274 SODFA stock quantities unknown**, not zero.
- Imported **56** HOMEY Orders Manager records as metadata-only source snapshots. No customer names, addresses, or phone numbers were imported through this job. There were 0 SODFA records in this particular OMS source.
- Imported source snapshots are **not** live sync. They can be out of date. Core SaaS order and finance tables remain empty until staged write operations occur.
- 10 chart-of-accounts entries. CRM leads, tasks, warehouses, warehouse movements, journals, and payments begin empty.
- Recovery branch `br-shiny-mountain-ba9h5e34` was created, but a full restore rehearsal of the final schema/data and off-provider archive have **not** yet been completed.

## Implemented development modules

| Module | Database | API/UI | Production |
|---|---|---|---|
| Multi-tenancy | tenants, members, per-brand grants, RLS | validated JWT + tenant/member/brand access | Not enabled |
| Catalog | products, channels, separate listing states, source snapshots | actual reference catalog + staged draft creation | No live publishing |
| CRM | customers, leads, tasks, activities | staged customer/lead creation, lead stage changes, follow-up tasks | No external messaging |
| Orders | orders, order lines, source snapshots | original OMS metadata read-only; staged OMS form on preceding branch | No new production order writes |
| Stock | warehouses, balances, movements | staged warehouse creation, atomic stock receipt/issue and audit | No live warehouse mutations |
| Purchasing | suppliers, purchase orders, lines | schema only | Not enabled |
| Accounting | accounts, journal entries/lines, expenses, payments | staged expenses and balanced journal entry with audit | No production cash/ledger mutation |
| Shipping | shipments, integration states | schema and separate prior staging OMS order flow | No Tala dispatch |
| Returns | returns table | schema only | Not enabled |
| SaaS billing | subscriptions, quotas, invitations | schema only; no provider / sign-up checkout | Not enabled |
| Integrations | outbox, inbox with dedupe, connection status | schema only; no durable worker | Not enabled |
| Auditing | append audit and responsibility grants | staged write actions append audit | Full monitoring/retention pending |
| Backups | company CRM snapshot and branch backups exist | read-only backup ledger (prior branch) | Off-site restore not verified |

## Tests performed directly against Neon staging

1. RLS: owner session 454 products; unrelated tenant 0; unassigned identity 0; no session context 0; unauthorized INSERT denied.
2. Least privilege: SaaS role has no DELETE on products, no ability to assign memberships, no SELECT on legacy CRM public catalog.
3. Inventory: receipt +5 succeeded; replay changed 0 rows; stock issue -2 succeeded; replay reported `replayed=true`; attempted overdraft -20 rejected; resulting stock 3; test warehouse/movements/balances/audit removed afterward.
4. Accounting: one entry for 500 minor units posted with exactly two balanced journal lines (500 debit, 500 credit); replay inserted no new entry/lines; test entry removed afterward.
5. Existing systems were never modified for these SaaS tests; all writes went to an isolated Neon branch.
6. These are database tests. Browser/login/API roundtrip, independent restore, payments, scheduled workers, concurrency stress, security scanning, E2E and Vercel build verification of this new branch remain outstanding.

## Required production release gates

1. Get new branch building on Vercel; verify every page behind valid admin/membership login, inspect runtime logs, typecheck and static analysis.
2. Restore an encrypted off-provider schema+data+images backup to a new isolated environment; verify row counts, samples, permissions, functions, and a staged order.
3. Correct SODFA WEB source catalog availability. Do not repoint its storefront to SODFA warehouse views without source mapping.
4. Integrate HOMEY's actual live catalog/publishing flow. Its emergency static catalog currently can obscure changes to Supabase product state.
5. Use signed, idempotent service-to-service APIs for live Orders Manager writes. Execute Tala only through the original carrier adapter, after reconciliation and duplicate-safe outbox delivery.
6. Add safe publishing approval, per-channel price/stock policy, media transfer and rollback; require explicit independent approvals for cross-brand publication and financial actions.
7. Reconcile old and new order financials without counting revenues twice; add returns and courier reconciliation.
8. Complete SaaS tenant onboarding, invitations, session revocation, MFA, quotas, billing webhook verification, subscription enforcement, plan checkout and usage reports. No real subscription can be sold before this gate.
9. Add observability: structured logs with PII redaction, health checks, retries/DLQ, tracing, alerts, synthetic tests and dashboards; establish operational RPO/RTO.
10. Test on desktop/mobile for owner, tenant admin, manager, operator, viewer and unaffiliated accounts; verify performance and accessibility.
11. Roll out to a small tenant first, maintain original services and reversible feature flags; promote only after passing all gates.

## Reference routes (source only, not deployed)

- `/saas-erp` — tenant dashboard, catalog, customers, warehouses, expenses, connectors, source order metadata.
- `/saas-crm` — lead pipeline and follow-ups.
- `/saas-inventory` — staged atomic stock movements and balances.
- `/saas-accounting` — staged double-entry accounting and trial balance.
- Original `/control-center` links into the new SaaS workspace.
