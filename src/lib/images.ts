/** Google Drive URL normalization so images actually render in <img>. */

export const FALLBACK_IMAGE = "/placeholder-product.svg";

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