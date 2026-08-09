import { useCallback, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { ACCEPTED_IMAGE_TYPES, fileToBase64 } from "@/lib/images";
import { errorMessage, useI18n } from "@/lib/i18n";
import { ProductImage } from "@/components/ProductImage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  className?: string;
}

/** Drag & drop uploader — uploads straight to Google Drive via Apps Script. */
export function ImageDropzone({ label, value, onChange, className }: Props) {
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
      setBusy(true);
      try {
        const base64 = await fileToBase64(file);
        const res = await api.uploadImage(base64, file.name, file.type);
        onChange(res.image_url);
        toast.success(t("saved"));
      } catch (e) {
        toast.error(`${t("err_upload")} — ${errorMessage(e, lang)}`);
      } finally {
        setBusy(false);
      }
    },
    [lang, onChange, t],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium">{label}</p>

      {value ? (
        <div className="space-y-2">
          <ProductImage url={value} alt={label} className="h-56 w-full border border-border" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
              {t("replace_image")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")} disabled={busy}>
              <X className="me-1 h-4 w-4" />
              {t("remove_image")}
            </Button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void upload(file);
          }}
          className={cn(
            "flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-surface text-center text-sm text-muted-foreground transition-colors hover:border-primary/50",
            over && "border-primary bg-accent",
          )}
        >
          {busy ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              {t("uploading")}
            </>
          ) : (
            <>
              <Upload className="h-6 w-6" />
              <span>{t("drop_image")}</span>
              <span className="text-xs">{t("image_types")}</span>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}