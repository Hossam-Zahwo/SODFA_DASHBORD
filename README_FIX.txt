SODFA — source bundle with InventoryStatistics owner-payment scope fix

Contents:
- src/: source directory from the supplied project archive, including the inventory page fix.
- SODFA_expense_owner.sql: database migration used by the MEME / Meme Stor payment-owner feature.

Fix verification:
- src/routes/inventory.tsx declares hasSelectedOwnerPayments in InventoryPage.
- InventoryPage passes hasSelectedOwnerPayments and the related payment totals as props to InventoryStatistics.
- InventoryStatistics destructures and types those props before using them in JSX.

Important:
The upload supplied for this task contained only the src directory, not package.json, lockfile, Vite/TanStack config, or the rest of the repository. Therefore this archive preserves and packages the complete supplied src tree, but cannot include project-root files that were not provided. No live Supabase database or browser runtime was available for an end-to-end test.
