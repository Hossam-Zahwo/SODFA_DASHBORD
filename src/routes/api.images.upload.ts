import { createFileRoute } from "@tanstack/react-router";
import { MAX_IMAGE_EDGE, MAX_IMAGE_UPLOAD_BYTES } from "@/lib/images";

const dataApi =
  "https://ep-bold-heart-b9ktjsoe.apirest.c-7.eu-central-1.aws.neon.tech/neondb/rest/v1";

export const Route = createFileRoute("/api/images/upload")({
  server: { handlers: { POST: ({ request }) => uploadImage(request) } },
});

async function uploadImage(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json({ error: "Sign in to upload images" }, { status: 401 });
  }

  try {
    const profile = await fetch(`${dataApi}/profiles?select=id&limit=1`, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(10_000),
    });
    if (profile.status === 401 || profile.status === 403 ||
        (profile.ok && !(await profile.json()).length)) {
      return Response.json({ error: "Image upload access denied" }, { status: 403 });
    }
    if (!profile.ok) return Response.json({ error: "Could not verify access" }, { status: 503 });

    const cloud = process.env["CLOUDINARY_CLOUD_NAME"];
    const key = process.env["CLOUDINARY_API_KEY"];
    const secret = process.env["CLOUDINARY_API_SECRET"];
    if (!cloud || !/^[a-z0-9_-]+$/i.test(cloud) || !key || !secret) {
      return Response.json({ error: "Cloudinary storage is not connected yet" }, { status: 503 });
    }

    if (request.headers.get("Content-Type") !== "image/webp" || !request.body) {
      return Response.json({ error: "A WebP image is required" }, { status: 415 });
    }
    const reader = request.body.getReader();
    const bytes = new Uint8Array(MAX_IMAGE_UPLOAD_BYTES);
    let size = 0;
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        if (size + chunk.value.length > bytes.length) {
          await reader.cancel();
          return Response.json({ error: "Image must be 300 KB or smaller" }, { status: 413 });
        }
        bytes.set(chunk.value, size);
        size += chunk.value.length;
      }
    } finally {
      reader.releaseLock();
    }
    const header = new TextDecoder("ascii");
    if (size < 12 || header.decode(bytes.subarray(0, 4)) !== "RIFF" ||
        header.decode(bytes.subarray(8, 12)) !== "WEBP") {
      return Response.json({ error: "Invalid WebP image" }, { status: 415 });
    }

    const publicId = `sodfa/images/${crypto.randomUUID()}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const transformation = `c_limit,h_${MAX_IMAGE_EDGE},w_${MAX_IMAGE_EDGE}`;
    const params = { overwrite: "false", public_id: publicId, timestamp, transformation };
    const payload = Object.entries(params).map(([k, v]) => `${k}=${v}`).join("&") + secret;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
    const signature = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");

    const form = new FormData();
    for (const [name, value] of Object.entries(params)) form.set(name, value);
    form.set("file", new Blob([bytes.subarray(0, size)], { type: "image/webp" }), "image.webp");
    form.set("api_key", key);
    form.set("signature", signature);
    const upload = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(20_000),
    });
    if (!upload.ok) return Response.json({ error: "Cloudinary could not save the image" }, { status: 502 });
    const result = await upload.json();
    if (typeof result.secure_url !== "string" || !result.secure_url.startsWith(`https://res.cloudinary.com/${cloud}/`) ||
        result.public_id !== publicId) {
      return Response.json({ error: "Cloudinary returned an invalid image reference" }, { status: 502 });
    }
    return Response.json({ image_url: result.secure_url, file_id: publicId });
  } catch {
    return Response.json({ error: "Image storage is temporarily unavailable" }, { status: 503 });
  }
}
