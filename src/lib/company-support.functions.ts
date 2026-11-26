import { createServerFn } from "@tanstack/react-start";
import { neon } from "@neondatabase/serverless";
import { z } from "zod";
import { requireCompanyAccess } from "./company-access.server";
import { companySections, projects, sections } from "./company-navigation";
import { runCompanyReview } from "./company-review";
import { readSupportWorkspace } from "./company-workspace.functions";

const scope = z.object({
  token: z.string().min(16).max(8192),
  project: z.enum(projects),
});
const requestKey = scope.extend({ id: z.uuid() });
const description = z.string().trim().min(10).max(2000);

function supportDb() {
  const url = process.env["CRM_DRAFT_WRITE_URL"];
  if (!url) throw new Error("SUPPORT_NOT_CONFIGURED");
  return neon(url, { fetchOptions: { signal: AbortSignal.timeout(8000) } });
}

type Report = Awaited<ReturnType<typeof runCompanyReview>>;
export type SupportRequest = {
  id: string;
  section: (typeof sections)[number];
  description: string;
  created_at: string;
  report: Report | null;
  reviewed_at: string | null;
  response: string | null;
};

export const listSupportRequests = createServerFn({ method: "POST" })
  .validator(scope.extend({ team: z.boolean().default(false) }))
  .handler(async ({ data }) => {
    const access = await requireCompanyAccess(
      data.token,
      data.project,
      data.team ? "admin" : "read",
    );
    const rows =
      await supportDb()`SELECT id, section, description, created_at, report, reviewed_at, response
      FROM workspace_support_requests WHERE project = ${data.project}
      AND (${data.team} OR requester_id = ${access.id}::uuid)
      ORDER BY created_at DESC, id DESC LIMIT 50`;
    return { requests: rows as SupportRequest[], teamAvailable: access.isAdmin };
  });

export const submitSupportRequest = createServerFn({ method: "POST" })
  .validator(requestKey.extend({ section: z.enum(sections), description }))
  .handler(async ({ data }) => {
    const access = await requireCompanyAccess(data.token, data.project, "read");
    if (!companySections(data.project, access.role === "viewer").includes(data.section)) {
      throw new Error("INVALID_SUPPORT_SECTION");
    }
    await supportDb()`INSERT INTO workspace_support_requests (id, requester_id, project, section, description)
      VALUES (${data.id}, ${access.id}, ${data.project}, ${data.section}, ${data.description})
      ON CONFLICT (id) DO NOTHING`;
  });

export const reviewSupportRequest = createServerFn({ method: "POST" })
  .validator(requestKey)
  .handler(async ({ data }) => {
    const access = await requireCompanyAccess(data.token, data.project, "read");
    const db = supportDb();
    const [request] = await db`SELECT section, reviewed_at FROM workspace_support_requests
      WHERE id = ${data.id} AND requester_id = ${access.id} AND project = ${data.project}`;
    if (!request || request["reviewed_at"] != null) return;

    // This checks current project data. The request text stays in the support inbox.
    const snapshot = await readSupportWorkspace(data.project, access);
    const findings = await runCompanyReview(snapshot, data.project);
    const matching = findings.filter(
      (finding) => finding.section === request["section"] || finding.section === "settings",
    );
    const report = matching.some((finding) => finding.section === request["section"])
      ? matching
      : findings;
    await db`UPDATE workspace_support_requests SET report = ${JSON.stringify(report)}::jsonb,
      reviewed_at = now() WHERE id = ${data.id} AND requester_id = ${access.id}
      AND project = ${data.project} AND reviewed_at IS NULL`;
  });

export const respondToSupportRequest = createServerFn({ method: "POST" })
  .validator(requestKey.extend({ response: description }))
  .handler(async ({ data }) => {
    await requireCompanyAccess(data.token, data.project, "admin");
    const rows =
      await supportDb()`UPDATE workspace_support_requests SET response = ${data.response},
      responded_at = now() WHERE id = ${data.id} AND project = ${data.project} RETURNING id`;
    if (!rows.length) throw new Error("SUPPORT_REQUEST_NOT_FOUND");
  });
