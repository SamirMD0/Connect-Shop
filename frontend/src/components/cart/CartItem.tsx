'use client';

import Link from 'next/link';
import { CartItem as CartItemType } from '@/lib/types';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/useToast';
import { SafeImage } from '@/components/ui/SafeImage';
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
    <div className="grid gap-4 border-b border-slate-100 py-5 last:border-b-0 sm:grid-cols-[96px_1fr_auto]">
      {/* Product Image */}
      <Link href={`/store/${item.slug}`} className="shrink-0">
        <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200/60 bg-white">
          <SafeImage
            src={item.image_url}
            alt={item.name}
            fill
            className="object-contain p-2"
            sizes="96px"
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent-glow/10">
                <span className="text-lg font-bold text-accent/40">
                  {item.name.charAt(0)}
                </span>
              </div>
            }
          />
        </div>
      </Link>

      {/* Details */}
      <div className="min-w-0">
        <Link href={`/store/${item.slug}`}>
          <h3 className="line-clamp-2 text-base font-semibold leading-6 text-text-primary transition-colors hover:text-accent">
            {item.name}
          </h3>
        </Link>
        {item.variant_name && (
          <p className="mt-1 text-xs text-text-muted">{item.variant_name}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-bold text-accent">${price.toFixed(2)}</span>
          <span className="text-xs text-text-muted">Stock: {item.stock}</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* Quantity controls */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100">
            <button
              type="button"
              onClick={() => handleQuantityChange(item.quantity - 1)}
              disabled={item.quantity <= 1}
              className="flex h-10 w-10 items-center justify-center text-text-muted transition-colors hover:text-text-primary disabled:pointer-events-none disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-10 text-center text-sm font-semibold text-text-primary">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={item.quantity >= item.stock}
              className="flex h-10 w-10 items-center justify-center text-text-muted transition-colors hover:text-text-primary disabled:pointer-events-none disabled:opacity-40"
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Remove */}
          <button
            type="button"
            onClick={handleRemove}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove</span>
          </button>
        </div>
      </div>

      {/* Line Total */}
      <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted sm:block">Subtotal</span>
        <p className="text-lg font-bold text-text-primary sm:mt-1">${lineTotal}</p>
      </div>
    </div>
  );
}
