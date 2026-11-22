import { useState, type FormEvent } from "react";
import { planInventory } from "@/lib/inventory-planning";

const fields = [
  ["available", "الرصيد الحالي (وحدة)"],
  ["incoming", "وحدات في الطريق"],
  ["committed", "وحدات محجوزة"],
  ["dailyDemand", "متوسط الطلب اليومي (وحدة)"],
  ["leadDays", "مدة التوريد (أيام)"],
  ["safetyStock", "مخزون الأمان (وحدة)"],
  ["reviewDays", "الفترة بين مراجعات المخزون (أيام)"],
] as const;

export function InventoryReorderPlanner({
  stock,
}: {
  stock?: { name: string; warehouse: string; available: number | null } | null;
}) {
  const [plan, setPlan] = useState<ReturnType<typeof planInventory> | null>(null);
  const [error, setError] = useState(false);

  function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const read = (key: string) => Number(values.get(key));
    try {
      setPlan(
        planInventory({
          available: read("available"),
          incoming: read("incoming"),
          committed: read("committed"),
          dailyDemand: read("dailyDemand"),
          leadDays: read("leadDays"),
          safetyStock: read("safetyStock"),
          reviewDays: read("reviewDays"),
        }),
      );
      setError(false);
    } catch {
      setPlan(null);
      setError(true);
    }
  }

  return (
    <form
      onSubmit={calculate}
      onChange={() => {
        setPlan(null);
        setError(false);
      }}
      className="mt-3"
    >
      <p className="mb-3 text-sm text-zinc-300">
        احسب نقطة إعادة الطلب والكمية المقترحة لصنف في مستودع واحد، بافتراض ثبات متوسط الطلب ومدة
        التوريد.
      </p>
      {stock && (
        <p className="mb-3 text-sm text-purple-100">
          {stock.name} · {stock.warehouse} ·{" "}
          {stock.available === null
            ? "الرصيد غير معروف، أدخله بعد التحقق."
            : `رصيد نتيجة البحث ${stock.available} وحدة.`}
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(([name, label]) => (
          <label key={name} className="flex flex-col gap-1 text-sm">
            {label}
            <input
              className="rounded-lg border border-[#53505a] bg-[#0a0a0c] px-3 py-2"
              name={name}
              defaultValue={
                name === "available"
                  ? (stock?.available ?? undefined)
                  : name === "incoming" || name === "committed" || name === "safetyStock"
                    ? 0
                    : name === "reviewDays"
                      ? 7
                      : undefined
              }
              type="number"
              min={name === "reviewDays" ? 1 : 0}
              max={1_000_000}
              step={name === "dailyDemand" ? "any" : 1}
              required
            />
          </label>
        ))}
      </div>
      <button className="mt-3 rounded-lg bg-[#823292] px-4 py-2 text-sm font-bold">
        احسب اقتراح إعادة الطلب
      </button>
      {error && <p role="alert">راجع الأرقام وحاول تاني.</p>}
      {plan && (
        <div className="mt-3 text-sm" role="status">
          <p>
            صافي وضع المخزون {plan.position} وحدة. نقطة إعادة الطلب {plan.reorderPoint} وحدة. الرصيد
            المستهدف {plan.target} وحدة.
          </p>
          <p className="mt-1 font-bold">
            {plan.quantity
              ? `اطلب ${plan.quantity} وحدة للوصول للرصيد المستهدف.`
              : "القرار الحالي: لا تطلب وحدات إضافية."}
          </p>
        </div>
      )}
    </form>
  );
}
