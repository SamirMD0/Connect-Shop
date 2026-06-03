'use client';

import { useState, useMemo, useEffect } from 'react';
import { Product } from '@/lib/types';
import { RatingStars } from '@/components/products/RatingStars';
import { StockBadge } from '@/components/products/StockBadge';
import { AddToCartClient } from '@/components/products/AddToCartClient';
import { SafeImage } from '@/components/ui/SafeImage';
import { Truck, PackageCheck, RotateCcw, Share2, MessageCircle, Check, WalletCards, MapPin } from 'lucide-react';
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
    return product.variants?.find(v => v.id === selectedVariantId) || null;
  }, [product.variants, selectedVariantId]);

  const displayPrice = selectedVariant ? parseFloat(selectedVariant.price) : parseFloat(product.price);
  const displayStock = selectedVariant ? selectedVariant.stock : product.stock;
  const activeImage = selectedVariant?.image_url || product.image_url;
  const isOutOfStock = displayStock <= 0;

  // Combine product image and gallery images for the thumbnail carousel
  const images = useMemo(() => {
    const list: string[] = [];
    if (product.image_url) list.push(product.image_url);
    if (product.gallery_images) {
      product.gallery_images.forEach(img => {
        if (!list.includes(img.image_url)) list.push(img.image_url);
      });
    }
    if (selectedVariant?.image_url && !list.includes(selectedVariant.image_url)) {
      list.unshift(selectedVariant.image_url);
    }
    return list;
  }, [product, selectedVariant]);

  const [mainImage, setMainImage] = useState<string | null>(activeImage);

  // Update main image when variant changes
  useEffect(() => {
    if (activeImage) setMainImage(activeImage);
  }, [activeImage]);

  // Handle recently viewed
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recently_viewed');
      let viewed: string[] = stored ? JSON.parse(stored) : [];
      viewed = viewed.filter(id => id !== product.id);
      viewed.unshift(product.id);
      if (viewed.length > 10) viewed = viewed.slice(0, 10);
      localStorage.setItem('recently_viewed', JSON.stringify(viewed));
    } catch {
      // ignore
    }
  }, [product.id]);

  const compareAtPrice = product.compare_at_price ? parseFloat(product.compare_at_price) : null;
  const discountPercent = compareAtPrice && compareAtPrice > displayPrice
    ? Math.round(((compareAtPrice - displayPrice) / compareAtPrice) * 100)
    : null;
  const isNew = new Date(product.created_at).getTime() > Date.now() - 14 * 24 * 60 * 60 * 1000;
  const isBestseller = product.review_count >= 10 && parseFloat(product.rating) >= 4;
  const stockSummary = isOutOfStock
    ? 'Unavailable'
    : displayStock <= 10
      ? `${displayStock} left`
      : 'Available';

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(390px,0.9fr)] lg:gap-12">
      {/* Product Image Gallery */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-36 lg:self-start">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm sm:aspect-square">
          <SafeImage
            src={mainImage}
            alt={product.name}
            fill
            className="object-contain p-6 sm:p-8"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            fallback={
              <div className="w-full h-full bg-white flex items-center justify-center">
                <span className="text-8xl font-bold text-accent/30">
                  {product.name.charAt(0)}
                </span>
              </div>
            }
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2 sm:left-4 sm:top-4">
            {isOutOfStock && (
              <span className="rounded-full bg-[#0B1B48] px-3 py-1.5 text-xs font-semibold text-white shadow-sm sm:text-sm">
                Out of stock
              </span>
            )}
            {product.is_featured && (
              <span className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-sm sm:text-sm">
                Featured
              </span>
            )}
            {isNew && (
              <span className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm sm:text-sm">
                New
              </span>
            )}
            {discountPercent && (
              <span className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm sm:text-sm">
                {discountPercent}% off
              </span>
            )}
            {isBestseller && (
              <span className="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm sm:text-sm">
                Bestseller
              </span>
            )}
          </div>
        </div>
        
        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setMainImage(img)}
                aria-label={`View ${product.name} image ${idx + 1}`}
                aria-pressed={mainImage === img}
                className={cn(
                  "relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border bg-white transition-all sm:h-20 sm:w-20",
                  mainImage === img
                    ? "border-accent ring-2 ring-accent/20"
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                <SafeImage
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  fill
                  className="object-contain p-1.5"
                  sizes="80px"
                  fallback={<div className="h-full w-full bg-slate-100" />}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex min-w-0 flex-col">
        {/* Brand & Category */}
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
          {product.brand && (
            <>
              <span className="font-bold text-text-primary">{product.brand}</span>
              <span className="text-slate-300">•</span>
            </>
          )}
          <span className="font-medium text-accent">{product.category_name}</span>
        </div>
        
        <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl lg:text-4xl">
          {product.name}
        </h1>

        {product.sku && (
          <p className="mb-4 mt-2 text-xs text-text-muted">SKU: {selectedVariant?.sku || product.sku}</p>
        )}

        <div className="mb-5">
          <RatingStars rating={parseFloat(product.rating)} reviewCount={product.review_count} size="md" />
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <p className="text-3xl font-bold text-accent sm:text-4xl">
            ${displayPrice.toFixed(2)}
          </p>
          {discountPercent && !selectedVariant && (
            <p className="text-lg text-text-muted line-through mb-1">
              ${compareAtPrice?.toFixed(2)}
            </p>
          )}
          {discountPercent && !selectedVariant && (
            <span className="text-sm font-bold text-red-600 mb-1">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        <div className="mb-5">
          <StockBadge stock={displayStock} />
        </div>

        {product.description && (
          <div className="mb-6 rounded-2xl border border-slate-200/70 bg-slate-50 p-4">
            <h2 className="mb-2 text-sm font-semibold text-text-primary">Overview</h2>
            <p className="break-words text-sm leading-6 text-text-muted sm:text-base sm:leading-7">
              {product.description}
            </p>
          </div>
        )}

        {/* Variant Selection */}
        {product.variants && product.variants.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Available Options</h3>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariantId(v.id)}
                  aria-pressed={selectedVariantId === v.id}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all",
                    selectedVariantId === v.id 
                      ? "border-accent bg-accent/5 text-accent" 
                      : "border-slate-200 bg-white text-text-primary hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  {v.name}
                  {selectedVariantId === v.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">Delivery and payment</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: WalletCards, label: 'Payment', value: 'Cash on Delivery' },
              { icon: MapPin, label: 'Delivery', value: 'Local delivery available' },
              { icon: PackageCheck, label: 'Stock', value: stockSummary },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-slate-50 p-3">
                <item.icon className="mb-2 h-5 w-5 text-accent" />
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-text-primary">{item.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-text-muted">
            Submit your order and the store can confirm availability and delivery details before dispatch.
          </p>
        </div>

        {/* Quantity & Add to Cart Client Component */}
        <div className="mb-8 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Ready to order?</h3>
              <p className="mt-1 text-xs text-text-muted">
                {isOutOfStock ? 'This item is currently unavailable.' : 'Choose quantity, then add it to your cart or continue to checkout.'}
              </p>
            </div>
            <StockBadge stock={displayStock} />
          </div>
          <AddToCartClient
            productId={product.id}
            stock={displayStock}
            name={selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name}
            variantId={selectedVariantId}
          />
        </div>

        {/* Share */}
        <div className="mb-8 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-6">
          <span className="text-sm font-medium text-text-muted flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Share:
          </span>
          <div className="flex gap-2">
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${SITE_URL}/store/${product.slug}`)}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-[#1877F2] hover:text-white transition-colors" aria-label="Share on Facebook">
              <span className="text-sm font-bold" aria-hidden="true">f</span>
            </a>
            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${SITE_URL}/store/${product.slug}`)}&text=${encodeURIComponent(`Check out this ${product.name}!`)}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-[#1DA1F2] hover:text-white transition-colors" aria-label="Share on Twitter">
              <span className="text-xs font-bold" aria-hidden="true">X</span>
            </a>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Check out this ${product.name}! ${SITE_URL}/store/${product.slug}`)}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-colors" aria-label="Share on WhatsApp">
              <MessageCircle className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: WalletCards, label: 'Cash on Delivery' },
            { icon: Truck, label: 'Local Delivery' },
            { icon: PackageCheck, label: 'Verified Stock' },
            { icon: RotateCcw, label: 'Return Support' },
          ].map((badge) => (
            <div key={badge.label} className="flex flex-col items-center text-center p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <badge.icon className="w-5 h-5 text-accent mb-1" />
              <span className="text-xs text-text-muted">{badge.label}</span>
            </div>
          ))}
        </div>

        {/* Specs Table */}
        {product.specs && Object.keys(product.specs).length > 0 && (
          <div className="mt-8">
            <h3 className="mb-4 text-sm font-semibold text-text-primary">Specifications</h3>
            <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white">
              {Object.entries(product.specs).map(([key, value], index) => (
                <div
                  key={key}
                  className={cn(
                    "grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr] sm:gap-4",
                    index % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                  )}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-text-muted sm:text-sm sm:normal-case sm:capitalize sm:tracking-normal">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="break-words text-sm font-medium leading-6 text-text-primary">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
