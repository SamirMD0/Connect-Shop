'use client';

import { useState } from 'react';
import { Minus, Plus, ShoppingCart, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/useToast';

interface AddToCartClientProps {
  productId: string;
  stock: number;
  name: string;
}

export function AddToCartClient({ productId, stock, name }: AddToCartClientProps) {
  const { addItem } = useCart();
  const { addToast } = useToast();
  const router = useRouter();
  
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);

  const handleAddToCart = async () => {
    if (stock === 0) return;
    setAdding(true);
    try {
      await addItem(productId, quantity);
      addToast(`${name} added to cart`, 'success');
      setQuantity(1);
    } catch {
      addToast('Failed to add to cart', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (stock === 0) return;
    setBuyingNow(true);
    try {
      await addItem(productId, quantity);
      router.push('/checkout');
    } catch {
      addToast('Failed to process', 'error');
      setBuyingNow(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
      <div className="flex items-center bg-slate-100 rounded-xl border border-slate-200">
        <button
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          className="w-12 h-12 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          aria-label="Decrease quantity"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-12 text-center text-sm font-semibold text-text-primary">
          {quantity}
        </span>
        <button
          onClick={() => setQuantity(Math.min(stock, quantity + 1))}
          className="w-12 h-12 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          aria-label="Increase quantity"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-1 gap-3">
        <Button
          variant="outline"
          size="lg"
          className="flex-1 bg-white"
          onClick={handleAddToCart}
          disabled={stock === 0 || buyingNow}
          loading={adding}
        >
          <ShoppingCart className="w-5 h-5" />
          {stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </Button>

        <Button
          variant="primary"
          size="lg"
          className="flex-1 shadow-lg shadow-accent/25 hover:shadow-accent/40"
          onClick={handleBuyNow}
          disabled={stock === 0 || adding}
          loading={buyingNow}
        >
          <Zap className="w-5 h-5" />
          Buy Now
        </Button>
      </div>
    </div>
  );
}
