import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Mic, Square } from "lucide-react";
import { searchCompanyInventory } from "@/lib/company-inventory-assistant.functions";
import { supabase } from "@/lib/supabase";

type Result = Awaited<ReturnType<typeof searchCompanyInventory>>;

type Recognition = {
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

function speechConstructor() {
  const browser = window as Window & {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

export function CompanyInventoryAssistant() {
  const [query, setQuery] = useState("");
  const [explain, setExplain] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const recognition = useRef<Recognition | null>(null);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");

  useEffect(() => {
    setVoiceAvailable(Boolean(speechConstructor()));
    return () => {
      const active = recognition.current;
      if (!active) return;
      active.onresult = active.onerror = active.onend = null;
      recognition.current = null;
      active.abort();
    };
  }, []);

  function toggleVoice() {
    if (recognition.current) {
      recognition.current.stop();
      return;
    }
    const SpeechRecognition = speechConstructor();
    if (!SpeechRecognition) return;
    const active = new SpeechRecognition();
    active.lang = "ar-EG";
    active.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript.trim().slice(0, 100);
      if (transcript) setQuery(transcript);
    };
    active.onerror = ({ error }) => {
      setVoiceMessage(
        error === "not-allowed" || error === "service-not-allowed"
          ? "اسمح للمتصفح باستخدام الميكروفون أو اكتب اسم المنتج."
          : "تعذّر تحويل الصوت لنص. جرّب تاني أو اكتب اسم المنتج.",
      );
    };
    active.onend = () => {
      recognition.current = null;
      setListening(false);
    };
    recognition.current = active;
    try {
      active.start();
      setVoiceMessage("");
      setListening(true);
    } catch {
      recognition.current = null;
      setVoiceMessage("الميكروفون مش متاح دلوقتي.");
    }
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || recognition.current || !query.trim()) return;
    setBusy(true);
    setError("");
    setResult(null);
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
          data: { token: session.access_token, query, explain },
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
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
          اسم المنتج
          <input
            className="rounded-lg border border-[#53505a] bg-[#0a0a0c] px-3 py-2"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={100}
            required
            disabled={busy}
          />
        </label>
        {voiceAvailable && (
          <button
            type="button"
            onClick={toggleVoice}
            aria-pressed={listening}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg border border-[#53505a] px-3 py-2 text-sm"
          >
            {listening ? <Square size={16} /> : <Mic size={16} />}
            {listening ? "إيقاف الاستماع" : "إملاء صوتي"}
          </button>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={explain}
            disabled={busy}
            onChange={(event) => setExplain(event.target.checked)}
          />
          اقتراح مراجعة بالذكاء الاصطناعي
        </label>
        <button
          className="rounded-lg bg-[#823292] px-4 py-2 text-sm font-bold disabled:opacity-50"
          disabled={busy || listening || !query.trim()}
        >
          {busy ? "جاري البحث…" : "بحث في المخزون"}
        </button>
      </form>
      {(listening || voiceMessage) && (
        <p className="mt-3 text-sm" role="status">
          {voiceMessage || "جاري الاستماع… قول اسم المنتج."}
        </p>
      )}
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
              <table className="w-full text-right">
                <caption className="pb-2 text-right text-zinc-400">
                  المصدر: مخزون مستودعات صدفة في Supabase
                </caption>
                <thead>
                  <tr>
                    <th scope="col">المنتج</th>
                    <th scope="col">المستودع</th>
                    <th scope="col">الرصيد</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.truncated && (
                <p className="mt-2">ظهرت أول ٢٥ نتيجة. اكتب اسمًا أدق لتضييق البحث.</p>
              )}
            </>
          )}
          {result.advice && <p className="mt-3 whitespace-pre-wrap">{result.advice}</p>}
          {result.ai === "unconfigured" && (
            <p className="mt-3">اقتراحات الذكاء الاصطناعي لسه مش متفعّلة.</p>
          )}
          {result.ai === "unavailable" && (
            <p className="mt-3">تعذّر توليد الاقتراح. نتائج المخزون متاحة فوق.</p>
          )}
        </div>
      )}
    </section>
  );
}
