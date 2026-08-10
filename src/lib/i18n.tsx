import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type Lang = "ar" | "en";

const dict = {
  brand: { ar: "صدفة", en: "SODFA" },
  brand_sub: { ar: "SODFA", en: "صدفة" },
  dashboard: { ar: "لوحة التحكم", en: "Dashboard" },
  inventory: { ar: "المخزون", en: "Inventory" },
  sales: { ar: "المبيعات", en: "Sales" },
  returns: { ar: "المرتجعات", en: "Returns" },
  normal_returns: { ar: "المرتجعات العادية", en: "Normal Returns" },
  damaged_returns: { ar: "المرتجعات التالفة", en: "Damaged Returns" },
  warehouses: { ar: "المخازن", en: "Warehouses" },
  scanner: { ar: "الماسح الضوئي", en: "Scanner" },
  settings: { ar: "الإعدادات", en: "Settings" },

  language: { ar: "اللغة", en: "Language" },
  arabic: { ar: "العربية", en: "Arabic" },
  english: { ar: "الإنجليزية", en: "English" },

  search: { ar: "بحث", en: "Search" },
  search_placeholder: { ar: "ابحث بالاسم أو الكود أو الباركود", en: "Search by name, ID or barcode" },
  all_warehouses: { ar: "كل المخازن", en: "All warehouses" },
  warehouse: { ar: "المخزن", en: "Warehouse" },
  add_product: { ar: "إضافة منتج", en: "Add Product" },
  edit: { ar: "تعديل", en: "Edit" },
  delete: { ar: "حذف", en: "Delete" },
  save: { ar: "حفظ", en: "Save" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  close: { ar: "إغلاق", en: "Close" },
  print_barcode: { ar: "طباعة الباركود", en: "Print Barcode" },
  print: { ar: "طباعة", en: "Print" },
  quantity: { ar: "الكمية", en: "Quantity" },
  price: { ar: "السعر", en: "Price" },
  total: { ar: "الإجمالي", en: "Total" },
  product: { ar: "المنتج", en: "Product" },
  product_name: { ar: "اسم المنتج", en: "Product Name" },
  product_id: { ar: "كود المنتج", en: "Product ID" },
  barcode: { ar: "الباركود", en: "Barcode" },
  image: { ar: "الصورة", en: "Image" },
  total_stock: { ar: "إجمالي المخزون", en: "Total Stock" },
  sold: { ar: "المباع", en: "Sold" },
  remaining: { ar: "المتبقي", en: "Remaining" },
  created_at: { ar: "تاريخ الإنشاء", en: "Created" },
  updated_at: { ar: "آخر تحديث", en: "Updated" },
  date: { ar: "التاريخ", en: "Date" },
  time: { ar: "الوقت", en: "Time" },
  status: { ar: "الحالة", en: "Status" },
  reason: { ar: "السبب", en: "Reason" },
  notes: { ar: "ملاحظات", en: "Notes" },
  details: { ar: "التفاصيل", en: "Details" },
  actions: { ar: "إجراءات", en: "Actions" },
  view: { ar: "عرض", en: "View" },

  loading_inventory: { ar: "جاري تحميل المخزون...", en: "Loading inventory..." },
  loading_sales: { ar: "جاري تحميل المبيعات...", en: "Loading sales..." },
  loading_returns: { ar: "جاري تحميل المرتجعات...", en: "Loading returns..." },
  loading: { ar: "جاري التحميل...", en: "Loading..." },
  saving: { ar: "جاري الحفظ...", en: "Saving..." },
  deleting: { ar: "جاري الحذف...", en: "Deleting..." },
  uploading: { ar: "جاري رفع الصورة...", en: "Uploading..." },
  no_results: { ar: "لا توجد نتائج", en: "No results" },

  drop_image: { ar: "اسحب الصورة هنا أو اضغط للاختيار", en: "Drag image here or click to choose" },
  choose_image: { ar: "اختر صورة", en: "Choose Image" },
  replace_image: { ar: "استبدال الصورة", en: "Replace Image" },
  remove_image: { ar: "إزالة الصورة", en: "Remove Image" },
  image_types: { ar: "JPG, JPEG, PNG, WEBP", en: "JPG, JPEG, PNG, WEBP" },

  confirm_delete_product: { ar: "هل أنت متأكد من حذف هذا المنتج؟", en: "Are you sure you want to delete this product?" },
  confirm_delete_warehouse: { ar: "هل أنت متأكد من حذف هذا المخزن؟", en: "Are you sure you want to delete this warehouse?" },
  confirm_generic: { ar: "لا يمكن التراجع عن هذا الإجراء.", en: "This action cannot be undone." },

  add_warehouse: { ar: "إضافة مخزن", en: "Add Warehouse" },
  rename: { ar: "إعادة تسمية", en: "Rename" },
  warehouse_name: { ar: "اسم المخزن", en: "Warehouse Name" },
  warehouse_has_stock: { ar: "هذا المخزن يحتوي على منتجات. انقل المنتجات أولاً.", en: "This warehouse still contains products. Move them first." },
  products_count: { ar: "عدد المنتجات", en: "Products" },

  usb_scanner: { ar: "ماسح USB", en: "USB Scanner" },
  usb_hint: { ar: "امسح الباركود — الحقل جاهز للاستقبال", en: "Scan a barcode — field is listening" },
  open_camera: { ar: "فتح كاميرا المسح", en: "Open Camera Scanner" },
  close_camera: { ar: "إغلاق الكاميرا", en: "Close Camera" },
  camera_denied: { ar: "يرجى السماح باستخدام الكاميرا", en: "Please allow camera access" },
  manual_search: { ar: "بحث يدوي", en: "Manual Search" },
  cart: { ar: "سلة البيع", en: "Sales Cart" },
  cart_empty: { ar: "السلة فارغة", en: "Cart is empty" },
  complete_sale: { ar: "إتمام البيع", en: "Complete Sale" },
  sale_recorded: { ar: "تم تسجيل البيع", en: "Sale recorded" },
  sales_history: { ar: "سجل المبيعات", en: "Sales History" },
  sale_id: { ar: "رقم البيع", en: "Sale ID" },
  not_found_barcode: { ar: "لم يتم العثور على منتج بهذا الباركود", en: "No product found for this barcode" },
  invalid_qty: { ar: "كمية غير صحيحة", en: "Invalid quantity" },
  insufficient_stock: { ar: "الكمية المتاحة غير كافية", en: "Not enough remaining stock" },

  today: { ar: "اليوم", en: "Today" },
  this_week: { ar: "هذا الأسبوع", en: "This Week" },
  this_month: { ar: "هذا الشهر", en: "This Month" },
  this_year: { ar: "هذه السنة", en: "This Year" },
  all_time: { ar: "كل الفترات", en: "All Time" },
  custom_range: { ar: "فترة مخصصة", en: "Custom Range" },
  from: { ar: "من", en: "From" },
  to: { ar: "إلى", en: "To" },

  total_products: { ar: "إجمالي المنتجات", en: "Total Products" },
  inventory_value: { ar: "قيمة المخزون", en: "Total Inventory Value" },
  total_sales: { ar: "إجمالي المبيعات", en: "Total Sales" },
  total_returns: { ar: "إجمالي المرتجعات", en: "Total Returns" },
  total_damaged: { ar: "إجمالي المرتجعات التالفة", en: "Total Damaged Returns" },

  add_return: { ar: "إضافة مرتجع", en: "Add Return" },
  return_history: { ar: "سجل المرتجعات", en: "Return History" },
  view_added_returns: { ar: "عرض المرتجعات المسجلة", en: "View Added Returns" },
  return_id: { ar: "رقم المرتجع", en: "Return ID" },
  return_reason: { ar: "سبب الإرجاع", en: "Return Reason" },
  product_image: { ar: "صورة المنتج", en: "Product Image" },
  invoice_image: { ar: "صورة الفاتورة", en: "Invoice Image" },
  delivery_note_image: { ar: "صورة إذن التسليم", en: "Livery Note Image" },
  return_recorded: { ar: "تم تسجيل المرتجع", en: "Return recorded" },

  add_damaged_return: { ar: "إضافة مرتجع تالف", en: "Add Damaged Return" },
  damaged_return_id: { ar: "رقم المرتجع التالف", en: "Damaged Return ID" },
  shipment_code: { ar: "كود الشحنة", en: "Shipment Code" },
  policy_image: { ar: "صورة بوليصة الشحن", en: "Shipping Slip Image" },
  policy_product_image: { ar: "صورة البوليصة مع المنتج", en: "Slip + Product Image" },
  damage_reason: { ar: "سبب التلف", en: "Damage Reason" },
  damage_details: { ar: "تفاصيل التلف", en: "Damage Details" },
  pending: { ar: "قيد المراجعة", en: "Pending" },
  accepted: { ar: "مقبول", en: "Accepted" },
  rejected: { ar: "مرفوض", en: "Rejected" },
  all_statuses: { ar: "كل الحالات", en: "All statuses" },
  damaged_recorded: { ar: "تم تسجيل المرتجع التالف", en: "Damaged return recorded" },
  damaged_no_stock_note: {
    ar: "المرتجعات التالفة لا تضاف إلى المخزون القابل للبيع.",
    en: "Damaged returns are not added back to sellable stock.",
  },

  test_connection: { ar: "اختبار الاتصال", en: "Test Connection" },
  connected: { ar: "متصل", en: "Connected" },
  connection_failed: { ar: "فشل الاتصال", en: "Connection Failed" },
  sheets_status: { ar: "حالة الجداول", en: "Sheets Status" },
  image_test: { ar: "اختبار الصور", en: "Image Connection Test" },
  system_health: { ar: "فحص حالة النظام", en: "System Health Check" },
  api_url: { ar: "رابط الـ API", en: "API URL" },
  spreadsheet: { ar: "الجدول", en: "Spreadsheet" },
  rows: { ar: "صفوف", en: "rows" },

  err_network: { ar: "تعذر الاتصال بالخادم. تحقق من الإنترنت.", en: "Cannot reach the server. Check your connection." },
  err_generic: { ar: "حدث خطأ غير متوقع. حاول مرة أخرى.", en: "Something went wrong. Please try again." },
  err_api: { ar: "رفض الخادم العملية.", en: "The server rejected the operation." },
  err_upload: { ar: "فشل رفع الصورة", en: "Image upload failed" },
  err_print: { ar: "تعذر فتح نافذة الطباعة", en: "Could not open the print window" },
  err_required: { ar: "يرجى ملء الحقول المطلوبة", en: "Please fill the required fields" },
  err_no_product: { ar: "لم يتم اختيار منتج", en: "No product selected" },
  saved: { ar: "تم الحفظ بنجاح", en: "Saved successfully" },
  deleted: { ar: "تم الحذف", en: "Deleted" },
  select_product: { ar: "اختر منتجاً", en: "Select a product" },
  select_warehouse: { ar: "اختر مخزناً", en: "Select a warehouse" },
  labels_qty: { ar: "عدد الملصقات", en: "Labels" },
  refresh: { ar: "تحديث", en: "Refresh" },
  add_stock: { ar: "إضافة كمية", en: "Add Stock" },
  stock_qty: { ar: "كمية المخزون", en: "Stock Quantity" },
  sold_qty: { ar: "الكمية المباعة", en: "Already Sold Quantity" },
  api_settings: { ar: "إعدادات الاتصال / API", en: "API / Connection Settings" },
  save_api_url: { ar: "حفظ الرابط", en: "Save URL" },
  reset_default: { ar: "استعادة الافتراضي", en: "Reset to default" },
  api_url_saved: { ar: "تم حفظ رابط الـ API", en: "API URL saved" },
  invalid_url: { ar: "رابط غير صالح", en: "Invalid URL" },
  label_size: { ar: "مقاس الملصق", en: "Label Size" },
  barcode_settings: { ar: "إعدادات الباركود", en: "Barcode Settings" },
  warehouse_management: { ar: "إدارة المخازن", en: "Warehouse Management" },
  manage_warehouses: { ar: "فتح صفحة المخازن", en: "Open Warehouses page" },
  product_details: { ar: "تفاصيل المنتج", en: "Product Details" },
  view_details: { ar: "عرض التفاصيل", en: "View Details" },
  not_connected: { ar: "غير متصل", en: "Not Connected" },
  total_remaining: { ar: "إجمالي المتبقي", en: "Total Remaining" },
  total_sold: { ar: "إجمالي المباع", en: "Total Sold" },
  total_stock_all: { ar: "إجمالي المخزون", en: "Total Stock" },
  return_value: { ar: "قيمة المرتجعات", en: "Return Value" },
  sold_qty_label: { ar: "الكمية المباعة", en: "Sold Quantity" },
  barcode_only_note: {
    ar: "الملصق يحتوي على الباركود فقط.",
    en: "The label contains the barcode only.",
  },
} as const;

export type TKey = keyof typeof dict;

interface Ctx {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (l: Lang) => void;
  t: (k: TKey) => string;
}

const LangContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("sodfa_lang") : null;
    if (stored === "ar" || stored === "en") setLangState(stored);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem("sodfa_lang", l);
    } catch {
      /* ignore */
    }
  }, []);

  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const t = useCallback((k: TKey) => dict[k][lang], [lang]);

  const value = useMemo(() => ({ lang, dir, setLang, t }) as Ctx, [lang, dir, setLang, t]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useI18n must be used inside LanguageProvider");
  return ctx;
}

/** Maps an ApiError code to a friendly localized message. */
export function errorMessage(e: unknown, lang: Lang): string {
  const raw = e instanceof Error ? e.message : "";
  if (raw === "NETWORK" || raw === "BAD_RESPONSE")
    return dict.err_network[lang];
  if (!raw) return dict.err_generic[lang];
  return `${dict.err_api[lang]} (${raw})`;
}