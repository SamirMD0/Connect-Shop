# ImageKit Setup

ImageKit is used for production admin image uploads. Admin product uploads continue to call:

```text
POST /api/v1/admin/uploads/image
```

The backend uploads the image to ImageKit when ImageKit environment variables are configured, then stores only the returned image URL in existing `image_url` fields. Image binary data is not stored in PostgreSQL.

## Required Backend Environment Variables

Add these to `backend/.env` locally when testing ImageKit, and to the Render backend service for production:

```env
IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
IMAGEKIT_URL_ENDPOINT=
IMAGEKIT_FOLDER=/connect-shop
```

Get the public key, private key, and URL endpoint from the ImageKit dashboard under Developer Options / API Keys and URL endpoints. Do not add real keys to committed files.

## Local Development

Local development supports two modes:

- If all ImageKit variables are set, admin uploads go to ImageKit and return an ImageKit CDN URL.
- If ImageKit variables are missing, uploads fall back to `frontend/public/uploads/admin` and return `/uploads/admin/...`.

This fallback is only for local/demo development.

## Production Behavior

In production, the backend requires:

- `IMAGEKIT_PUBLIC_KEY`
- `IMAGEKIT_PRIVATE_KEY`
- `IMAGEKIT_URL_ENDPOINT`

If any required ImageKit variable is missing while `NODE_ENV=production`, the backend fails environment validation instead of silently saving local files. This prevents uploads from being lost on Render/Vercel-style deployments.

## Upload Rules

Allowed data URL image types:

- `image/png`
- `image/jpeg`
- `image/webp`
- `image/gif`

SVG upload is not allowed. HTML, PDF, executables, text files renamed as images, and unknown binary files are rejected.

Validation rules:

- The request must use a base64 image data URL.
- The declared MIME type must be allowed.
- The original filename extension, when provided, must match the uploaded image type.
- The decoded file signature must match the declared type:
  - JPEG starts with `FF D8 FF`.
  - PNG starts with `89 50 4E 47`.
  - WebP starts with `RIFF` and `WEBP`.
  - GIF starts with `GIF87a` or `GIF89a`.
- The backend generates a safe filename using a sanitized base name, timestamp, random suffix, and validated extension.

Limits:

- Max decoded image size: 5 MB.
- Upload route JSON parser limit: 7 MB to account for base64 overhead.

## Frontend Contract

The frontend sends:

```json
{
  "fileName": "product.jpg",
  "dataUrl": "data:image/jpeg;base64,..."
}
```

The response keeps the existing shape:

```json
{
  "success": true,
  "url": "https://ik.imagekit.io/..."
}
```

The backend may also include `fileId`, `name`, `thumbnailUrl`, and `provider`, but `url` remains the field saved by product/category/homepage data.

## Render Setup

In Render:

1. Open the backend Web Service.
2. Add the ImageKit environment variables above.
3. Keep `NODE_ENV=production`.
4. Redeploy the backend.
5. Log in as an admin and upload a product image.
6. Confirm the response URL starts with the ImageKit URL endpoint.

## Troubleshooting

- `IMAGEKIT_* is required in production`: add the missing variable in Render.
- `Only PNG, JPG, WEBP, or GIF data URLs are supported`: the frontend sent an unsupported or malformed file.
- `Only PNG, JPG, WEBP, or GIF files are supported`: the original filename used an unsupported extension.
- `File extension does not match the uploaded image type`: the filename extension and decoded image type disagree.
- `Image contents do not match the declared file type`: the file extension/MIME data does not match the actual image bytes.
- `Image is too large. Maximum allowed size is 5MB.`: resize or compress the image before uploading.
- `Image upload failed`: verify the ImageKit keys, URL endpoint, folder permissions, and account status.
