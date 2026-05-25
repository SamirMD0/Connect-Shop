'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Product, ProductVariant } from '@/lib/types';
import { RatingStars } from '@/components/products/RatingStars';
import { StockBadge } from '@/components/products/StockBadge';
import { AddToCartClient } from '@/components/products/AddToCartClient';
import { Truck, Shield, RotateCcw, Share2, MessageCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const today = new Date();
  const deliveryStart = new Date(today);
  deliveryStart.setDate(today.getDate() + 2);
  const deliveryEnd = new Date(today);
  deliveryEnd.setDate(today.getDate() + 4);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  const deliveryText = `Order now and get it between ${formatDate(deliveryStart)} and ${formatDate(deliveryEnd)}`;
  const compareAtPrice = product.compare_at_price ? parseFloat(product.compare_at_price) : null;
  const discountPercent = compareAtPrice && compareAtPrice > displayPrice
    ? Math.round(((compareAtPrice - displayPrice) / compareAtPrice) * 100)
    : null;
  const isNew = new Date(product.created_at).getTime() > Date.now() - 14 * 24 * 60 * 60 * 1000;
  const isBestseller = product.review_count >= 10 && parseFloat(product.rating) >= 4;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      {/* Product Image Gallery */}
      <div className="flex flex-col gap-4">
        <div className="relative aspect-square rounded-3xl bg-slate-50 overflow-hidden border border-slate-200/60">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-accent/10 via-slate-50 to-accent-glow/10 flex items-center justify-center">
              <span className="text-8xl font-bold text-accent/30">
                {product.name.charAt(0)}
              </span>
            </div>
          )}
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            {product.is_featured && (
              <span className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg shadow-accent/25">
                Featured
              </span>
            )}
            {isNew && (
              <span className="bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg shadow-emerald-500/25">
                New
              </span>
            )}
            {discountPercent && (
              <span className="bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg shadow-red-500/25">
                Sale
              </span>
            )}
            {isBestseller && (
              <span className="bg-amber-500 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg shadow-amber-500/25">
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
                onClick={() => setMainImage(img)}
                className={cn(
                  "relative w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all",
                  mainImage === img ? "border-accent" : "border-slate-200 hover:border-slate-300"
                )}
              >
                <Image src={img} alt={`Thumbnail ${idx + 1}`} fill className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex flex-col">
        {/* Brand & Category */}
        <div className="flex items-center gap-2 mb-2 text-sm">
          {product.brand && (
            <>
              <span className="font-bold text-text-primary">{product.brand}</span>
              <span className="text-slate-300">•</span>
            </>
          )}
          <span className="font-medium text-accent">{product.category_name}</span>
        </div>
        
        <h1 className="text-3xl lg:text-4xl font-bold text-text-primary tracking-tight mb-2">
          {product.name}
        </h1>

        {product.sku && (
          <p className="text-xs text-text-muted mb-4">SKU: {selectedVariant?.sku || product.sku}</p>
        )}

        <div className="mb-6">
          <RatingStars rating={parseFloat(product.rating)} reviewCount={product.review_count} size="md" />
        </div>

        <div className="flex items-end gap-3 mb-4">
          <p className="text-4xl font-bold text-accent">
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

        <div className="mb-6">
          <StockBadge stock={displayStock} />
        </div>

        {product.description && (
          <p className="text-text-muted leading-relaxed mb-6">
            {product.description}
          </p>
        )}

        {/* Variant Selection */}
        {product.variants && product.variants.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Available Options</h3>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariantId(v.id)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium border transition-all flex items-center gap-2",
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

        {/* Specs Table */}
        {product.specs && Object.keys(product.specs).length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Specifications</h3>
            <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-200/60">
              {Object.entries(product.specs).map(([key, value], index) => (
                <div 
                  key={key} 
                  className={cn("flex py-3 px-4", index % 2 === 0 ? 'bg-slate-50' : 'bg-white')}
                >
                  <span className="text-sm text-text-muted capitalize w-1/3">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm text-text-primary font-medium w-2/3">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delivery Estimation */}
        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Truck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-1">Estimated Delivery</h4>
            <p className="text-sm text-text-muted">{deliveryText}</p>
          </div>
        </div>

        {/* Quantity & Add to Cart Client Component */}
        <AddToCartClient 
          productId={product.id}
          stock={displayStock}
          name={selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name}
          variantId={selectedVariantId}
        />

        {/* Share */}
        <div className="flex items-center gap-4 mb-8 pt-6 border-t border-slate-100">
          <span className="text-sm font-medium text-text-muted flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Share:
          </span>
          <div className="flex gap-2">
            <a href={`https://www.facebook.com/sharer/sharer.php?u=https://elecshop.com/store/${product.slug}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-[#1877F2] hover:text-white transition-colors" aria-label="Share on Facebook">
              <span className="text-sm font-bold" aria-hidden="true">f</span>
            </a>
            <a href={`https://twitter.com/intent/tweet?url=https://elecshop.com/store/${product.slug}&text=Check out this ${product.name}!`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-[#1DA1F2] hover:text-white transition-colors" aria-label="Share on Twitter">
              <span className="text-xs font-bold" aria-hidden="true">X</span>
            </a>
            <a href={`https://wa.me/?text=Check out this ${product.name}! https://elecshop.com/store/${product.slug}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-colors" aria-label="Share on WhatsApp">
              <MessageCircle className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Truck, label: 'Free Shipping' },
            { icon: Shield, label: 'Secure Payment' },
            { icon: RotateCcw, label: '30-Day Returns' },
          ].map((badge) => (
            <div key={badge.label} className="flex flex-col items-center text-center p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <badge.icon className="w-5 h-5 text-accent mb-1" />
              <span className="text-xs text-text-muted">{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
