'use client';

import { useEffect, useState } from 'react';
import { Heart, Minus, Plus, ShoppingCart, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/context/WishlistContext';
import { useToast } from '@/hooks/useToast';

interface AddToCartClientProps {
  productId: string;
  stock: number;
  name: string;
  variantId?: string | null;
}

export function AddToCartClient({ productId, stock, name, variantId }: AddToCartClientProps) {
  const { addItem } = useCart();
  const { addToast } = useToast();
  const router = useRouter();
  
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);

  const { toggleWishlist, isInWishlist } = useWishlist();
  const wishlisted = isInWishlist(productId);
  const outOfStock = stock <= 0;

  useEffect(() => {
    setQuantity((current) => {
      if (stock <= 0) return 1;
      return Math.min(Math.max(1, current), stock);
    });
  }, [stock]);

  const handleAddToCart = async () => {
    if (outOfStock) return;
    setAdding(true);
    try {
      await addItem(productId, quantity, variantId);
      addToast(`${name} added to cart`, 'success');
      setQuantity(1);
    } catch {
      addToast('Failed to add to cart', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (outOfStock) return;
    setBuyingNow(true);
    try {
      await addItem(productId, quantity, variantId);
      router.push('/checkout');
    } catch {
      addToast('Failed to process', 'error');
      setBuyingNow(false);
    }
  };

  const handleWishlist = async () => {
    try {
      await toggleWishlist(productId);
    } catch {
      addToast('Please login to use wishlist', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-semibold text-text-primary">Quantity</span>
        <div className="flex w-full items-center justify-between rounded-lg border border-border bg-bg-elevated sm:w-auto">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={outOfStock || quantity <= 1}
            className="flex h-12 w-12 items-center justify-center rounded-l-lg text-text-muted transition-colors hover:bg-white hover:text-text-primary disabled:pointer-events-none disabled:opacity-40"
            aria-label="Decrease quantity"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-12 text-center text-sm font-semibold text-text-primary" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(Math.min(stock, quantity + 1))}
            disabled={outOfStock || quantity >= stock}
            className="flex h-12 w-12 items-center justify-center rounded-r-lg text-text-muted transition-colors hover:bg-white hover:text-text-primary disabled:pointer-events-none disabled:opacity-40"
            aria-label="Increase quantity"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

      </div>

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={handleAddToCart}
        disabled={outOfStock || buyingNow}
        loading={adding}
      >
        <ShoppingCart className="h-5 w-5" aria-hidden="true" />
        {outOfStock ? 'Out of Stock' : 'Add to Cart'}
      </Button>

      <div className="grid grid-cols-[minmax(0,1fr)_48px] gap-3">
        <Button
          variant="secondary"
          size="lg"
          className="min-w-0"
          onClick={handleBuyNow}
          disabled={outOfStock || adding}
          loading={buyingNow}
        >
          <Zap className="h-5 w-5" aria-hidden="true" />
          Buy Now
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          iconOnly
          onClick={handleWishlist}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wishlisted}
          title={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <Heart className={`h-5 w-5 ${wishlisted ? 'fill-red-500 text-red-500' : ''}`} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
