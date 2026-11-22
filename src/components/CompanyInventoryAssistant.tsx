import { useRef, useState, type FormEvent } from "react";
import { Bot } from "lucide-react";
import { searchCompanyInventory } from "@/lib/company-inventory-assistant.functions";
import { supabase } from "@/lib/supabase";

import { VoiceInput } from "./VoiceInput";
import { InventoryReorderPlanner } from "./InventoryReorderPlanner";
import { inventoryVoiceCommand } from "@/lib/inventory-planning";

type Result = Awaited<ReturnType<typeof searchCompanyInventory>>;

export function CompanyInventoryAssistant() {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const [voiceMessage, setVoiceMessage] = useState("");
  const plannerSection = useRef<HTMLDivElement>(null);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Result["rows"][number] | null>(null);

  function handleVoice(transcript: string) {
    const command = inventoryVoiceCommand(transcript);
    if (command.action === "plan") {
      setPlannerOpen(true);
      setVoiceMessage("اتفتحت خطة إعادة الطلب.");
      plannerSection.current?.scrollIntoView({ block: "start" });
    } else if (command.action === "clear") {
      setQuery("");
      setResult(null);
      setSelectedStock(null);
      setError("");
      setVoiceMessage("اتمسح البحث.");
    } else if (command.action === "order") {
      window.location.assign("/control-center-orders");
    } else if (command.query) {
      setQuery(command.query);
      setResult(null);
      setSelectedStock(null);
      setError("");
      setVoiceMessage("راجع اسم المنتج واضغط بحث.");
    }
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !query.trim()) return;
    setBusy(true);
    setError("");
    setResult(null);
    setSelectedStock(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("سجّل دخولك بحساب صدفة أولاً.");
        return;
      }
      setResult(
        await searchCompanyInventory({
          data: { token: session.access_token, query, explain: false },
        }),
      );
    } catch {
      setError("تعذّر البحث. تأكد من صلاحية قراءة مخزون صدفة ثم أعد المحاولة.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-4 rounded-2xl border border-[#27272a] bg-[#111114] p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Bot size={20} /> مساعد مخزون صدفة
      </h2>
      <form className="mt-3 flex flex-wrap items-center gap-3" onSubmit={search}>
        <div className="min-w-0 flex-1">
          <label htmlFor="inventory-query" className="block text-sm">
            اسم المنتج
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              id="inventory-query"
              className="min-w-0 flex-1 rounded-lg border border-[#53505a] bg-[#0a0a0c] px-3 py-2"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={100}
              required
              disabled={busy}
            />
            <VoiceInput
              compact
              onTranscript={handleVoice}
              disabled={busy}
              prompt="قول اسم المنتج أو أمر البحث."
            />
          </div>
        </div>
        <button
          className="rounded-lg bg-[#823292] px-4 py-2 text-sm font-bold disabled:opacity-50"
          disabled={busy || !query.trim()}
        >
          {busy ? "جاري البحث…" : "بحث في المخزون"}
        </button>
      </form>
      {voiceMessage && <p role="status">{voiceMessage}</p>}
      {error && (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="mt-4 text-sm" role="status">
          {result.state === "no_warehouses" ? (
            <p>مفيش مستودعات صدفة متاحة لحسابك.</p>
          ) : !result.rows.length ? (
            <p>مفيش نتائج مطابقة في مستودعات صدفة المتاحة لحسابك.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-80 text-right">
                  <caption className="pb-2 text-right text-zinc-400">
                    المصدر: مخزون مستودعات صدفة في Supabase
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">المنتج</th>
                      <th scope="col">المستودع</th>
                      <th scope="col">الرصيد</th>
                      <th scope="col">قرار المخزون</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, index) => (
                      <tr
                        key={`${row.id}-${row.warehouse}-${index}`}
                        className="border-t border-[#27272a]"
                      >
                        <td className="py-2">{row.name}</td>
                        <td>{row.warehouse}</td>
                        <td>{row.available ?? "غير معروف"}</td>
                        <td>
                          <button
                            type="button"
                            className="rounded border border-purple-400/50 px-2 py-1 text-purple-100"
                            onClick={() => {
                              setSelectedStock(row);
                              setPlannerOpen(true);
                              plannerSection.current?.scrollIntoView({ block: "start" });
                            }}
                          >
                            احسب إعادة الطلب
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.truncated && (
                <p className="mt-2">ظهرت أول ٢٥ نتيجة. اكتب اسمًا أدق لتضييق البحث.</p>
              )}
            </>
          )}
        </div>
      )}
      <div ref={plannerSection} className="mt-4 scroll-mt-20 border-t border-[#27272a] pt-4">
        <button
          type="button"
          aria-expanded={plannerOpen}
          onClick={() => setPlannerOpen(!plannerOpen)}
          className="text-sm font-bold text-purple-200"
        >
          بحوث العمليات · قرار إعادة الطلب
        </button>
        {plannerOpen && (
          <InventoryReorderPlanner
            key={
              selectedStock
                ? JSON.stringify([
                    selectedStock.id,
                    selectedStock.warehouse,
                    selectedStock.available,
                  ])
                : "manual"
            }
            stock={selectedStock}
          />
        )}
      </div>
    </section>
  );
}
