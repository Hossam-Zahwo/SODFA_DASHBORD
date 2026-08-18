import { useCallback, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { errorMessage, useI18n } from "@/lib/i18n";
import { ProductImage } from "@/components/ProductImage";
import { cn } from "@/lib/utils";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/images";
import { toast } from "sonner";

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  className?: string;
}

const BUCKET = "product-images";

function createSafeFileName(file: File): string {
  const extension =
    file.name.split(".").pop()?.toLowerCase() ||
    (file.type === "image/png" ? "png" : "jpg");

  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `product-${random}.${extension}`;
}

/**
 * Product image uploader.
 *
 * Uploads directly to Supabase Storage:
 *
 * Supabase Storage
 *      ↓
 * product-images
 *      ↓
 * public image URL
 *      ↓
 * inventory.image_url
 */
export function ImageDropzone({
  label,
  value,
  onChange,
  className,
}: Props) {
  const { t, lang } = useI18n();

  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (file: File) => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error(t("image_types"));
        return;
      }

      // Optional safety limit: 10 MB
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image must be smaller than 10 MB");
        return;
      }

      setBusy(true);

      try {
        const fileName = createSafeFileName(file);

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(fileName, file, {
            contentType: file.type,
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(fileName);

        if (!data?.publicUrl) {
          throw new Error("IMAGE_URL_ERROR");
        }

        onChange(data.publicUrl);

        toast.success(t("saved"));
      } catch (e) {
        console.error("Image upload error:", e);

        toast.error(
          `${t("err_upload")} — ${errorMessage(e, lang)}`,
        );
      } finally {
        setBusy(false);
      }
    },
    [lang, onChange, t],
  );

  const removeImage = async () => {
    if (!value) {
      onChange("");
      return;
    }

    /*
     * We intentionally clear the database value here.
     *
     * The actual Storage file can remain temporarily.
     * This avoids accidentally deleting an image that might
     * already be referenced somewhere else.
     */
    onChange("");
  };

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium">{label}</p>

      {value ? (
        <div className="space-y-2">
          <ProductImage
            url={value}
            alt={label}
            className="h-56 w-full border border-border"
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {busy ? (
                <>
                  <Loader2 className="me-1 h-4 w-4 animate-spin" />
                  {t("uploading")}
                </>
              ) : (
                t("replace_image")
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void removeImage()}
              disabled={busy}
            >
              <X className="me-1 h-4 w-4" />
              {t("remove_image")}
            </Button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (!busy) {
              inputRef.current?.click();
            }
          }}
          onKeyDown={(e) => {
            if (
              (e.key === "Enter" || e.key === " ") &&
              !busy
            ) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) {
              setOver(true);
            }
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);

            if (busy) return;

            const file = e.dataTransfer.files?.[0];

            if (file) {
              void upload(file);
            }
          }}
          className={cn(
            "flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-surface text-center text-sm text-muted-foreground transition-colors hover:border-primary/50",
            over && "border-primary bg-accent",
            busy && "cursor-wait opacity-70",
          )}
        >
          {busy ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>{t("uploading")}</span>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6" />

              <span>{t("drop_image")}</span>

              <span className="text-xs">
                {t("image_types")}
              </span>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];

          if (file) {
            void upload(file);
          }

          // Allows selecting the same image again.
          e.target.value = "";
        }}
      />
    </div>
  );
}