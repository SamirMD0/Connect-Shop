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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-100 sm:w-auto">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={outOfStock || quantity <= 1}
            className="flex h-12 w-12 items-center justify-center text-text-muted transition-colors hover:text-text-primary disabled:pointer-events-none disabled:opacity-40"
            aria-label="Decrease quantity"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-12 text-center text-sm font-semibold text-text-primary">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(Math.min(stock, quantity + 1))}
            disabled={outOfStock || quantity >= stock}
            className="flex h-12 w-12 items-center justify-center text-text-muted transition-colors hover:text-text-primary disabled:pointer-events-none disabled:opacity-40"
            aria-label="Increase quantity"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            size="lg"
            className="min-h-12 flex-1 bg-white"
            onClick={handleAddToCart}
            disabled={outOfStock || buyingNow}
            loading={adding}
          >
            <ShoppingCart className="w-5 h-5" />
            {outOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Button>

          <Button
            variant="primary"
            size="lg"
            className="min-h-12 flex-1 shadow-lg shadow-accent/25 hover:shadow-accent/40"
            onClick={handleBuyNow}
            disabled={outOfStock || adding}
            loading={buyingNow}
          >
            <Zap className="w-5 h-5" />
            Buy Now
          </Button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleWishlist}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500 sm:w-auto sm:px-4"
        aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-pressed={wishlisted}
      >
        <Heart className={`w-5 h-5 ${wishlisted ? 'fill-red-500 text-red-500' : ''}`} />
        <span>{wishlisted ? 'Saved' : 'Save'}</span>
      </button>
    </div>
  );
}
