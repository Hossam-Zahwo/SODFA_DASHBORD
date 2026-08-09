import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { imageCandidates } from "@/lib/images";
import { cn } from "@/lib/utils";

interface Props {
  url: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}

/** Renders a Google Drive (or plain) image with fallbacks — never a broken icon. */
export function ProductImage({ url, alt, className, imgClassName }: Props) {
  const candidates = imageCandidates(url);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [url]);

  const src = candidates[idx];

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-lg bg-surface",
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setIdx((i) => i + 1)}
          className={cn("h-full w-full object-contain", imgClassName)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
          <ImageOff className="h-10 w-10" />
          <span className="text-xs">SODFA</span>
        </div>
      )}
    </div>
  );
}