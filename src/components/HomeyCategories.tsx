import { useEffect, useState } from "react";
import { getHomeyCategories } from "@/lib/homey-categories.functions";
import { supabase } from "@/lib/supabase";

type Catalog = Awaited<ReturnType<typeof getHomeyCategories>>;

export function HomeyCategories() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("UNAUTHORIZED");
        const snapshot = await getHomeyCategories({ data: { token: session.access_token } });
        if (active) setCatalog(snapshot);
      } catch {
        if (active) setError(true);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [attempt]);

  return (
    <section
      className="rounded-2xl border border-[#27272a] bg-[#111114] p-4 sm:p-5"
      aria-label="أقسام متجر هومي"
    >
      <h2 className="text-lg font-bold">أقسام متجر هومي</h2>
      {error && (
        <div role="alert" className="mt-3">
          تعذر تحميل نسخة كتالوج هومي.
          <button
            type="button"
            className="mx-2 rounded-lg border border-purple-300/40 px-3 py-2"
            onClick={() => {
              setError(false);
              setAttempt((value) => value + 1);
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      )}
      {!catalog && !error && (
        <p role="status" className="mt-3 text-zinc-300">
          جاري تحميل الأقسام…
        </p>
      )}
      {catalog && (
        <>
          <p className="my-3 text-sm text-zinc-300">
            نسخة الكتالوج العامة بتاريخ{" "}
            {new Date(catalog.snapshotAt).toLocaleDateString("ar-EG", { timeZone: "Africa/Cairo" })}
          </p>
          {catalog.categories.length === 0 && <p>مفيش أقسام منشورة في النسخة دي.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {catalog.categories.map((category) => (
              <details
                key={category.id}
                className="min-w-0 rounded-xl border border-[#27272a] bg-[#161419]"
              >
                <summary className="cursor-pointer p-4 font-semibold">
                  {category.name}{" "}
                  <span className="mx-1 text-sm font-normal text-zinc-300">
                    ({category.products.length} منتج)
                  </span>
                </summary>
                {category.products.length ? (
                  <ul className="max-h-72 space-y-1 overflow-y-auto px-4 pb-4">
                    {category.products.map((product) => (
                      <li key={product.id} className="border-t border-white/10 py-2">
                        {product.title}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 pb-4 text-zinc-300">مفيش منتجات منشورة في القسم.</p>
                )}
              </details>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
