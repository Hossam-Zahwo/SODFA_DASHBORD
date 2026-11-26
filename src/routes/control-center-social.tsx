import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { getCompanySocialStatus } from "@/lib/company-social-status.functions";

export const Route = createFileRoute("/control-center-social")({ component: SocialChannels });
type State = Awaited<ReturnType<typeof getCompanySocialStatus>>;
const panel = { background: "#111114", border: "1px solid #36303d", borderRadius: 14, padding: 18 } as const;

function SocialChannels() {
  const [brand, setBrand] = useState<"homey" | "sodfa">("homey");
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setState(null);
    setError("");
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("سجل دخولك لعرض قنوات المشروع");
        const next = await getCompanySocialStatus({ data: { token: session.access_token, brand } });
        if (active) setState(next);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "تعذر التحقق من حالة الربط");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [brand]);

  return <AppShell title="فيسبوك وإنستجرام">
    <div dir="rtl" style={{ padding: "12px 0 50px", color: "#fafafa", fontFamily: "Cairo, sans-serif", display: "grid", gap: 16 }}>
      <Link to="/control-center" style={{ color: "#dda9f4", fontSize: 13 }}>الرجوع إلى مركز التحكم</Link>
      <h1 style={{ fontSize: 25, fontWeight: 800 }}>القنوات الاجتماعية للشركة</h1>
      <p style={{ color: "#b5b2b8", fontSize: 13 }}>حالة Facebook وInstagram لكل مشروع على حدة. ظهور الحساب في Metricool لا يعني تفعيل صلاحيات النشر أو الرسائل في Meta.</p>
      <label style={{ display: "grid", gap: 6, maxWidth: 260 }}>المشروع
        <select aria-label="المشروع" value={brand} onChange={e => setBrand(e.target.value as "homey" | "sodfa")} style={{ padding: 12, borderRadius: 9, color: "white", background: "#222", border: "1px solid #705279" }}>
          <option value="homey">هومي</option><option value="sodfa">صدفة</option>
        </select>
      </label>
      {loading && <div role="status" style={panel}>جاري التحقق من القنوات...</div>}
      {error && <div role="alert" style={panel}>{error}</div>}
      {!loading && !error && state && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 12 }}>
        {(["facebook","instagram"] as const).map(platform => {
          const account = state.accounts.find(a => a.platform === platform);
          return <section key={platform} style={panel}>
            <h2 style={{ fontWeight: 800, marginBottom: 10 }}>{platform === "facebook" ? "Facebook" : "Instagram"}</h2>
            <p style={{ fontSize: 13 }}>{account?.handle ?? "الحساب غير مربوط في قاعدة CRM"}</p>
            <p style={{ color: "#b4b4bd", fontSize: 12, marginTop: 8 }}>حالة المصدر: {account?.connectionState ?? "غير مُهيأ"}</p>
            <p style={{ color: "#b4b4bd", fontSize: 12, marginTop: 8 }}>تحليلات API: {account?.canReadMetrics ? "متحقق" : "غير متحقق"}</p>
            <p style={{ color: "#b4b4bd", fontSize: 12, marginTop: 8 }}>نشر API: {account?.canPublish ? "مسموح" : "غير مفعّل"}</p>
          </section>;
        })}
      </div>}
    </div>
  </AppShell>;
}
