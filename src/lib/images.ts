/** Google Drive URL normalization so images actually render in <img>. */

export const FALLBACK_IMAGE = "/placeholder-product.svg";

/** Single storage bucket used by every image upload in the app. */
export const IMAGE_BUCKET = "product-images";

export function driveFileId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{10,})/,
    /[?&]id=([a-zA-Z0-9_-]{10,})/,
    /googleusercontent\.com\/d\/([a-zA-Z0-9_-]{10,})/,
    /\/d\/([a-zA-Z0-9_-]{10,})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m && m[1]) return m[1];
  }
  return null;
}

/** Ordered list of candidate URLs to try for a stored image_url. */
export function imageCandidates(url: string): string[] {
  const clean = (url || "").trim();
  if (!clean) return [];
  const id = driveFileId(clean);
  if (!id) return [clean];
  return [
    `https://lh3.googleusercontent.com/d/${id}=w1200`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w1200`,
    `https://drive.google.com/uc?export=view&id=${id}`,
  ];
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1]! : result);
    };
    reader.onerror = () => reject(new Error("READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const MAX_IMAGE_INPUT_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_UPLOAD_BYTES = 300 * 1024;
export const MAX_IMAGE_EDGE = 1200;

export async function compressImage(file: File): Promise<Blob> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) throw new Error("Unsupported image type");
  if (file.size > MAX_IMAGE_INPUT_BYTES) throw new Error("Image must be 20 MB or smaller");

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("Invalid image");

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image compression is unavailable");

    for (const maxEdge of [MAX_IMAGE_EDGE, 960, 720, 480]) {
      const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.82, 0.72, 0.62]) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/webp", quality),
        );
        if (blob?.type !== "image/webp") throw new Error("WebP compression is unavailable");
        if (blob.size <= MAX_IMAGE_UPLOAD_BYTES) return blob;
      }
    }
    throw new Error("Could not compress the image to 300 KB");
  } finally {
    URL.revokeObjectURL(url);
  }
}
