import { getNeonAuth } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthHandlers = ReturnType<NonNullable<ReturnType<typeof getNeonAuth>>["handler"]>;

function withAuth(method: keyof AuthHandlers) {
  return (request: Request, context: Parameters<AuthHandlers["GET"]>[1]) => {
    const auth = getNeonAuth();
    if (!auth) return Response.json({ error: "Authentication is unavailable" }, { status: 503 });
    return auth.handler()[method](request, context);
  };
}

export const GET = withAuth("GET");
export const POST = withAuth("POST");
export const PUT = withAuth("PUT");
export const PATCH = withAuth("PATCH");
export const DELETE = withAuth("DELETE");
