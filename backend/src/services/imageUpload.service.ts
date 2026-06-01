import crypto from 'crypto';
import path from 'path';
import { promises as fs } from 'fs';
import { env } from '../config/env';
import { getImageKitClient, imageKitFolder } from '../config/imagekit';
import { AppError } from '../utils/errors';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const DATA_URL_PATTERN = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=]+)$/;
const EXTENSION_ALIASES: Record<string, string> = {
  jpeg: 'jpg',
};

type UploadProvider = 'imagekit' | 'local';

export interface UploadedImage {
  url: string;
  fileId?: string;
  name?: string;
  thumbnailUrl?: string;
  provider: UploadProvider;
}

interface ParsedImageDataUrl {
  base64: string;
  buffer: Buffer;
  extension: string;
}

function detectImageExtension(buffer: Buffer): string | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png';
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }

  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) {
    return 'gif';
  }

  return null;
}

function parseImageDataUrl(dataUrl: string): ParsedImageDataUrl {
  const match = dataUrl.match(DATA_URL_PATTERN);
  if (!match) {
    throw new AppError('Only PNG, JPG, WEBP, or GIF data URLs are supported', 400);
  }

  const extension = EXTENSION_ALIASES[match[1]] || match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, 'base64');

  if (buffer.length === 0) {
    throw new AppError('Image data is empty', 400);
  }

  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new AppError('Image is too large. Maximum allowed size is 5MB.', 400);
  }

  if (detectImageExtension(buffer) !== extension) {
    throw new AppError('Image contents do not match the declared file type', 400);
  }

  return { base64, buffer, extension };
}

function getSafeOriginalExtension(fileName: string | undefined): string | null {
  if (!fileName) return null;

  const extension = path.extname(fileName).slice(1).toLowerCase();
  if (!extension) return null;

  return EXTENSION_ALIASES[extension] || extension;
}

function assertFileNameExtensionMatches(fileName: string | undefined, detectedExtension: string): void {
  const originalExtension = getSafeOriginalExtension(fileName);
  if (!originalExtension) return;

  if (!['png', 'jpg', 'webp', 'gif'].includes(originalExtension)) {
    throw new AppError('Only PNG, JPG, WEBP, or GIF files are supported', 400);
  }

  if (originalExtension !== detectedExtension) {
    throw new AppError('File extension does not match the uploaded image type', 400);
  }
}

function createSafeFileName(fileName: string | undefined, extension: string): string {
  const baseName = (fileName || 'admin-upload')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'admin-upload';

  return `${baseName}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;
}

async function uploadImageLocally(fileName: string, buffer: Buffer): Promise<UploadedImage> {
  const uploadDir = path.resolve(__dirname, '../../../frontend/public/uploads/admin');

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, fileName), buffer);

  return {
    url: `/uploads/admin/${fileName}`,
    name: fileName,
    provider: 'local',
  };
}

export async function uploadImageToImageKit(input: { fileName?: string; dataUrl: string }): Promise<UploadedImage> {
  if (!input.dataUrl || typeof input.dataUrl !== 'string') {
    throw new AppError('dataUrl is required', 400);
  }

  const parsedImage = parseImageDataUrl(input.dataUrl);
  assertFileNameExtensionMatches(input.fileName, parsedImage.extension);
  const fileName = createSafeFileName(input.fileName, parsedImage.extension);
  const imageKit = getImageKitClient();

  if (!imageKit) {
    if (env.NODE_ENV === 'production') {
      throw new AppError('ImageKit is not configured for production uploads', 500);
    }

    return uploadImageLocally(fileName, parsedImage.buffer);
  }

  const upload = await imageKit.upload({
    file: parsedImage.base64,
    fileName,
    folder: imageKitFolder,
    useUniqueFileName: false,
  }).catch(() => {
    throw new AppError('Image upload failed', 502);
  });

  return {
    url: upload.url,
    fileId: upload.fileId,
    name: upload.name,
    thumbnailUrl: upload.thumbnailUrl,
    provider: 'imagekit',
  };
}
