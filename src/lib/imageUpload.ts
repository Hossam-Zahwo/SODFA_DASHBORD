import { compressImage, IMAGE_BUCKET } from "@/lib/images";
import { neonPreview, supabase } from "@/lib/supabase";

export async function uploadSodfaImage(file: File): Promise<{ image_url: string; file_id: string }> {
  const image = await compressImage(file);

  if (neonPreview) {
    const { data, error } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (error || !token) throw new Error("Sign in again to upload images");

    const response = await fetch("/api/images/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/webp" },
      body: image,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Image upload failed");
    if (!result.image_url || !result.file_id) throw new Error("Invalid image upload response");
    return result;
  }

  const path = `products/product-${crypto.randomUUID()}.webp`;
  const bucket = supabase.storage.from(IMAGE_BUCKET);
  const { error } = await bucket.upload(path, image, {
    contentType: "image/webp",
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return { image_url: bucket.getPublicUrl(path).data.publicUrl, file_id: path };
}
