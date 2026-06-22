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
    <article className="grid grid-cols-[80px_minmax(0,1fr)] gap-3 border-b border-border py-5 last:border-b-0 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:gap-4">
      <Link href={`/store/${item.slug}`} className="shrink-0 self-start rounded-lg" aria-label={`View ${item.name}`}>
        <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-border bg-white sm:h-24 sm:w-24">
          <SafeImage
            src={item.image_url}
            alt={item.name}
            fill
            className="object-contain p-2"
            sizes="96px"
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-white">
                <span className="text-lg font-bold text-accent/40">
                  {item.name.charAt(0)}
                </span>
              </div>
            }
          />
        </div>
      </Link>

      <div className="min-w-0">
        <Link href={`/store/${item.slug}`} className="rounded-sm">
          <h3 className="line-clamp-2 text-base font-semibold leading-6 text-text-primary transition-colors hover:text-accent">
            {item.name}
          </h3>
        </Link>
        {item.variant_name && (
          <p className="mt-1 text-sm text-text-muted">Option: {item.variant_name}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-semibold text-text-primary">${price.toFixed(2)} each</span>
          <span className="text-xs text-text-muted">{item.stock} available</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-lg border border-border bg-bg-elevated" aria-label={`Quantity for ${item.name}`}>
            <button
              type="button"
              onClick={() => handleQuantityChange(item.quantity - 1)}
              disabled={item.quantity <= 1}
              className="flex h-11 w-11 items-center justify-center rounded-l-lg text-text-muted transition-colors hover:bg-white hover:text-text-primary disabled:pointer-events-none disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-10 text-center text-sm font-semibold text-text-primary" aria-live="polite">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={item.quantity >= item.stock}
              className="flex h-11 w-11 items-center justify-center rounded-r-lg text-text-muted transition-colors hover:bg-white hover:text-text-primary disabled:pointer-events-none disabled:opacity-40"
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
            aria-label={`Remove ${item.name} from cart`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove</span>
          </button>
        </div>
      </div>

      <div className="col-span-2 flex items-center justify-between gap-3 border-t border-border pt-3 sm:col-span-1 sm:block sm:border-0 sm:pt-0 sm:text-right">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted sm:block">Subtotal</span>
        <p className="text-lg font-bold text-text-primary sm:mt-1">${lineTotal}</p>
      </div>
    </article>
  );
}
