import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  Plus,
  Trash2,
  Minus,
  Search,
  Loader2,
  Download,
  RotateCcw,
  CheckCircle2,
  Eye,
  Pencil,
  X,
  CalendarDays,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { api, type Product } from "@/lib/api";
import { useCompany } from "@/lib/company";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/invoices")({
  component: InvoicesPage,
});

type InvoicePlatform = "Amazon" | "Noon" | "SODFA";

type InvoiceItem = {
  key: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  imageUrl?: string;
};

type InvoiceRecord = {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone: string | null;
  order_number: string | null;
  customer_address: string | null;
  platform: InvoicePlatform;
  invoice_date: string;
  total: number;
};

const today = () => new Date().toISOString().slice(0, 10);

const money = (value: number) =>
  new Intl.NumberFormat("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const makeKey = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function InvoicesPage() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { lang } = useI18n();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [platform, setPlatform] = useState<InvoicePlatform>("SODFA");
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);

  const [productSearch, setProductSearch] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"all" | InvoicePlatform>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editingInvoiceNumber, setEditingInvoiceNumber] = useState("");
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceRecord | null>(null);
  const [viewingItems, setViewingItems] = useState<InvoiceItem[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const rows = await api.inventory(selectedCompanyId);
      const unique = new Map<string, Product>();
      for (const row of rows) {
        if (!unique.has(row.product_id)) unique.set(row.product_id, row);
      }
      setProducts([...unique.values()]);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "تعذر تحميل المنتجات");
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadInvoices = async () => {
    setLoadingInvoices(true);
    const { data, error: queryError } = await supabase
      .from("invoices")
      .select(
        "id,invoice_number,customer_name,customer_phone,order_number,customer_address,platform,invoice_date,total",
      )
      .eq("business_id", selectedCompanyId)
      .order("invoice_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (queryError) {
      console.error(queryError);
      setError(queryError.message);
    } else {
      setInvoices((data ?? []) as InvoiceRecord[]);
    }
    setLoadingInvoices(false);
  };

  useEffect(() => {
    void loadProducts();
    void loadInvoices();
    resetForm(false);
  }, [selectedCompanyId]);

  const visibleProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 30);

    return products
      .filter((p) =>
        [p.product_name, p.name_ar, p.name_en, p.barcode, p.product_id]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 30);
  }, [products, productSearch]);

  const filteredInvoices = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesPlatform = platformFilter === "all" || invoice.platform === platformFilter;
      const matchesDate = !dateFilter || invoice.invoice_date === dateFilter;
      const haystack = [
        invoice.invoice_number,
        invoice.customer_name,
        invoice.customer_phone ?? "",
        invoice.order_number ?? "",
        invoice.invoice_date,
      ]
        .join(" ")
        .toLowerCase();
      return matchesPlatform && matchesDate && (!q || haystack.includes(q));
    });
  }, [invoices, invoiceSearch, platformFilter, dateFilter]);

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + Math.max(0, item.quantity) * Math.max(0, Number(item.unitPrice) || 0),
        0,
      ),
    [items],
  );

  const addProduct = (product: Product) => {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.product_id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.product_id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [
        ...current,
        {
          key: makeKey(),
          productId: product.product_id,
          productName:
            lang === "en"
              ? product.name_en || product.name_ar || product.product_name
              : product.name_ar || product.name_en || product.product_name,
          quantity: 1,
          unitPrice: String(product.selling_price ?? product.price ?? 0),
          imageUrl: product.primary_image_url || product.image_url || product.image_urls?.[0],
        },
      ];
    });
    setProductSearch("");
  };

  const updateItem = (key: string, patch: Partial<InvoiceItem>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const removeItem = (key: string) => setItems((current) => current.filter((item) => item.key !== key));

  function resetForm(clearMessages = true) {
    setCustomerName("");
    setCustomerPhone("");
    setOrderNumber("");
    setCustomerAddress("");
    setPlatform("SODFA");
    setInvoiceDate(today());
    setItems([]);
    setProductSearch("");
    setEditingInvoiceId(null);
    setEditingInvoiceNumber("");
    if (clearMessages) {
      setError("");
      setNotice("");
    }
  }

  const validate = () => {
    if (!customerName.trim()) return "اسم العميل مطلوب.";
    if (!items.length) return "أضف منتجًا واحدًا على الأقل.";
    if (
      items.some(
        (item) =>
          item.quantity <= 0 ||
          !Number.isFinite(Number(item.unitPrice)) ||
          Number(item.unitPrice) < 0,
      )
    ) {
      return "تحقق من الكمية وسعر كل منتج.";
    }
    if (total <= 0) return "إجمالي الفاتورة يجب أن يكون أكبر من صفر.";
    return "";
  };

  const saveInvoice = async () => {
    setError("");
    setNotice("");
    const validation = validate();
    if (validation) {
      setError(validation);
      return null;
    }

    setSaving(true);
    try {
      let invoice: InvoiceRecord;

      if (editingInvoiceId) {
        const { data, error: updateError } = await supabase
          .from("invoices")
          .update({
            customer_name: customerName.trim(),
            customer_phone: customerPhone.trim() || null,
            order_number: orderNumber.trim() || null,
            customer_address: customerAddress.trim() || null,
            platform,
            invoice_date: invoiceDate,
            total,
          })
          .eq("id", editingInvoiceId)
          .eq("business_id", selectedCompanyId)
          .select(
            "id,invoice_number,customer_name,customer_phone,order_number,customer_address,platform,invoice_date,total",
          )
          .single();

        if (updateError || !data) throw updateError ?? new Error("تعذر تعديل الفاتورة.");
        invoice = data as InvoiceRecord;

        const { error: deleteItemsError } = await supabase
          .from("invoice_items")
          .delete()
          .eq("invoice_id", invoice.id);
        if (deleteItemsError) throw deleteItemsError;
      } else {
        const { data, error: invoiceError } = await supabase
          .from("invoices")
          .insert({
            business_id: selectedCompanyId,
            customer_name: customerName.trim(),
            customer_phone: customerPhone.trim() || null,
            order_number: orderNumber.trim() || null,
            customer_address: customerAddress.trim() || null,
            platform,
            invoice_date: invoiceDate,
            total,
          })
          .select(
            "id,invoice_number,customer_name,customer_phone,order_number,customer_address,platform,invoice_date,total",
          )
          .single();

        if (invoiceError || !data) throw invoiceError ?? new Error("تعذر إنشاء الفاتورة.");
        invoice = data as InvoiceRecord;
      }

      const rows = items.map((item) => ({
        invoice_id: invoice.id,
        product_id: item.productId || null,
        product_name: item.productName.trim(),
        quantity: item.quantity,
        unit_price: Number(item.unitPrice),
        line_total: Math.max(0, item.quantity) * Math.max(0, Number(item.unitPrice) || 0),
      }));

      const { error: itemError } = await supabase.from("invoice_items").insert(rows);
      if (itemError) throw itemError;

      await loadInvoices();
      setNotice(
        editingInvoiceId
          ? `تم تعديل الفاتورة ${invoice.invoice_number} بنجاح.`
          : `تم إنشاء الفاتورة ${invoice.invoice_number} بنجاح.`,
      );
      setEditingInvoiceId(null);
      setEditingInvoiceNumber("");
      return invoice;
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "تعذر حفظ الفاتورة.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const loadInvoiceItems = async (invoiceId: string) => {
    const { data, error: queryError } = await supabase
      .from("invoice_items")
      .select("product_id,product_name,quantity,unit_price")
      .eq("invoice_id", invoiceId)
      .order("created_at");
    if (queryError) throw queryError;

    return (data ?? []).map((item, index) => {
      const product = products.find((p) => p.product_id === item.product_id);
      return {
        key: `${invoiceId}-${index}`,
        productId: item.product_id ?? "",
        productName: item.product_name,
        quantity: Number(item.quantity),
        unitPrice: String(item.unit_price),
        imageUrl: product?.primary_image_url || product?.image_url || product?.image_urls?.[0],
      } satisfies InvoiceItem;
    });
  };

  const openInvoice = async (invoice: InvoiceRecord) => {
    setViewLoading(true);
    setError("");
    try {
      const loaded = await loadInvoiceItems(invoice.id);
      setViewingItems(loaded);
      setViewingInvoice(invoice);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر فتح الفاتورة.");
    } finally {
      setViewLoading(false);
    }
  };

  const editInvoice = async (invoice: InvoiceRecord) => {
    setViewLoading(true);
    setError("");
    try {
      const loaded = await loadInvoiceItems(invoice.id);
      setCustomerName(invoice.customer_name);
      setCustomerPhone(invoice.customer_phone ?? "");
      setOrderNumber(invoice.order_number ?? "");
      setCustomerAddress(invoice.customer_address ?? "");
      setPlatform(invoice.platform);
      setInvoiceDate(invoice.invoice_date);
      setItems(loaded);
      setEditingInvoiceId(invoice.id);
      setEditingInvoiceNumber(invoice.invoice_number);
      setViewingInvoice(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل الفاتورة للتعديل.");
    } finally {
      setViewLoading(false);
    }
  };

  const deleteInvoice = async (invoice: InvoiceRecord) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الفاتورة ${invoice.invoice_number}؟\nسيتم حذف بنودها أيضًا ولا يمكن التراجع عن العملية.`,
    );
    if (!confirmed) return;

    setError("");
    setNotice("");
    const { error: deleteError } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoice.id)
      .eq("business_id", selectedCompanyId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setInvoices((current) => current.filter((x) => x.id !== invoice.id));
    if (editingInvoiceId === invoice.id) resetForm();
    if (viewingInvoice?.id === invoice.id) setViewingInvoice(null);
    setNotice(`تم حذف الفاتورة ${invoice.invoice_number}.`);
  };

  const buildPrintHtml = (invoice: InvoiceRecord, invoiceItems: InvoiceItem[]) => {
    const rows = invoiceItems
      .map(
        (item, index) => `
          <tr>
            <td class="num">${index + 1}</td>
            <td class="product">${escapeHtml(item.productName)}</td>
            <td class="center">${item.quantity}</td>
            <td class="money">${money(Number(item.unitPrice))} EGP</td>
            <td class="money">${money(item.quantity * Number(item.unitPrice))} EGP</td>
          </tr>`,
      )
      .join("");

    const customerRows = [
      ["اسم العميل", invoice.customer_name],
      invoice.customer_phone ? ["رقم الهاتف", invoice.customer_phone] : null,
      invoice.order_number ? ["رقم الطلب", invoice.order_number] : null,
      invoice.customer_address ? ["العنوان", invoice.customer_address] : null,
    ]
      .filter(Boolean)
      .map(
        (row) => `
          <div class="info-item">
            <span>${escapeHtml(row![0])}</span>
            <strong>${escapeHtml(row![1])}</strong>
          </div>`,
      )
      .join("");

    return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8" />
<title>${escapeHtml(invoice.invoice_number)} - ${escapeHtml(selectedCompany.name)}</title>
<style>
@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#e9e7ec;color:#18131b;font-family:"Cairo",Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{width:210mm;min-height:297mm;margin:0 auto;padding:17mm 16mm 14mm;background:white;position:relative;overflow:hidden}.top-glow{position:absolute;width:180mm;height:70mm;top:-38mm;left:-45mm;border-radius:50%;background:#823292;opacity:.1}.header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;position:relative}.brand{display:flex;align-items:center;gap:12px}.logo{width:52px;height:52px;border-radius:17px;background:linear-gradient(135deg,#823292,#a94fbc);color:white;display:grid;place-items:center;font-size:24px;font-weight:900;box-shadow:0 12px 28px rgba(130,50,146,.22)}.brand-ar{font-size:24px;font-weight:900;line-height:1}.brand-en{margin-top:5px;font-size:11px;letter-spacing:.35em;color:#823292;font-weight:800}.invoice-title{text-align:left;direction:ltr}.invoice-title h1{margin:0;font:800 31px Arial,sans-serif;letter-spacing:.04em}.invoice-title p{margin:7px 0 0;color:#6d6570;font-size:12px}.meta{margin-top:20px;padding:12px 16px;border:1px solid #e9e1eb;border-radius:15px;background:#fbf9fc;display:flex;justify-content:space-between;gap:12px}.meta span{display:block;color:#8b838f;font-size:10px;margin-bottom:4px}.meta strong{font-size:12px}.section-title{margin:22px 0 10px;font-size:12px;color:#823292;font-weight:800}.customer{display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;padding:13px 15px;border:1px solid #eee8f0;border-radius:15px}.info-item{display:flex;gap:10px;align-items:baseline;min-width:0}.info-item span{color:#938b96;font-size:10px;white-space:nowrap}.info-item strong{font-size:11px;overflow-wrap:anywhere}.table-wrap{margin-top:8px;border:1px solid #e8e2ea;border-radius:15px;overflow:hidden}table{width:100%;border-collapse:collapse;font-size:10px}thead{background:#231326;color:white}th{padding:10px 8px;font-weight:700}td{padding:10px 8px;border-bottom:1px solid #eee9ef}tbody tr:last-child td{border-bottom:0}.num{width:34px;text-align:center;color:#938b96}.product{font-weight:700}.center{text-align:center}.money{text-align:left;direction:ltr;white-space:nowrap}.summary{margin-top:15px;margin-right:auto;width:82mm;border:1px solid #e8e0ea;border-radius:16px;overflow:hidden}.summary-line{display:flex;justify-content:space-between;padding:10px 14px;font-size:11px}.summary-total{background:#823292;color:white;font-size:14px;font-weight:900}.footer{position:absolute;left:16mm;right:16mm;bottom:11mm;padding-top:10px;border-top:1px solid #eee8f0;display:flex;justify-content:space-between;gap:20px;color:#8d8590;font-size:9px}.footer b{color:#823292}@media print{body{background:white}.sheet{margin:0}}
</style></head><body><div class="sheet"><div class="top-glow"></div><div class="header"><div class="brand"><div class="logo">ص</div><div><div class="brand-ar">${escapeHtml(selectedCompany.name === "SODFA" ? "صدفة" : selectedCompany.name)}</div><div class="brand-en">${escapeHtml(selectedCompany.name)}</div></div></div><div class="invoice-title"><h1>INVOICE</h1><p>فاتورة مبيعات رسمية</p></div></div><div class="meta"><div><span>رقم الفاتورة</span><strong dir="ltr">${escapeHtml(invoice.invoice_number)}</strong></div><div><span>التاريخ</span><strong dir="ltr">${escapeHtml(invoice.invoice_date)}</strong></div><div><span>المنصة</span><strong>${escapeHtml(invoice.platform)}</strong></div></div><div class="section-title">بيانات العميل</div><div class="customer">${customerRows}</div><div class="section-title">تفاصيل الطلب</div><div class="table-wrap"><table><thead><tr><th>#</th><th>المنتج</th><th>الكمية</th><th>سعر القطعة</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table></div><div class="summary"><div class="summary-line"><span>عدد الأصناف</span><b>${invoiceItems.length}</b></div><div class="summary-line"><span>إجمالي الوحدات</span><b>${invoiceItems.reduce((s,x)=>s+x.quantity,0)}</b></div><div class="summary-line summary-total"><span>الإجمالي النهائي</span><span dir="ltr">${money(invoice.total)} EGP</span></div></div><div class="footer"><div><b>${escapeHtml(selectedCompany.name)}</b> · شكرًا لتعاملكم معنا</div><div>تم إصدار هذه الفاتورة إلكترونيًا</div></div></div><script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`;
  };

  const printInvoice = async (invoice: InvoiceRecord, invoiceItems: InvoiceItem[]) => {
    setPrinting(true);
    try {
      const popup = window.open("", "_blank", "width=980,height=900");
      if (!popup) {
        setError("المتصفح منع نافذة الفاتورة. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.");
        return;
      }
      popup.document.open();
      popup.document.write(buildPrintHtml(invoice, invoiceItems));
      popup.document.close();
      popup.focus();
    } finally {
      setPrinting(false);
    }
  };

  const printSavedInvoice = async (invoice: InvoiceRecord) => {
    try {
      const loaded = await loadInvoiceItems(invoice.id);
      await printInvoice(invoice, loaded);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تجهيز الفاتورة للطباعة.");
    }
  };

  const createAndPrint = async () => {
    const invoice = await saveInvoice();
    if (invoice) await printInvoice(invoice, items);
  };

  return (
    <AppShell title="إصدار الفواتير">
      <div className="mx-auto w-full max-w-[1500px] space-y-5 p-4 sm:p-6">
        <div className="overflow-hidden rounded-3xl border border-[#27272A] bg-[#111114] shadow-2xl">
          <div className="relative overflow-hidden border-b border-[#27272A] bg-gradient-to-l from-[#2A1530] via-[#161119] to-[#111114] px-5 py-6 sm:px-8">
            <div className="absolute -end-20 -top-28 h-64 w-64 rounded-full bg-[#823292]/20 blur-3xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#823292]/40 bg-[#823292]/10 px-3 py-1 text-xs font-bold text-[#D8A6E0]">
                  <FileText className="h-4 w-4" /> {selectedCompany.name}
                </div>
                <h2 className="text-2xl font-black text-white sm:text-3xl">
                  {editingInvoiceId ? `تعديل الفاتورة ${editingInvoiceNumber}` : "إصدار فاتورة جديدة"}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {editingInvoiceId ? "عدّل البيانات والبنود ثم احفظ التغييرات." : "أنشئ فاتورة مرتبة واحفظها ثم صدّرها مباشرة بصيغة PDF."}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-end">
                <div className="text-[11px] font-bold text-zinc-500">الإجمالي الحالي</div>
                <div className="mt-1 text-2xl font-black text-white" dir="ltr">{money(total)} <span className="text-sm text-[#D8A6E0]">EGP</span></div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.15fr] lg:p-7">
            <section className="space-y-4">
              <div className="rounded-2xl border border-[#27272A] bg-[#0D0D10] p-4">
                <h3 className="mb-4 text-base font-extrabold text-white">بيانات العميل</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="اسم العميل *" value={customerName} onChange={setCustomerName} placeholder="اكتب اسم العميل" />
                  <Field label="رقم الهاتف" value={customerPhone} onChange={setCustomerPhone} placeholder="01xxxxxxxxx" dir="ltr" />
                  <Field label="رقم الطلب" value={orderNumber} onChange={setOrderNumber} placeholder="اختياري" dir="ltr" />
                  <Field label="تاريخ الفاتورة" value={invoiceDate} onChange={setInvoiceDate} type="date" dir="ltr" />
                  <div className="sm:col-span-2"><Field label="عنوان العميل" value={customerAddress} onChange={setCustomerAddress} placeholder="العنوان بالتفصيل — اختياري" /></div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#27272A] bg-[#0D0D10] p-4">
                <h3 className="mb-3 text-base font-extrabold text-white">منصة البيع</h3>
                <div className="grid grid-cols-3 gap-2">
                  {(["Amazon", "Noon", "SODFA"] as InvoicePlatform[]).map((value) => (
                    <button key={value} type="button" onClick={() => setPlatform(value)} className={`rounded-xl border px-3 py-3 text-sm font-extrabold transition ${platform === value ? "border-[#A94FBC] bg-[#823292]/20 text-white shadow-[0_0_20px_rgba(130,50,146,.12)]" : "border-[#27272A] bg-[#111114] text-zinc-400 hover:border-[#4a3a4f] hover:text-white"}`} dir="ltr">{value}</button>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#27272A] bg-[#0D0D10] p-4">
              <div className="flex items-center justify-between gap-3">
                <div><h3 className="text-base font-extrabold text-white">تفاصيل الطلب</h3><p className="mt-1 text-xs text-zinc-500">ابحث عن المنتج وستظهر صورته وبياناته قبل إضافته.</p></div>
                <span className="rounded-lg bg-[#823292]/10 px-2.5 py-1 text-xs font-bold text-[#D8A6E0]">{items.length} صنف</span>
              </div>

              <div className="relative mt-4">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="ابحث عن المنتج بالاسم أو الباركود..." className="h-11 w-full rounded-xl border border-[#27272A] bg-[#111114] pe-3 ps-10 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#823292]" />
                {productSearch.trim() && <div className="absolute inset-x-0 top-12 z-30 max-h-96 overflow-y-auto rounded-xl border border-[#27272A] bg-[#111114] shadow-2xl">
                  {loadingProducts ? <div className="flex items-center justify-center gap-2 p-5 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> جاري تحميل المنتجات...</div> : visibleProducts.length ? visibleProducts.map((product) => (
                    <button key={product.product_id} type="button" onClick={() => addProduct(product)} className="flex w-full items-center gap-3 border-b border-[#27272A] px-3 py-3 text-start last:border-b-0 hover:bg-[#1A151C]">
                      <ProductThumb src={product.primary_image_url || product.image_url || product.image_urls?.[0]} name={product.name_ar || product.name_en || product.product_name} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-white">{product.name_ar || product.name_en || product.product_name}</div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500"><span>{product.barcode || product.product_id}</span><span>المخزون: {product.remaining_qty ?? 0}</span></div>
                      </div>
                      <div className="shrink-0 text-sm font-extrabold text-[#D8A6E0]" dir="ltr">{money(product.selling_price ?? product.price ?? 0)} EGP</div>
                    </button>
                  )) : <div className="p-5 text-center text-sm text-zinc-500">لا توجد منتجات مطابقة.</div>}
                </div>}
              </div>

              <div className="mt-4 space-y-2">
                {items.length === 0 ? <div className="rounded-2xl border border-dashed border-[#3b323e] p-8 text-center"><FileText className="mx-auto h-8 w-8 text-zinc-700" /><p className="mt-2 text-sm font-bold text-zinc-500">لم تتم إضافة منتجات بعد</p></div> : items.map((item, index) => (
                  <div key={item.key} className="rounded-xl border border-[#27272A] bg-[#111114] p-3">
                    <div className="flex items-start gap-3">
                      <ProductThumb src={item.imageUrl} name={item.productName} small />
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#823292]/10 text-xs font-black text-[#D8A6E0]">{index + 1}</div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white">{item.productName}</div>
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-[120px_1fr_auto]">
                          <div><label className="mb-1 block text-[10px] font-bold text-zinc-500">الكمية</label><div className="flex h-9 items-center rounded-lg border border-[#27272A] bg-[#0D0D10]"><button type="button" onClick={() => updateItem(item.key, { quantity: Math.max(1, item.quantity - 1) })} className="grid h-full w-9 place-items-center text-zinc-500 hover:text-white"><Minus className="h-3.5 w-3.5" /></button><input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(item.key, { quantity: Math.max(1, Number(e.target.value) || 1) })} className="min-w-0 flex-1 bg-transparent text-center text-sm font-bold text-white outline-none" /><button type="button" onClick={() => updateItem(item.key, { quantity: item.quantity + 1 })} className="grid h-full w-9 place-items-center text-zinc-500 hover:text-white"><Plus className="h-3.5 w-3.5" /></button></div></div>
                          <div><label className="mb-1 block text-[10px] font-bold text-zinc-500">سعر القطعة</label><input type="number" min={0} step="0.01" value={item.unitPrice} onChange={(e) => updateItem(item.key, { unitPrice: e.target.value })} className="h-9 w-full rounded-lg border border-[#27272A] bg-[#0D0D10] px-3 text-sm font-bold text-white outline-none focus:border-[#823292]" dir="ltr" /></div>
                          <div className="col-span-2 flex items-end justify-between gap-3 sm:col-span-1 sm:min-w-[130px] sm:justify-end"><div><div className="text-[10px] font-bold text-zinc-500">إجمالي السطر</div><div className="mt-1 text-sm font-black text-white" dir="ltr">{money(item.quantity * (Number(item.unitPrice) || 0))} EGP</div></div><button type="button" onClick={() => removeItem(item.key)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400" title="حذف المنتج"><Trash2 className="h-4 w-4" /></button></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-[#823292]/30 bg-gradient-to-l from-[#2A1530] to-[#151117] p-4"><div className="flex items-center justify-between"><span className="text-sm font-bold text-zinc-300">الإجمالي النهائي</span><span className="text-2xl font-black text-white" dir="ltr">{money(total)} <small className="text-xs text-[#D8A6E0]">EGP</small></span></div></div>
            </section>
          </div>

          {(error || notice) && <div className="px-5 pb-5 lg:px-7"><div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${error ? "border-red-500/20 bg-red-500/5 text-red-300" : "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"}`}>{error ? <span>⚠️</span> : <CheckCircle2 className="h-4 w-4" />}<span>{error || notice}</span></div></div>}

          <div className="flex flex-col-reverse gap-2 border-t border-[#27272A] bg-[#0D0D10] p-5 sm:flex-row sm:items-center sm:justify-between lg:px-7">
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => resetForm()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#27272A] px-5 text-sm font-bold text-zinc-400 hover:bg-[#17121A] hover:text-white"><RotateCcw className="h-4 w-4" /> {editingInvoiceId ? "إلغاء التعديل" : "تفريغ النموذج"}</button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" disabled={saving || printing} onClick={() => void saveInvoice()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#823292] px-5 text-sm font-extrabold text-white hover:bg-[#823292]/10 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{editingInvoiceId ? "حفظ التعديل" : "حفظ الفاتورة"}</button>
              {!editingInvoiceId && <button type="button" disabled={saving || printing} onClick={() => void createAndPrint()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#823292] px-6 text-sm font-extrabold text-white shadow-lg shadow-[#823292]/20 hover:bg-[#963AA8] disabled:opacity-50">{printing || saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} إنشاء PDF</button>}
              {editingInvoiceId && <button type="button" disabled={saving || printing} onClick={() => void saveInvoice().then((invoice) => invoice && printInvoice(invoice, items))} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#823292] px-6 text-sm font-extrabold text-white shadow-lg shadow-[#823292]/20 hover:bg-[#963AA8] disabled:opacity-50"><Download className="h-4 w-4" /> حفظ وPDF</button>}
            </div>
          </div>
        </div>

        <section className="rounded-3xl border border-[#27272A] bg-[#111114] p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div><h3 className="text-lg font-black text-white">الفواتير — {selectedCompany.name}</h3><p className="mt-1 text-xs text-zinc-500">ابحث برقم الفاتورة أو اسم العميل أو الهاتف أو التاريخ، ثم افتح الفاتورة لمراجعة محتواها.</p></div>
            <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[720px] xl:grid-cols-[1.5fr_150px_170px_auto]">
              <label className="relative block"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" /><input value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} placeholder="رقم الفاتورة / العميل / الهاتف / التاريخ" className="h-10 w-full rounded-xl border border-[#27272A] bg-[#0D0D10] pe-3 ps-10 text-sm text-white outline-none focus:border-[#823292]" /></label>
              <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value as "all" | InvoicePlatform)} className="h-10 rounded-xl border border-[#27272A] bg-[#0D0D10] px-3 text-sm text-white outline-none focus:border-[#823292]"><option value="all">كل المنصات</option><option value="Amazon">Amazon</option><option value="Noon">Noon</option><option value="SODFA">SODFA</option></select>
              <label className="relative"><CalendarDays className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" /><input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-10 w-full rounded-xl border border-[#27272A] bg-[#0D0D10] px-3 ps-10 text-sm text-white outline-none focus:border-[#823292]" /></label>
              <button type="button" onClick={() => { setInvoiceSearch(""); setDateFilter(""); setPlatformFilter("all"); void loadInvoices(); }} className="h-10 rounded-xl border border-[#27272A] px-3 text-xs font-bold text-zinc-400 hover:text-white">مسح الفلاتر</button>
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between text-xs text-zinc-500"><span>{loadingInvoices ? "جاري تحميل الفواتير..." : `${filteredInvoices.length} فاتورة`}</span><button type="button" onClick={() => void loadInvoices()} className="rounded-lg border border-[#27272A] px-3 py-1.5 font-bold hover:text-white">تحديث</button></div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-sm"><thead><tr className="border-b border-[#27272A] text-xs text-zinc-500"><th className="px-3 py-3 text-start">الفاتورة</th><th className="px-3 py-3 text-start">العميل</th><th className="px-3 py-3 text-start">الهاتف</th><th className="px-3 py-3 text-start">المنصة</th><th className="px-3 py-3 text-start">التاريخ</th><th className="px-3 py-3 text-end">الإجمالي</th><th className="px-3 py-3 text-end">إجراءات</th></tr></thead>
              <tbody>{filteredInvoices.map((invoice) => <tr key={invoice.id} className="border-b border-[#27272A]/70 last:border-0 hover:bg-[#151217]">
                <td className="px-3 py-3 font-bold text-[#D8A6E0]" dir="ltr">{invoice.invoice_number}</td>
                <td className="px-3 py-3 font-semibold text-white">{invoice.customer_name}</td>
                <td className="px-3 py-3 text-zinc-400" dir="ltr">{invoice.customer_phone || "—"}</td>
                <td className="px-3 py-3"><PlatformBadge platform={invoice.platform} /></td>
                <td className="px-3 py-3 text-zinc-400" dir="ltr">{invoice.invoice_date}</td>
                <td className="px-3 py-3 text-end font-black text-white" dir="ltr">{money(Number(invoice.total))} EGP</td>
                <td className="px-3 py-3 text-end"><div className="flex justify-end gap-1.5"><button type="button" onClick={() => void openInvoice(invoice)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#27272A] px-2.5 py-2 text-xs font-bold text-zinc-300 hover:border-[#823292] hover:text-white"><Eye className="h-3.5 w-3.5" /> فتح</button><button type="button" onClick={() => void editInvoice(invoice)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#27272A] px-2.5 py-2 text-xs font-bold text-zinc-300 hover:border-[#823292] hover:text-white"><Pencil className="h-3.5 w-3.5" /> تعديل</button><button type="button" onClick={() => void printSavedInvoice(invoice)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#27272A] px-2.5 py-2 text-xs font-bold text-zinc-300 hover:border-[#823292] hover:text-white"><Download className="h-3.5 w-3.5" /> PDF</button><button type="button" onClick={() => void deleteInvoice(invoice)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-2.5 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /> حذف</button></div></td>
              </tr>)}
              {!filteredInvoices.length && <tr><td colSpan={7} className="px-3 py-12 text-center text-sm text-zinc-600">{loadingInvoices ? "جاري التحميل..." : "لا توجد فواتير مطابقة للبحث أو الفلاتر الحالية."}</td></tr>}</tbody>
            </table>
          </div>
        </section>
      </div>

      {viewingInvoice && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setViewingInvoice(null); }}>
        <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[#3a303d] bg-[#111114] shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-[#27272A] px-5 py-4"><div><div className="flex items-center gap-2"><h3 className="text-lg font-black text-white">{viewingInvoice.invoice_number}</h3><PlatformBadge platform={viewingInvoice.platform} /></div><p className="mt-1 text-xs text-zinc-500">معاينة الفاتورة داخل النظام — {viewingInvoice.invoice_date}</p></div><button type="button" onClick={() => setViewingInvoice(null)} className="grid h-9 w-9 place-items-center rounded-xl border border-[#27272A] text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button></div>
          <div className="overflow-y-auto p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["العميل", viewingInvoice.customer_name], ["الهاتف", viewingInvoice.customer_phone || "—"], ["رقم الطلب", viewingInvoice.order_number || "—"], ["العنوان", viewingInvoice.customer_address || "—"]].map(([label,value]) => <div key={label} className="rounded-2xl border border-[#27272A] bg-[#0D0D10] p-3"><div className="text-[10px] font-bold text-zinc-500">{label}</div><div className="mt-1 break-words text-sm font-bold text-white">{value}</div></div>)}</div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-[#27272A]"><table className="w-full min-w-[650px]"><thead className="bg-[#1b1320] text-xs text-zinc-400"><tr><th className="px-3 py-3 text-start">المنتج</th><th className="px-3 py-3 text-center">الكمية</th><th className="px-3 py-3 text-end">سعر القطعة</th><th className="px-3 py-3 text-end">الإجمالي</th></tr></thead><tbody>{viewingItems.map((item) => <tr key={item.key} className="border-t border-[#27272A]"><td className="px-3 py-3"><div className="flex items-center gap-3"><ProductThumb src={item.imageUrl} name={item.productName} small /><span className="font-bold text-white">{item.productName}</span></div></td><td className="px-3 py-3 text-center text-zinc-300">{item.quantity}</td><td className="px-3 py-3 text-end text-zinc-300" dir="ltr">{money(Number(item.unitPrice))} EGP</td><td className="px-3 py-3 text-end font-black text-white" dir="ltr">{money(item.quantity * Number(item.unitPrice))} EGP</td></tr>)}</tbody></table></div>
            <div className="mt-4 flex justify-end"><div className="w-full max-w-sm rounded-2xl border border-[#823292]/30 bg-[#2A1530] p-4"><div className="flex justify-between text-sm text-zinc-400"><span>عدد الأصناف</span><span>{viewingItems.length}</span></div><div className="mt-2 flex justify-between text-sm text-zinc-400"><span>إجمالي الوحدات</span><span>{viewingItems.reduce((s,x)=>s+x.quantity,0)}</span></div><div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-lg font-black text-white"><span>الإجمالي</span><span dir="ltr">{money(Number(viewingInvoice.total))} EGP</span></div></div></div>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-[#27272A] bg-[#0D0D10] p-4 sm:flex-row sm:justify-end"><button type="button" onClick={() => void editInvoice(viewingInvoice)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#27272A] px-4 text-sm font-bold text-zinc-300 hover:text-white"><Pencil className="h-4 w-4" /> تعديل</button><button type="button" onClick={() => void printInvoice(viewingInvoice, viewingItems)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#823292] px-5 text-sm font-extrabold text-white"><Download className="h-4 w-4" /> PDF / طباعة</button></div>
        </div>
      </div>}

      {viewLoading && <div className="fixed inset-0 z-[110] grid place-items-center bg-black/30 backdrop-blur-[1px]"><div className="rounded-2xl border border-[#3a303d] bg-[#111114] px-5 py-4 text-sm font-bold text-white shadow-2xl"><Loader2 className="me-2 inline h-4 w-4 animate-spin" /> جاري تجهيز الفاتورة...</div></div>}
    </AppShell>
  );
}

function ProductThumb({ src, name, small = false }: { src?: string; name: string; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  const size = small ? "h-12 w-12" : "h-14 w-14";
  if (!src || failed) return <div className={`${size} shrink-0 overflow-hidden rounded-xl border border-[#27272A] bg-[#18151A] grid place-items-center text-[9px] font-black text-zinc-600`}>صورة</div>;
  return <img src={src} alt={name} onError={() => setFailed(true)} className={`${size} shrink-0 rounded-xl border border-[#27272A] bg-white object-contain p-1`} />;
}

function PlatformBadge({ platform }: { platform: InvoicePlatform }) {
  return <span className="inline-flex rounded-lg border border-[#823292]/30 bg-[#823292]/10 px-2 py-1 text-[11px] font-black text-[#D8A6E0]" dir="ltr">{platform}</span>;
}

function Field({ label, value, onChange, placeholder, type = "text", dir }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; dir?: "rtl" | "ltr" }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-zinc-500">{label}</span><input type={type} value={value} dir={dir} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-11 w-full rounded-xl border border-[#27272A] bg-[#111114] px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#823292]" /></label>;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
