import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/** Mobile camera barcode scanner (ZXing). Calls onDetected once per scan. */
export function CameraScanner({ onDetected }: { onDetected: (code: string) => void }) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  // Continuous scanning: same code is ignored for a short cooldown so the
  // camera stays open and multiple different products can be scanned in a row.
  const lastCode = useRef({ code: "", at: 0 });

  useEffect(() => {
    let stopped = false;
    let controls: { stop: () => void } | undefined;
    const reader = new BrowserMultiFormatReader();

    void reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result) => {
        if (!result || stopped) return;
        const code = result.getText();
        const now = Date.now();
        if (lastCode.current.code === code && now - lastCode.current.at < 1500) return;
        lastCode.current = { code, at: now };
        onDetected(code);
      })
      .then((c) => {
        controls = c;
        setReady(true);
      })
      .catch(() => setError(t("camera_denied")));

    return () => {
      stopped = true;
      controls?.stop();
    };
  }, [onDetected, t]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-black">
      <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
      {!ready && !error && (
        <p className="flex items-center justify-center gap-2 bg-card p-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
        </p>
      )}
      {error && <p className="bg-card p-3 text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}