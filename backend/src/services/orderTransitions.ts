import { AppError } from '../utils/errors';

export const ORDER_STATUS_VALUES = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
export type AdminOrderStatus = typeof ORDER_STATUS_VALUES[number];
const forward: Record<string, string[]> = {
  confirmed: ['processing', 'shipped', 'delivered'], processing: ['shipped', 'delivered'],
  shipped: ['delivered'], delivered: [], cancelled: [],
};
export function allowedOrderTransitions(order: { status: string; payment_status: string; payment_method: string }): string[] {
  const next = [...(forward[order.status] || [])];
  if (['confirmed', 'processing'].includes(order.status) && order.payment_status === 'pending'
    && ['cash_on_delivery', 'cod'].includes(order.payment_method)) next.push('cancelled');
  return next;
}
export function assertOrderTransition(order: { status: string; payment_status: string; payment_method: string }, next: string): void {
  if (!ORDER_STATUS_VALUES.includes(next as AdminOrderStatus)) throw new AppError('Invalid order status.', 400);
  if (order.status === next) return;
  if (!allowedOrderTransitions(order).includes(next)) {
    if (next === 'cancelled' && order.status !== 'cancelled') {
      throw new AppError('Cancellation is blocked at this stage or payment state. A returns/refund policy is required.', 409, true, 'CANCELLATION_POLICY_REQUIRED');
    }
    throw new AppError('This order status transition is not allowed.', 409, true, 'ORDER_TRANSITION_INVALID');
  }
}
