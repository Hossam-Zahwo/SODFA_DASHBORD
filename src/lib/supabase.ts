import { createClient } from "@supabase/supabase-js";
import { createClient as createNeonClient } from "@neon/neon-js/supabase";

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"];

const supabasePublishableKey =
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

if (!supabaseUrl) {
  throw new Error("Missing VITE_SUPABASE_URL");
}

if (!supabasePublishableKey) {
  throw new Error("Missing VITE_SUPABASE_PUBLISHABLE_KEY");
}

const original = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

const neonAuthUrl = import.meta.env["VITE_NEON_AUTH_URL"];
const neonDataApiUrl = import.meta.env["VITE_NEON_DATA_API_URL"];

export const neonPreview = Boolean(neonAuthUrl && neonDataApiUrl);

function createPreviewClient() {
  const client = createNeonClient({
    auth: { url: neonAuthUrl, allowAnonymous: false },
    dataApi: { url: neonDataApiUrl },
  });

  return {
    auth: client.auth,
    // Both clients return PostgREST query builders. Keep the app's existing overloads.
    from: client.from.bind(client) as unknown as typeof original.from,
    rpc: client.rpc.bind(client) as unknown as typeof original.rpc,
    storage: {
      from(bucket: string) {
        const originalBucket = original.storage.from(bucket);
        return {
          getPublicUrl: originalBucket.getPublicUrl.bind(originalBucket),
          async upload(..._args: Parameters<typeof originalBucket.upload>) {
            return { data: null, error: new Error("Image upload is unavailable in this preview.") };
          },
        };
      },
    },
  };
}

export const supabase = neonPreview ? createPreviewClient() : original;

export async function resetPreviewPassword(token: string, newPassword: string) {
  const response = await fetch(`${neonAuthUrl}/reset-password`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
  if (!response.ok) throw new Error("Password reset failed");
}
