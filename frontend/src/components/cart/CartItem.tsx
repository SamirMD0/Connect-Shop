'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CartItem as CartItemType } from '@/lib/types';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/useToast';

interface CartItemProps {
  item: CartItemType;
}

export function CartItemCard({ item }: CartItemProps) {
  const { updateItem, removeItem } = useCart();
  const { addToast } = useToast();

  const price = parseFloat(item.price);
  const lineTotal = (price * item.quantity).toFixed(2);

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1) return;
    if (newQuantity > item.stock) {
      addToast(`Only ${item.stock} available`, 'error');
      return;
    }
    try {
      await updateItem(item.id, newQuantity);
    } catch {
      addToast('Failed to update quantity', 'error');
    }
  };

  const handleRemove = async () => {
    try {
      await removeItem(item.id);
      addToast('Item removed from cart', 'info');
    } catch {
      addToast('Failed to remove item', 'error');
    }
  };

  return (
    <div className="flex gap-4 py-4 border-b border-white/5 last:border-b-0">
      {/* Product Image */}
      <Link href={`/store/${item.slug}`} className="shrink-0">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-bg-elevated overflow-hidden relative">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-accent-glow/10">
              <span className="text-lg font-bold text-accent">
                {item.name.charAt(0)}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <Link href={`/store/${item.slug}`}>
          <h3 className="text-sm font-medium text-text-primary hover:text-accent transition-colors truncate">
            {item.name}
          </h3>
        </Link>
        <p className="text-sm text-accent font-semibold mt-1">${price.toFixed(2)}</p>

        <div className="flex items-center gap-3 mt-2">
          {/* Quantity controls */}
          <div className="flex items-center bg-bg-elevated rounded-lg border border-white/10">
            <button
              onClick={() => handleQuantityChange(item.quantity - 1)}
              className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors active:scale-90"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-medium text-text-primary">
              {item.quantity}
            </span>
            <button
              onClick={() => handleQuantityChange(item.quantity + 1)}
              className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors active:scale-90"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          {/* Remove */}
          <button
            onClick={handleRemove}
            className="text-xs text-text-muted hover:text-danger transition-colors"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Line Total */}
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-text-primary">${lineTotal}</p>
      </div>
    </div>
  );
}
