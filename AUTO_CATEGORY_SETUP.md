# SODFA Smart Categories — Setup

Run the SQL files in Supabase SQL Editor in this order:

1. `supabase/migrations/20260908_product_categories_smart.sql`
2. `supabase/migrations/20260908_auto_assign_product_categories.sql`
3. `supabase/migrations/20260908_import_categories_from_excel.sql`

After that:
- Existing products with no `category_id` are classified automatically.
- New products saved without a category are classified automatically.
- A manual category is never overwritten by the automatic trigger.
- If no match is found, the product receives `غير مصنف - يحتاج مراجعة` instead of being left without a category.
- Category detection uses Arabic and English title, description and keywords.

When you later prepare your Excel sheet, it can be imported as additional categories/keywords without changing the application architecture.


## Excel category import

The Categories page now includes **Import categories from Excel**.

The supported workbook columns are:
- `Category Name`
- `English Category`
- `Arabic Keywords`
- `English Keywords`

The application previews the workbook before importing. The import is sent to Supabase through `import_product_categories(jsonb)` in one atomic request.

Behavior:
- New category name → inserted.
- Existing category name (case-insensitive) → updated with the bilingual fields and merged matching keywords.
- Identical existing row → skipped.
- Empty rows → ignored.
- Up to 5,000 rows per import.
- The SQL function runs in the same database transaction, so a failed import does not leave half-imported rows.

### Frontend dependency

The Excel reader uses the `xlsx` package. Add it to the application's existing frontend dependencies:

`npm install xlsx`

If your project already has `xlsx`, no additional setup is required.

