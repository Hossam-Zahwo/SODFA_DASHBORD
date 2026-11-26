import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { getCompanyWorkspaceData } from "@/lib/company-workspace.functions";
import { runCompanyReview } from "@/lib/company-review";
import type { CompanyProject } from "@/lib/company-navigation";
import { supabase } from "@/lib/supabase";

type Report = Awaited<ReturnType<typeof runCompanyReview>>;

export function CompanyReview({ project }: { project: CompanyProject }) {
  const [report, setReport] = useState<Report | null>(null);
  const [started, setStarted] = useState(0);
  const [checkedAt, setCheckedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!started) return;
    let active = true;

    async function review() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("UNAUTHORIZED");
        const snapshot = await getCompanyWorkspaceData({
          data: { token: session.access_token, project },
        });
        const next = await runCompanyReview(snapshot, project);
        if (active) {
          setReport(next);
          setCheckedAt(
            new Intl.DateTimeFormat("ar-EG", {
              timeZone: "Africa/Cairo",
              dateStyle: "short",
              timeStyle: "short",
            }).format(new Date(snapshot.fetchedAt)),
          );
        }
      } catch {
        if (active) setError("تعذر تشغيل المراجعة. اتأكد من صلاحية حسابك وحاول تاني.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void review();
    return () => {
      active = false;
    };
  }, [project, started]);

  const attention = report?.filter((item) => item.level === "attention").length ?? 0;
  const unavailable = report?.filter((item) => item.level === "unavailable").length ?? 0;

  return (
    <section
      aria-label="مراجعة التشغيل"
      className="rounded-2xl border border-[#27272a] bg-[#111114] p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">فريق مراجعة التشغيل</h2>
          <p className="mt-1 text-sm text-zinc-300">
            المراجعون يفحصون الأرقام والمصادر والطلبات والكتالوج المتاح للمشروع. النتائج للقراءة.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setError("");
            setLoading(true);
            setStarted((value) => value + 1);
          }}
          className="min-h-11 rounded-lg bg-[#823292] px-4 text-sm font-bold disabled:opacity-60"
        >
          {loading ? "جاري المراجعة…" : report ? "إعادة المراجعة" : "شغّل المراجعين"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-rose-200">
          {error}
        </p>
      )}
      {report && (
        <>
          <div className="my-4 rounded-xl bg-[#211926] p-3" role="status">
            <h3 className="font-bold">ملخص المنسّق</h3>
            <p className="text-sm">
              {attention} بنود تحتاج متابعة · {unavailable} نتائج غير متاحة
            </p>
            <p className="mt-1 text-xs text-zinc-300">آخر قراءة · {checkedAt} بتوقيت القاهرة</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {report.map((item) => (
              <li key={item.role + item.section} className="rounded-xl border border-white/10 p-3">
                <h3 className="font-semibold">{item.role}</h3>
                <p className="my-2 text-sm text-zinc-200">
                  {item.label}
                  {item.count !== undefined && <> · {item.count}</>}
                </p>
                <Link
                  to="/control-center"
                  search={{
                    project,
                    section: item.section,
                    ...(item.queue ? { queue: item.queue } : {}),
                  }}
                  className="inline-flex min-h-10 items-center text-sm font-semibold text-purple-200 underline"
                >
                  فتح المصدر
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
