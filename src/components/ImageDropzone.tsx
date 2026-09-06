import { useCallback, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { errorMessage, useI18n } from "@/lib/i18n";
import { ProductImage } from "@/components/ProductImage";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_IMAGE_TYPES,
  IMAGE_BUCKET,
} from "@/lib/images";
import { toast } from "sonner";

interface CommonProps {
  label?: string;
  className?: string;
}

/**
 * Controlled mode:
 * Used by returns/damaged-returns where the component owns one URL.
 */
interface ControlledProps extends CommonProps {
  value: string;
  onChange: (url: string) => void;
  onUpload?: never;
}

/**
 * Callback mode:
 * Used by ProductFormDialog where every successful upload is appended
 * to a list of product/variant images.
 */
interface CallbackProps extends CommonProps {
  value?: never;
  onChange?: never;
  onUpload: (url: string) => void;
}

type Props = ControlledProps | CallbackProps;

function createSafeFileName(file: File): string {
  const extension =
    file.name.split(".").pop()?.toLowerCase() ||
    (file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg");

  const random =
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

  return `products/product-${random}.${extension}`;
}

function isControlled(props: Props): props is ControlledProps {
  return "onChange" in props && typeof props.onChange === "function";
}

/**
 * Shared Supabase image uploader.
 *
 * It intentionally supports both APIs already used by the application:
 *
 * 1) value + onChange
 *    <ImageDropzone value={url} onChange={setUrl} />
 *
 * 2) onUpload
 *    <ImageDropzone onUpload={addImage} />
 *
 * Both modes upload to the same bucket.
 */
export function ImageDropzone(props: Props) {
  const { t, lang } = useI18n();

  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const controlled = isControlled(props);
  const value = controlled ? props.value : "";

  const emitUrl = useCallback(
    (url: string) => {
      if (controlled) {
        props.onChange(url);
      } else {
        props.onUpload(url);
      }
    },
    [controlled, props],
  );

  const upload = useCallback(
    async (file: File) => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error(t("image_types"));
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image must be smaller than 10 MB");
        return;
      }

      setBusy(true);

      try {
        const fileName = createSafeFileName(file);

        const { error: uploadError } =
          await supabase.storage
            .from(IMAGE_BUCKET)
            .upload(fileName, file, {
              contentType: file.type,
              cacheControl: "3600",
              upsert: false,
            });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from(IMAGE_BUCKET)
          .getPublicUrl(fileName);

        const publicUrl =
          data?.publicUrl?.trim() || "";

        if (!publicUrl) {
          throw new Error("IMAGE_URL_ERROR");
        }

        emitUrl(publicUrl);
        toast.success(t("saved"));
      } catch (e) {
        console.error("Image upload error:", e);
        toast.error(
          `${t("err_upload")} — ${errorMessage(
            e,
            lang,
          )}`,
        );
      } finally {
        setBusy(false);
      }
    },
    [emitUrl, lang, t],
  );

  const openPicker = () => {
    if (!busy) {
      inputRef.current?.click();
    }
  };

  const removeImage = () => {
    if (controlled) {
      props.onChange("");
    }
  };

  return (
    <div
      className={cn(
        "space-y-2",
        props.className,
      )}
    >
      {props.label && (
        <p className="text-sm font-medium">
          {props.label}
        </p>
      )}

      {controlled && value ? (
        <div className="space-y-2">
          <ProductImage
            url={value}
            alt={props.label || "Product image"}
            className="h-56 w-full border border-border"
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openPicker}
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
              onClick={removeImage}
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
          aria-disabled={busy}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (
              (e.key === "Enter" ||
                e.key === " ") &&
              !busy
            ) {
              e.preventDefault();
              openPicker();
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

            const file =
              e.dataTransfer.files?.[0];

            if (file) {
              void upload(file);
            }
          }}
          className={cn(
            "flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-surface text-center text-sm text-muted-foreground transition-colors hover:border-primary/50",
            over &&
              "border-primary bg-accent",
            busy &&
              "cursor-wait opacity-70",
          )}
        >
          {busy ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>
                {t("uploading")}
              </span>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6" />
              <span>
                {t("drop_image")}
              </span>
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

          e.target.value = "";
        }}
      />
    </div>
  );
}
