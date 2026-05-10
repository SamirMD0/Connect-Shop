'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CartItem as CartItemType } from '@/lib/types';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/useToast';
import { Minus, Plus, Trash2 } from 'lucide-react';

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
    <div className="flex gap-4 py-5 border-b border-slate-100 last:border-b-0">
      {/* Product Image */}
      <Link href={`/store/${item.slug}`} className="shrink-0">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-50 overflow-hidden relative border border-slate-200/60">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent-glow/10">
              <span className="text-lg font-bold text-accent/40">
                {item.name.charAt(0)}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <Link href={`/store/${item.slug}`}>
          <h3 className="text-sm font-semibold text-text-primary hover:text-accent transition-colors line-clamp-2">
            {item.name}
          </h3>
        </Link>
        <p className="text-sm text-accent font-bold mt-1">${price.toFixed(2)}</p>

        <div className="flex items-center gap-4 mt-3">
          {/* Quantity controls */}
          <div className="flex items-center bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => handleQuantityChange(item.quantity - 1)}
              className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center text-sm font-semibold text-text-primary">
              {item.quantity}
            </span>
            <button
              onClick={() => handleQuantityChange(item.quantity + 1)}
              className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Remove */}
          <button
            onClick={handleRemove}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-danger transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Remove</span>
          </button>
        </div>
      </div>

      {/* Line Total */}
      <div className="shrink-0 text-right">
        <p className="text-base font-bold text-text-primary">${lineTotal}</p>
      </div>
    </div>
  );
}
