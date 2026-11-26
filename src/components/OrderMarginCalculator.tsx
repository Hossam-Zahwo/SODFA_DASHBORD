import { useState, type FormEvent } from "react";
import { calculateOrderMargin } from "@/lib/order-margin";

const fields = [
  "قيمة المنتجات بعد الخصومات والمرتجعات",
  "الشحن المحصّل من العميل بعد أي رد",
  "تكلفة البضاعة الفعلية بعد المرتجعات",
  "تكلفة الشحن والمرتجع على الشركة",
  "مصروفات مباشرة أخرى",
] as const;

export function OrderMarginCalculator() {
  const [result, setResult] = useState<ReturnType<typeof calculateOrderMargin> | null>(null);
  const [error, setError] = useState(false);
  const money = new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" });

  function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const amount = (index: number) => Number(values.get(String(index)));
    try {
      setResult(calculateOrderMargin(amount(0), amount(1), amount(2), amount(3), amount(4)));
      setError(false);
    } catch {
      setResult(null);
      setError(true);
    }
  }

  return (
    <form
      onSubmit={calculate}
      onChange={() => {
        setResult(null);
        setError(false);
      }}
      className="mt-4 rounded-xl border border-zinc-700 p-4"
    >
      <h3 className="font-bold">حاسبة هامش الطلب</h3>
      <p className="mb-3 text-sm text-zinc-300">
        أدخل القيم الفعلية بالجنيه المصري. النسبة تُحسب من الإيراد المحصّل للطلب.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((label, index) => (
          <label key={label} className="flex flex-col gap-1 text-sm">
            {label}
            <input
              className="rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2"
              name={String(index)}
              type="number"
              min={0}
              max={1_000_000_000}
              step=".01"
              required
            />
          </label>
        ))}
      </div>
      <button className="mt-3 rounded-lg bg-[#823292] px-4 py-2 font-bold">احسب الهامش</button>
      {error && <p role="alert">راجع المبالغ المدخلة.</p>}
      {result && (
        <p className="mt-3" role="status">
          المبلغ بعد التكاليف المباشرة {money.format(result.contribution)}. نسبة الهامش{" "}
          {result.rate === null ? "غير متاحة عند صفر إيراد" : `${result.rate.toFixed(2)}٪`}.
        </p>
      )}
    </form>
  );
}
