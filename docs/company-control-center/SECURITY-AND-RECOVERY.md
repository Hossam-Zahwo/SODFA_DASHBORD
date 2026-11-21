# Company Control Center — security, responsibilities and recovery gates

Updated: 2026-11-21. **This is a preview-only implementation.**

## Responsibility and authorization
- Existing authenticated SODFA `profiles.role=admin` is the only role that may view the company-wide workspace, assign staff roles, and inspect the backup ledger.
- Project-level `workspace_permissions` grants are deny-by-default. A person without a matching project grant is denied by the server; a browser cannot override it by changing URL parameters.
- Project `viewer`: scoped read-only data, no customer contact details or purchase costs.
- Project `operator`: scoped reads, product publication *drafts* for the original brand; staged Orders Manager create actions.
- Project `manager`: operator rights plus staged order confirmation and cross-brand draft authorization; cross-brand drafts require manager authorization for **both** brands.
- Existing admin only may grant an assignment. Self-role edits are rejected. Grant and draft events are written to `audit_events`.
- Public storefronts never receive internal prices, supplier data, or cross-brand records from this dashboard.

## Production write gates (not yet passed)
1. Authenticate the actor using server-side validation against the project identity provider. Confirm active role, scope and explicit action permission.
2. Write only through an API adapter that shares the original validation and versioning logic (including order idempotency, stock concurrency, Tala carrier state).
3. Use a stable source entity ID and idempotency key; read before retrying any externally observable action.
4. Require a second approver for high-risk operations such as cross-store publication, price overrides, shipment dispatch or financial adjustment. `operation_approvals` exists in the CRM, but no live adapter consumes it yet.
5. Keep an append-only audit with user ID, action, project, timestamp and before/after **non-sensitive** payloads. Limit audit retention and avoid storing phone/address in logs.
6. Run branch-specific smoke tests and verify an independent restore before any promotion to production.
7. Enable writes for one narrow operation at a time, with a kill switch and rollback procedure. Never bulk-change HOMEY/SODFA catalog visibility by default.

## Backups: actual verified state
- CRM Neon `empty-unit-13354156`, branch `br-cool-waterfall-basvlmjc`: snapshot `snap-broad-voice-baw3c1o1` made 2026-11-21.
- Separate CRM recovery branch `br-holy-base-baeq472r` verified with **454** catalog rows, including **117 HOMEY** and **337 SODFA** reference rows. This is a sample row-count verification, **not** a full restore rehearsal.
- Orders Manager Neon `rapid-lab-94017333` and SODFA Neon `steep-frost-00176732` did **not** get new snapshots on 2026-11-21: snapshot quota exceeded. Prior snapshots exist but are older.
- A daily automation `6b01f3b098d48191845ae32918bace9d` was already enabled to attempt HOMEY/CRM/Orders backups starting 2026-11-22; a separate every-two-day SODFA backup automation already exists.
- **External encrypted archives and full restoration have not been independently confirmed.** A same-provider snapshot or cloned branch does not satisfy off-site disaster recovery.
- Never store connection strings, Supabase secrets, provider tokens, or private authentication records in backup manifests or public repositories.

## Required off-provider recovery workflow
- Daily full or incremental exports per source in a different private storage provider with encryption, checksums, version retention and immutable history.
- Separate image binary archives, not only URL lists; use checksums and catalog ID mappings.
- At least one dated `schema + data + images` archive retained independently.
- Test restoration in a fresh isolated destination; compare source/restore counts and random record checks; perform order and product smoke tests with all external side effects disabled.
- Record restore test date, recovery time, actual lag, and failed objects. Block any deployment of new production write functions until a passing restore test is documented.
- Target objectives (proposed only): RPO <= 24 hours, RTO <= 4 hours for core orders, with tighter requirements to be tested before adopting.
- On outage: stop central writes; keep existing production stores unchanged if healthy; restore into a **new** environment, verify and switch only after explicit safe cutover.
