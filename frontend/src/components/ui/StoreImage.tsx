'use client';

import Image, { type ImageProps } from 'next/image';
import { canResizeStorefrontImage, storefrontImageLoader } from '../../lib/storefront-image';

export interface StoreImageProps extends ImageProps {
  imagekitWidth?: number;
}

export function StoreImage({ imagekitWidth, ...props }: StoreImageProps) {
  const resize = typeof props.src === 'string' && !props.loader && props.unoptimized !== true
    && canResizeStorefrontImage(props.src);
  const intrinsicWidth = Number(props.width);
  const fixedSize = Number(props.sizes?.match(/^(\d+)px$/)?.[1]);
  const targetWidth = imagekitWidth ?? (Number.isFinite(intrinsicWidth) && intrinsicWidth > 0
    ? intrinsicWidth * 2 : fixedSize > 0 ? fixedSize * 2 : 1280);
  // Global unoptimized remains enabled for source compatibility. Apply the CDN
  // transform directly; a Next loader would be bypassed by that global setting.
  const src = resize ? storefrontImageLoader({ src: props.src as string,
    width: Math.min(3840, Math.max(1, Math.ceil(targetWidth))), quality: props.quality === undefined ? undefined : Number(props.quality) }) : props.src;
  return <Image {...props} alt={props.alt} src={src} unoptimized={resize ? true : props.unoptimized} />;
}
