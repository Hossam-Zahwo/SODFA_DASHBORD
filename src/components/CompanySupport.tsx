import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import type { CompanyProject, CompanySection } from "@/lib/company-navigation";
import {
  listSupportRequests,
  respondToSupportRequest,
  reviewSupportRequest,
  submitSupportRequest,
  type SupportRequest,
} from "@/lib/company-support.functions";
import { supabase } from "@/lib/supabase";

const button =
  "inline-flex min-h-11 items-center rounded-lg border border-purple-300/40 px-3 text-sm font-semibold disabled:opacity-60";
const input = "mt-1 w-full rounded-lg border border-white/20 bg-[#161419] p-3 text-base";
const date = new Intl.DateTimeFormat("ar-EG", {
  timeZone: "Africa/Cairo",
  dateStyle: "short",
  timeStyle: "short",
});

async function sessionToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("UNAUTHORIZED");
  return session.access_token;
}

export function CompanySupport({
  project,
  section,
}: {
  project: CompanyProject;
  section: CompanySection;
}) {
  const [open, setOpen] = useState(false);
  const [team, setTeam] = useState(false);
  const [teamAvailable, setTeamAvailable] = useState(false);
  const [requests, setRequests] = useState<SupportRequest[] | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const requestId = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    let fetching = false;
    async function refresh() {
      if (fetching || document.hidden) return;
      fetching = true;
      try {
        const result = await listSupportRequests({
          data: { token: await sessionToken(), project, team },
        });
        if (active) {
          setRequests(result.requests);
          setTeamAvailable(result.teamAvailable);
        }
      } catch {
        if (active) setError("تعذر تحميل سجل المساعدة. اضغط تحديث للمحاولة تاني.");
      } finally {
        fetching = false;
      }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 20000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [open, project, team, revision]);

  async function review(id: string, token: string) {
    await reviewSupportRequest({ data: { id, token, project } });
    setNotice("تم حفظ نتيجة فحص بيانات المشروع في الطلب.");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (description.trim().length < 10 || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    const id = requestId.current ?? crypto.randomUUID();
    requestId.current = id;
    try {
      const token = await sessionToken();
      await submitSupportRequest({ data: { id, token, project, section, description } });
      requestId.current = null;
      setDescription("");
      setNotice("اتسجل الطلب. جاري فحص بيانات المشروع…");
      setRevision((value) => value + 1);
      try {
        await review(id, token);
      } catch {
        setNotice("الطلب محفوظ. تقدر تعيد الفحص من سجل الطلبات.");
      }
    } catch {
      setError("تعذر تأكيد حفظ الطلب. حاول تاني بنفس الوصف.");
    } finally {
      setBusy(false);
      setRevision((value) => value + 1);
    }
  }

  async function retry(id: string) {
    setBusy(true);
    setError("");
    try {
      await review(id, await sessionToken());
    } catch {
      setError("تعذر إجراء الفحص. الطلب لسه محفوظ.");
    } finally {
      setBusy(false);
      setRevision((value) => value + 1);
    }
  }

  async function reply(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const response = String(new FormData(form).get("response") ?? "").trim();
    if (response.length < 10 || busy) return;
    setBusy(true);
    setError("");
    try {
      await respondToSupportRequest({
        data: { id, token: await sessionToken(), project, response },
      });
      form.reset();
      setNotice("تم حفظ الرد، وهيظهر لصاحب الطلب.");
      setRevision((value) => value + 1);
    } catch {
      setError("تعذر حفظ الرد. حاول تاني.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-5" aria-label="مساعدة المشروع">
      <button
        type="button"
        className={button + " bg-[#211926]"}
        aria-expanded={open}
        aria-controls="company-support-panel"
        onClick={() => setOpen(!open)}
      >
        {open ? "إغلاق المساعدة" : "اطلب مساعدة"}
      </button>
      {open && (
        <div
          id="company-support-panel"
          className="mt-2 rounded-2xl border border-white/10 bg-[#111114] p-4"
        >
          {!team && (
            <form onSubmit={(event) => void submit(event)} className="mb-4">
              <label className="block text-sm font-semibold">
                إيه اللي حصل على الشاشة دي؟
                <textarea
                  className={input}
                  value={description}
                  rows={3}
                  minLength={10}
                  maxLength={2000}
                  required
                  disabled={busy}
                  onChange={(event) => {
                    requestId.current = null;
                    setDescription(event.target.value);
                  }}
                />
              </label>
              <p className="my-2 text-xs text-zinc-300">
                المشروع والقسم بيتسجلوا تلقائيًا. سيب بيانات العملاء وكلمات السر خارج الوصف.
              </p>
              <button
                className={button + " bg-[#823292]"}
                disabled={busy || description.trim().length < 10}
              >
                سجّل الطلب
              </button>
            </form>
          )}
          {notice && (
            <p className="mb-3 text-sm text-purple-200" role="status">
              {notice}
            </p>
          )}
          {error && (
            <p className="mb-3 text-sm text-rose-200" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex-1 font-bold">
              {team ? "طلبات الفريق في المشروع" : "طلباتي في المشروع"}
            </h2>
            <button
              type="button"
              className={button}
              onClick={() => {
                setError("");
                setRevision((value) => value + 1);
              }}
            >
              تحديث
            </button>
            {teamAvailable && (
              <button
                type="button"
                className={button}
                onClick={() => {
                  setRequests(null);
                  setNotice("");
                  setError("");
                  setTeam(!team);
                }}
              >
                {team ? "طلباتي" : "طلبات الفريق"}
              </button>
            )}
          </div>
          {requests === null && !error && (
            <p className="mt-2 text-sm text-zinc-300">جاري تحميل الطلبات…</p>
          )}
          {requests?.length === 0 && (
            <p className="mt-2 text-sm text-zinc-300">مفيش طلبات مسجلة هنا.</p>
          )}
          <ul className="mt-3 space-y-2">
            {requests?.map((request) => (
              <li key={request.id} className="rounded-lg border border-white/10 p-3">
                <details>
                  <summary className="cursor-pointer break-words text-sm font-bold">
                    {request.description.length > 100
                      ? request.description.slice(0, 100) + "…"
                      : request.description}
                    <span className="mt-1 block text-xs font-normal text-purple-200">
                      {request.response
                        ? "رد الفريق وصل"
                        : request.reviewed_at
                          ? "الفحص الأولي جاهز · بانتظار رد الفريق"
                          : "مسجّل · الفحص الأولي لم يكتمل"}
                      {" · "}
                      {date.format(new Date(request.created_at))}
                    </span>
                  </summary>
                  <p className="my-2 whitespace-pre-wrap break-words text-sm">
                    {request.description}
                  </p>
                  <Link
                    to="/control-center"
                    search={{ project, section: request.section }}
                    className="inline-flex min-h-10 items-center text-sm text-purple-200 underline"
                  >
                    افتح القسم الأصلي
                  </Link>
                  {request.report && (
                    <ul className="my-2 list-inside list-disc space-y-1 text-sm text-zinc-300">
                      {request.report.map((finding) => (
                        <li key={finding.role + finding.section}>
                          {finding.role} — {finding.label}
                          {finding.count !== undefined && <> · {finding.count}</>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!request.reviewed_at && !team && (
                    <button
                      type="button"
                      className={button}
                      disabled={busy}
                      onClick={() => void retry(request.id)}
                    >
                      شغّل الفحص الأولي
                    </button>
                  )}
                  {request.response && (
                    <p className="my-2 whitespace-pre-wrap break-words rounded-lg bg-[#211926] p-3 text-sm">
                      {request.response}
                    </p>
                  )}
                  {team && (
                    <form onSubmit={(event) => void reply(event, request.id)} className="mt-2">
                      <label className="block text-sm">
                        رد الفريق
                        <textarea
                          name="response"
                          className={input}
                          rows={2}
                          minLength={10}
                          maxLength={2000}
                          defaultValue={request.response ?? ""}
                          required
                        />
                      </label>
                      <button className={button} disabled={busy}>
                        احفظ الرد
                      </button>
                    </form>
                  )}
                </details>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
