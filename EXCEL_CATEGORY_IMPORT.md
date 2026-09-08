# Excel Category Import

## What changed

The `/categories` page now supports importing category data from Excel.

### Excel format

Use these four columns:

1. `Category Name`
2. `English Category`
3. `Arabic Keywords`
4. `English Keywords`

### Flow

1. Choose the Excel file.
2. The browser reads the workbook locally.
3. The page previews the rows.
4. Click Import.
5. The app sends all rows to the Supabase `import_product_categories(jsonb)` RPC.
6. Supabase inserts new categories, updates existing categories case-insensitively, and skips identical rows.
7. The category list refreshes automatically.

## Supabase

Run these migrations in order:

- `supabase/migrations/20260908_product_categories_smart.sql`
- `supabase/migrations/20260908_auto_assign_product_categories.sql`
- `supabase/migrations/20260908_import_categories_from_excel.sql`

## Frontend dependency

Install SheetJS in the existing frontend project:

`npm install xlsx`

The source snapshot supplied with this task does not include the original app manifest/build files, so the existing project's package manager should add `xlsx` to its normal dependencies.
