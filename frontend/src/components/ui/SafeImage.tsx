'use client';

import React, { useEffect, useState } from 'react';
import { StoreImage as Image, type StoreImageProps } from './StoreImage';

interface SafeImageProps extends Omit<StoreImageProps, 'src' | 'alt'> {
  src?: string | null;
  alt: string;
  fallback: React.ReactNode;
}

export function SafeImage({ src, alt, fallback, onError, ...props }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return <>{fallback}</>;
  }

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
