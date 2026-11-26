import { useState } from "react";
import { ImageOff } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Photo = { url: string; fallback: string | null; variantId: string; label: string | null };

function PhotoImage({ photo, alt, large = false }: { photo: Photo; alt: string; large?: boolean }) {
  const [attempt, setAttempt] = useState(0);
  const url = attempt === 0 ? photo.url : attempt === 1 ? photo.fallback : null;
  const size = large ? "aspect-square w-full" : "size-14";
  if (!url?.startsWith("https://")) {
    return (
      <span
        className={`grid ${size} place-items-center rounded-lg border border-white/15 bg-zinc-900 text-zinc-400`}
        aria-label="الصورة غير متاحة"
      >
        <ImageOff size={20} aria-hidden="true" />
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={`${size} rounded-lg border border-white/15 bg-zinc-900 object-contain`}
      onError={() => setAttempt((value) => value + 1)}
    />
  );
}

export function CatalogProductPhotos({
  title,
  photos,
}: {
  title: string;
  photos?: Photo[] | undefined;
}) {
  const first = photos?.[0];
  if (!first || !photos)
    return (
      <span
        className="grid size-14 place-items-center rounded-lg border border-white/15 bg-zinc-900 text-zinc-400"
        title="مفيش صورة مرتبطة بالصنف"
      >
        <ImageOff size={18} aria-hidden="true" />
        <span className="sr-only">مفيش صورة مرتبطة بالصنف</span>
      </span>
    );
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="relative rounded-lg text-start focus-visible:outline focus-visible:outline-purple-300"
          aria-label={`عرض صور ${title}`}
        >
          <PhotoImage
            key={first.url}
            photo={first}
            alt={first.label ? `${title} · ${first.label}` : title}
          />
          {photos.length > 1 && (
            <span className="absolute bottom-0 end-0 rounded bg-black/80 px-1 text-xs text-white">
              {photos.length}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent
        dir="rtl"
        className="max-h-[85vh] max-w-2xl overflow-y-auto border-white/15 bg-[#17121b] text-white"
      >
        <DialogTitle>{title}</DialogTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <figure key={JSON.stringify([photo.variantId, photo.url])} className="min-w-0">
              <PhotoImage
                photo={photo}
                alt={photo.label ? `${title} · ${photo.label}` : title}
                large
              />
              <figcaption className="mt-1 break-words text-sm text-zinc-300">
                {photo.variantId
                  ? photo.label || `تفريعة ${photo.variantId.slice(0, 8)}`
                  : "صورة المنتج"}
              </figcaption>
            </figure>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
