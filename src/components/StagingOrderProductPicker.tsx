import { useState } from "react";
import { searchStagingOrderProducts } from "@/lib/company-orders-staging.functions";
import { supabase } from "@/lib/supabase";

type Product = Awaited<ReturnType<typeof searchStagingOrderProducts>>[number];

export function StagingOrderProductPicker({
  brand,
  name,
  onSelect,
}: {
  brand: "homey" | "sodfa";
  name: string;
  onSelect: (product: Product) => void;
}) {
  const [results, setResults] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function search() {
    setPending(true);
    setResults([]);
    setMessage("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("AUTH_REQUIRED");
      const products = await searchStagingOrderProducts({
        data: { token: session.access_token, brand, query: name },
      });
      setResults(products);
      if (!products.length) setMessage("مفيش صنف مطابق في كتالوج البراند.");
    } catch {
      setMessage("الكتالوج غير متاح. راجع صلاحية قراءة البراند أو كمّل بالصنف اليدوي.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="text-sm">
      <button
        type="button"
        disabled={pending || name.trim().length < 2}
        onClick={() => void search()}
      >
        {pending ? "جاري البحث…" : "مطابقة مع الكتالوج"}
      </button>
      {message && <p role="status">{message}</p>}
      {results.length > 0 && (
        <ul className="space-y-1">
          {results.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(product);
                  setResults([]);
                }}
              >
                اختيار {product.name} · {product.id}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
