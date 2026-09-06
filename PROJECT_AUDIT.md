# SODFA project audit and repair

## What was repaired

### 1. Product image upload integration
`ImageDropzone` previously accepted only:

- `label`
- `value`
- `onChange`

while `ProductFormDialog` used:

```tsx
<ImageDropzone onUpload={addProductImage} />
```

and:

```tsx
<ImageDropzone onUpload={(url) => addVariantImage(..., url)} />
```

That mismatch prevented the product/variant uploader from matching its caller.

`ImageDropzone` now supports both modes without changing the existing return/damaged-return pages:

- controlled: `value + onChange`
- callback: `onUpload`

### 2. One storage bucket
The uploader used `product-images`, while `api.uploadImage` used `sodfa-images`.

All image uploads now use the shared `IMAGE_BUCKET` constant:

```ts
export const IMAGE_BUCKET = "sodfa-images";
```

The included Supabase migration also makes `sodfa-images` public because the application uses `getPublicUrl()`.

### 3. Persistent product image gallery
The product form already had a multi-image UI, but the API only saved `image_url`. That meant secondary product images could disappear after reopening the product.

A new `product_images` table migration was added. The API now:

- saves the full product image list
- saves the primary image
- loads the gallery with inventory
- deletes product image records when a product is deleted

Variant galleries were already stored in the variant `details` JSON and were left compatible.

## Required database step

Run:

`supabase/migrations/20260905_product_images.sql`

in the Supabase SQL editor/migration system.

This is required for persistent multi-image product galleries.

## Important limitation of the uploaded archive

The uploaded `src.zip` contained the `src/` source tree only. It did **not** contain the project root files normally needed to build/install a complete application, such as:

- `package.json`
- lockfile
- TypeScript/Vite/TanStack configuration
- environment files
- the existing Supabase database schema/migrations outside `src/`

Those files cannot be reconstructed safely from the source alone without inventing dependency versions or database configuration.

The repaired archive therefore contains all files that were actually supplied, plus the new migration and this audit file. It is not claiming to be a byte-for-byte reconstruction of missing root configuration.

## Supabase Storage note

The application still requires a valid authenticated Supabase session and Storage permissions. The migration adds policies for authenticated users and public image reads. If your existing project intentionally uses a different authorization model, review those policies before applying them.

## Files changed

- `src/components/ImageDropzone.tsx`
- `src/lib/images.ts`
- `src/lib/api.ts`
- `supabase/migrations/20260905_product_images.sql`

No route/component behavior outside the image-storage path was intentionally redesigned.
