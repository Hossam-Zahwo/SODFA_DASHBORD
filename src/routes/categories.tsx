import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet, Pencil, Plus, Search, Tags, Trash2, Upload, X, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useApiMutation, useCategories } from "@/hooks/useSodfa";
import { api, type ProductCategory } from "@/lib/api";
import { errorMessage, useI18n } from "@/lib/i18n";
import { parseCategoryWorkbook, type ImportedCategoryRow } from "@/lib/categoryExcel";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Categories — SODFA صدفة" },
      { name: "description", content: "Manage smart product categories and bilingual matching keywords." },
    ],
  }),
  component: CategoriesPage,
});

function splitKeywords(value: string) {
  return value
    .split(/[،,;؛\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function CategoriesPage() {
  const { lang } = useI18n();
  const categories = useCategories();
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [editName, setEditName] = useState("");
  const [editKeywords, setEditKeywords] = useState("");
  const [toDelete, setToDelete] = useState<ProductCategory | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [excelRows, setExcelRows] = useState<ImportedCategoryRow[]>([]);
  const [excelFileName, setExcelFileName] = useState("");
  const [excelError, setExcelError] = useState("");
  const [importingExcel, setImportingExcel] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; updated: number; skipped: number } | null>(null);

  const create = useApiMutation(async (payload: { name: string; keywords: string[] }) =>
    api.createCategory(payload.name, payload.keywords),
  );
  const update = useApiMutation(async (payload: { id: string; name: string; keywords: string[] }) =>
    api.updateCategory(payload.id, payload.name, payload.keywords),
  );
  const remove = useApiMutation((id: string) => api.deleteCategory(id));
  const importExcel = useApiMutation((rows: ImportedCategoryRow[]) =>
    api.importCategories(rows),
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories.data ?? [];
    return (categories.data ?? []).filter((category) =>
      [category.name, ...(category.keywords ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [categories.data, query]);

  const handleExcelFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setExcelError("");
    setImportResult(null);
    setExcelRows([]);

    if (!file) return;

    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    if (!isExcel) {
      setExcelError(lang === "ar" ? "اختر ملف Excel بصيغة .xlsx أو .xls" : "Choose an Excel .xlsx or .xls file");
      return;
    }

    try {
      const rows = await parseCategoryWorkbook(file);
      if (!rows.length) throw new Error("EMPTY_EXCEL");
      setExcelRows(rows);
      setExcelFileName(file.name);
    } catch (error) {
      setExcelError(
        error instanceof Error && error.message === "EMPTY_EXCEL"
          ? (lang === "ar" ? "الملف لا يحتوي على صفوف تصنيفات." : "The file contains no category rows.")
          : (lang === "ar"
              ? "تعذر قراءة ملف Excel. تأكد من وجود الأعمدة الأربعة المطلوبة."
              : "Could not read the Excel file. Make sure the four required columns are present."),
      );
    }
  };

  const clearExcel = () => {
    setExcelRows([]);
    setExcelFileName("");
    setExcelError("");
    setImportResult(null);
  };

  const submitExcelImport = async () => {
    if (!excelRows.length) return;

    setImportResult(null);
    setImportingExcel(true);
    try {
      const result = await importExcel.mutateAsync(excelRows);
      setImportResult(result);
      setExcelRows([]);
      setExcelFileName("");
      toast.success(
        lang === "ar"
          ? `تم استيراد ${result.inserted + result.updated} تصنيف بنجاح`
          : `Imported ${result.inserted + result.updated} categories successfully`,
      );
    } catch (error) {
      toast.error(errorMessage(error, lang));
    } finally {
      setImportingExcel(false);
    }
  };

  const submitCreate = async () => {
    if (!name.trim()) return toast.error(lang === "ar" ? "اكتب اسم التصنيف أولاً" : "Enter a category name first");
    try {
      await create.mutateAsync({ name: name.trim(), keywords: splitKeywords(keywords) });
      setName("");
      setKeywords("");
      toast.success(lang === "ar" ? "تمت إضافة التصنيف" : "Category added");
    } catch (error) {
      toast.error(errorMessage(error, lang));
    }
  };

  const submitEdit = async () => {
    if (!editing || !editName.trim()) return;
    try {
      await update.mutateAsync({
        id: editing.id,
        name: editName.trim(),
        keywords: splitKeywords(editKeywords),
      });
      setEditing(null);
      toast.success(lang === "ar" ? "تم تحديث التصنيف" : "Category updated");
    } catch (error) {
      toast.error(errorMessage(error, lang));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await remove.mutateAsync(toDelete.id);
      setToDelete(null);
      toast.success(lang === "ar" ? "تم حذف التصنيف" : "Category deleted");
    } catch (error) {
      toast.error(errorMessage(error, lang));
    }
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-7" dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[#823292]">
              <Tags className="h-6 w-6" />
              <span className="font-bold">{lang === "ar" ? "التصنيفات الذكية" : "Smart Categories"}</span>
            </div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white">
              {lang === "ar" ? "إضافة وإدارة تصنيفات المنتجات" : "Add and manage product categories"}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {lang === "ar"
                ? "الكلمات المفتاحية هنا تستخدمها قاعدة البيانات لاقتراح التصنيف تلقائياً عند كتابة عنوان المنتج."
                : "Saved keywords are used by the database to suggest the right category from a product title."}
            </p>
          </div>
          <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-2 text-sm font-semibold text-[#823292] dark:border-purple-900 dark:bg-purple-950/30">
            {(categories.data ?? []).length} {lang === "ar" ? "تصنيف" : "categories"}
          </div>
        </div>

        <Card className="border-purple-100 p-4 shadow-sm dark:border-zinc-800 md:p-6">
          <div className="grid gap-4 md:grid-cols-[1fr_2fr_auto]">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === "ar" ? "اسم التصنيف، مثال: أدوات القهوة" : "Category name, e.g. Coffee accessories"} />
            <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder={lang === "ar" ? "كلمات مطابقة عربي/English، افصل بينها بفاصلة" : "Arabic/English matching keywords, separated by commas"} />
            <Button onClick={submitCreate} disabled={create.isPending} className="gap-2 bg-[#823292] hover:bg-[#642472]">
              <Plus className="h-4 w-4" />
              {lang === "ar" ? "إضافة تصنيف" : "Add Category"}
            </Button>
          </div>
        </Card>

        <Card className="border-dashed border-purple-200 bg-purple-50/40 p-4 dark:border-purple-900 dark:bg-purple-950/10 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white p-3 text-[#823292] shadow-sm dark:bg-zinc-900">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-bold text-zinc-900 dark:text-white">
                  {lang === "ar" ? "استيراد التصنيفات من Excel" : "Import categories from Excel"}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {lang === "ar"
                    ? "ارفع ملف Excel وسيتم قراءته ومراجعة الصفوف ثم إضافتها مباشرة إلى قاعدة البيانات."
                    : "Upload an Excel file to preview the rows and import them directly into the database."}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {lang === "ar"
                    ? "الأعمدة المطلوبة: Category Name، English Category، Arabic Keywords، English Keywords"
                    : "Required columns: Category Name, English Category, Arabic Keywords, English Keywords"}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={handleExcelFile}
              />
              <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={importingExcel}>
                <Upload className="h-4 w-4" />
                {lang === "ar" ? "اختيار ملف Excel" : "Choose Excel file"}
              </Button>
              {excelRows.length > 0 && (
                <Button className="gap-2 bg-[#823292] hover:bg-[#642472]" onClick={submitExcelImport} disabled={importingExcel}>
                  <CheckCircle2 className="h-4 w-4" />
                  {importingExcel
                    ? (lang === "ar" ? "جاري الاستيراد..." : "Importing...")
                    : (lang === "ar" ? `استيراد ${excelRows.length} صف` : `Import ${excelRows.length} rows`)}
                </Button>
              )}
            </div>
          </div>

          {excelError && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{excelError}</span>
            </div>
          )}

          {excelRows.length > 0 && (
            <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-semibold">
                    <FileSpreadsheet className="h-4 w-4 text-[#823292]" />
                    <span className="truncate">{excelFileName}</span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {lang === "ar"
                      ? `${excelRows.length} صف جاهز للاستيراد — سيتم استيراد كل الصفوف`
                      : `${excelRows.length} rows ready — all rows will be imported`}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={clearExcel} aria-label={lang === "ar" ? "إلغاء الملف" : "Clear file"}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-900">
                    <tr>
                      <th className="px-3 py-2 text-start">#</th>
                      <th className="px-3 py-2 text-start">{lang === "ar" ? "التصنيف" : "Category"}</th>
                      <th className="px-3 py-2 text-start">{lang === "ar" ? "English" : "English Category"}</th>
                      <th className="px-3 py-2 text-start">{lang === "ar" ? "كلمات عربية" : "Arabic Keywords"}</th>
                      <th className="px-3 py-2 text-start">{lang === "ar" ? "كلمات إنجليزية" : "English Keywords"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excelRows.map((row, index) => (
                      <tr key={`${row.name}-${index}`} className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="px-3 py-2 text-zinc-400">{index + 1}</td>
                        <td className="px-3 py-2 font-semibold">{row.name}</td>
                        <td className="px-3 py-2">{row.name_en || "—"}</td>
                        <td className="px-3 py-2 text-xs text-zinc-500">{row.keywords_ar.join("، ") || "—"}</td>
                        <td className="px-3 py-2 text-xs text-zinc-500">{row.keywords_en.join(", ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {importResult && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {lang === "ar"
                ? `تمت الإضافة: ${importResult.inserted} — تم التحديث: ${importResult.updated} — تم التجاهل: ${importResult.skipped}`
                : `Inserted: ${importResult.inserted} — Updated: ${importResult.updated} — Skipped: ${importResult.skipped}`}
            </div>
          )}
        </Card>

        <div className="relative max-w-xl">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input className="ps-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={lang === "ar" ? "ابحث في الاسم أو الكلمات المفتاحية" : "Search names or matching keywords"} />
        </div>

        {categories.isLoading ? (
          <div className="py-12 text-center text-zinc-500">{lang === "ar" ? "جاري تحميل التصنيفات..." : "Loading categories..."}</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((category) => (
              <Card key={category.id} className="border-zinc-200 p-5 transition-shadow hover:shadow-md dark:border-zinc-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold">{category.name}</h2>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(category.keywords ?? []).length ? (category.keywords ?? []).map((keyword) => (
                        <span key={keyword} className="rounded-full bg-purple-50 px-2 py-1 text-xs text-[#823292] dark:bg-purple-950/30">{keyword}</span>
                      )) : <span className="text-xs text-zinc-400">{lang === "ar" ? "بدون كلمات مطابقة" : "No matching keywords"}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(category); setEditName(category.name); setEditKeywords((category.keywords ?? []).join("، ")); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => setToDelete(category)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {!categories.isLoading && list.length === 0 && (
          <div className="py-12 text-center text-zinc-500">{lang === "ar" ? "لا توجد تصنيفات مطابقة" : "No matching categories"}</div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg space-y-4 p-6">
            <h2 className="text-xl font-bold">{lang === "ar" ? "تعديل التصنيف" : "Edit Category"}</h2>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            <Input value={editKeywords} onChange={(e) => setEditKeywords(e.target.value)} placeholder={lang === "ar" ? "كلمات مفتاحية" : "Matching keywords"} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
              <Button className="bg-[#823292] hover:bg-[#642472]" onClick={submitEdit} disabled={update.isPending}>{lang === "ar" ? "حفظ" : "Save"}</Button>
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={lang === "ar" ? "حذف التصنيف" : "Delete category"}
        description={lang === "ar" ? "سيتم حذف التصنيف فقط إذا لم تكن هناك منتجات مرتبطة به." : "The category can only be deleted when no products are linked to it."}
        onConfirm={confirmDelete}
        busy={remove.isPending}
      />
    </AppShell>
  );
}
