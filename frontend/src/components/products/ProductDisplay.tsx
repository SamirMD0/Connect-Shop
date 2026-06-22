'use client';

import { useEffect, useMemo, useState } from 'react';
import { Product } from '@/lib/types';
import { RatingStars } from '@/components/products/RatingStars';
import { StockBadge } from '@/components/products/StockBadge';
import { AddToCartClient } from '@/components/products/AddToCartClient';
import { SafeImage } from '@/components/ui/SafeImage';
import { Check, MessageCircle, PackageCheck, RotateCcw, Share2, Truck, WalletCards } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SITE_URL } from '@/lib/constants';

interface ProductDisplayProps {
  product: Product;
}

export function ProductDisplay({ product }: ProductDisplayProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.variants && product.variants.length > 0 ? product.variants[0].id : null
  );

  const selectedVariant = useMemo(() => {
    return product.variants?.find(variant => variant.id === selectedVariantId) || null;
  }, [product.variants, selectedVariantId]);

  const displayPrice = selectedVariant ? parseFloat(selectedVariant.price) : parseFloat(product.price);
  const displayStock = selectedVariant ? selectedVariant.stock : product.stock;
  const activeImage = selectedVariant?.image_url || product.image_url;
  const isOutOfStock = displayStock <= 0;

  const images = useMemo(() => {
    const list: string[] = [];
    if (product.image_url) list.push(product.image_url);
    product.gallery_images?.forEach(image => {
      if (!list.includes(image.image_url)) list.push(image.image_url);
    });
    if (selectedVariant?.image_url && !list.includes(selectedVariant.image_url)) {
      list.unshift(selectedVariant.image_url);
    }
    return list;
  }, [product.gallery_images, product.image_url, selectedVariant]);

  const [mainImage, setMainImage] = useState<string | null>(activeImage);

  useEffect(() => {
    if (activeImage) setMainImage(activeImage);
  }, [activeImage]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('recently_viewed');
      let viewed: string[] = stored ? JSON.parse(stored) : [];
      viewed = viewed.filter(id => id !== product.id);
      viewed.unshift(product.id);
      if (viewed.length > 10) viewed = viewed.slice(0, 10);
      localStorage.setItem('recently_viewed', JSON.stringify(viewed));
    } catch {
      // Recent-product tracking must not block the product page.
    }
  }, [product.id]);

  const compareAtPrice = product.compare_at_price ? parseFloat(product.compare_at_price) : null;
  const discountPercent = compareAtPrice && compareAtPrice > displayPrice
    ? Math.round(((compareAtPrice - displayPrice) / compareAtPrice) * 100)
    : null;
  const isNew = new Date(product.created_at).getTime() > Date.now() - 14 * 24 * 60 * 60 * 1000;
  const isBestseller = product.review_count >= 10 && parseFloat(product.rating) >= 4;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(390px,0.9fr)] lg:gap-12">
      <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-36 lg:self-start">
        <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-white shadow-sm">
          <SafeImage
            src={mainImage}
            alt={product.name}
            fill
            className="object-contain p-5 sm:p-8"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-white">
                <span className="text-8xl font-bold text-accent/30">{product.name.charAt(0)}</span>
              </div>
            }
          />
          <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
            {isOutOfStock && <ProductLabel className="bg-text-primary">Out of stock</ProductLabel>}
            {discountPercent && <ProductLabel className="bg-danger">{discountPercent}% off</ProductLabel>}
            {product.is_featured && <ProductLabel className="bg-accent">Featured</ProductLabel>}
            {isNew && <ProductLabel className="bg-success">New</ProductLabel>}
            {isBestseller && <ProductLabel className="bg-warning">Bestseller</ProductLabel>}
          </div>
        </div>

        {images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {images.map((image, index) => (
              <button
                key={image}
                type="button"
                onClick={() => setMainImage(image)}
                aria-label={`View ${product.name} image ${index + 1}`}
                aria-pressed={mainImage === image}
                className={cn(
                  'relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg border bg-white transition-colors sm:h-20 sm:w-20',
                  mainImage === image ? 'border-accent ring-2 ring-accent/20' : 'border-border hover:border-border-strong'
                )}
              >
                <SafeImage
                  src={image}
                  alt={`${product.name} thumbnail ${index + 1}`}
                  fill
                  className="object-contain p-1.5"
                  sizes="80px"
                  fallback={<div className="h-full w-full bg-bg-elevated" />}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
          {product.brand && <span className="font-semibold text-text-secondary">{product.brand}</span>}
          {product.brand && product.category_name && <span className="text-border-strong">/</span>}
          {product.category_name && <span className="font-medium text-accent">{product.category_name}</span>}
        </div>

        <h1 className="break-words text-2xl font-bold leading-tight text-text-primary sm:text-3xl lg:text-4xl">
          {product.name}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <RatingStars rating={parseFloat(product.rating)} reviewCount={product.review_count} size="md" />
          {product.sku && <span className="text-xs text-text-muted">SKU: {selectedVariant?.sku || product.sku}</span>}
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-2">
          <p className="text-3xl font-bold text-text-primary sm:text-4xl">${displayPrice.toFixed(2)}</p>
          {discountPercent && !selectedVariant && (
            <p className="mb-1 text-base text-text-muted line-through">${compareAtPrice?.toFixed(2)}</p>
          )}
          {discountPercent && !selectedVariant && (
            <span className="mb-1 text-sm font-bold text-danger">Save {discountPercent}%</span>
          )}
        </div>

        <div className="mt-4"><StockBadge stock={displayStock} /></div>

        {product.variants && product.variants.length > 0 && (
          <fieldset className="mt-6">
            <legend className="mb-3 text-sm font-semibold text-text-primary">Choose an option</legend>
            <div className="flex flex-wrap gap-2">
              {product.variants.map(variant => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedVariantId(variant.id)}
                  aria-pressed={selectedVariantId === variant.id}
                  className={cn(
                    'flex min-h-11 items-center gap-2 rounded-lg border px-3.5 py-2 text-left text-sm transition-colors',
                    selectedVariantId === variant.id
                      ? 'border-accent bg-accent/10 font-semibold text-accent'
                      : 'border-border bg-white text-text-secondary hover:border-border-strong'
                  )}
                >
                  <span>{variant.name}</span>
                  <span className="text-xs opacity-75">${parseFloat(variant.price).toFixed(2)}</span>
                  {selectedVariantId === variant.id && <Check className="h-4 w-4" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <section className="mt-6 rounded-lg border border-border bg-white p-4 shadow-sm sm:p-5" aria-labelledby="purchase-product-heading">
          <h2 id="purchase-product-heading" className="text-base font-bold text-text-primary">Purchase this product</h2>
          <div className="my-4 grid gap-2 sm:grid-cols-2">
            <TrustSignal icon={WalletCards} text="Cash on Delivery" />
            <TrustSignal icon={Truck} text="Fast local delivery" />
          </div>
          <AddToCartClient
            productId={product.id}
            stock={displayStock}
            name={selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name}
            variantId={selectedVariantId}
          />
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5"><PackageCheck className="h-4 w-4 text-accent" aria-hidden="true" />Availability confirmed before dispatch</span>
            <span className="inline-flex items-center gap-1.5"><RotateCcw className="h-4 w-4 text-accent" aria-hidden="true" />Return support available</span>
          </div>
        </section>

        {product.description && (
          <section className="mt-8 border-t border-border pt-7" aria-labelledby="product-overview-heading">
            <h2 id="product-overview-heading" className="text-lg font-bold text-text-primary">Product overview</h2>
            <p className="mt-3 break-words text-sm leading-6 text-text-secondary sm:text-base sm:leading-7">{product.description}</p>
          </section>
        )}

        {product.specs && Object.keys(product.specs).length > 0 && (
          <section className="mt-8 border-t border-border pt-7" aria-labelledby="product-specifications-heading">
            <h2 id="product-specifications-heading" className="text-lg font-bold text-text-primary">Specifications</h2>
            <dl className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
              {Object.entries(product.specs).map(([key, value]) => (
                <div key={key} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(140px,0.4fr)_1fr] sm:gap-5">
                  <dt className="text-sm font-semibold capitalize text-text-secondary">{key.replace(/_/g, ' ')}</dt>
                  <dd className="break-words text-sm text-text-primary">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-text-muted">
            <Share2 className="h-4 w-4" aria-hidden="true" /> Share
          </span>
          <ShareLink href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${SITE_URL}/store/${product.slug}`)}`} label="Share on Facebook">f</ShareLink>
          <ShareLink href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${SITE_URL}/store/${product.slug}`)}&text=${encodeURIComponent(`Check out this ${product.name}!`)}`} label="Share on X">X</ShareLink>
          <ShareLink href={`https://wa.me/?text=${encodeURIComponent(`Check out this ${product.name}! ${SITE_URL}/store/${product.slug}`)}`} label="Share on WhatsApp">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
          </ShareLink>
        </div>
      </div>
    </div>
  );
}

function ProductLabel({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-sm ${className}`}>{children}</span>;
}

function TrustSignal({ icon: Icon, text }: { icon: typeof Truck; text: string }) {
  return (
    <div className="flex min-h-11 items-center gap-2 rounded-lg bg-bg-elevated px-3 py-2 text-sm font-semibold text-text-secondary">
      <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
      {text}
    </div>
  );
}

function ShareLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-white text-sm font-bold text-text-secondary transition-colors hover:border-accent hover:text-accent"
      aria-label={label}
    >
      {children}
    </a>
  );
}
