# CHECKOUT ABUSE PROTECTION STATUS

## Rule Implemented

Cash-on-delivery checkout now blocks a new order when the customer already has 2 or more active COD orders.

The customer-facing error message is:

```text
You already have pending cash-on-delivery orders. Please wait until they are processed before placing another order.
```

## Scope

The rule applies only when `paymentMethod` resolves to `cash_on_delivery`.

It does not apply to future online-payment methods.

## Active Statuses

Active COD orders are counted when the order status is one of:

- `pending`
- `confirmed`
- `processing`
- `out_for_delivery`
- `shipped`

Note: the current database/admin status model uses `shipped`. It is included as the current equivalent of an in-delivery active order so shipped COD orders are not treated as completed.

Inactive/completed statuses are not counted:

- `delivered`
- `cancelled`

## Limit

- 0 active COD orders: checkout allowed.
- 1 active COD order: checkout allowed.
- 2 or more active COD orders: checkout rejected.

## User And Guest Handling

Authenticated checkout is checked by `user_id`.

Guest checkout is checked by normalized phone number from the shipping address. The query strips non-digit characters before comparison, with a trimmed lowercase fallback for unusual phone input.

## Transaction Safety

The active COD order check runs inside the existing checkout transaction before the order insert and before stock reduction.

If checkout is rejected:

- No order is created.
- No order items are created.
- Stock is not reduced.
- The successful checkout response shape is unchanged.

## Security Event Logging

If `security_events` is available, rejected checkouts are logged as:

```text
checkout.cod_blocked_pending_orders
```

Metadata includes:

- `reason`
- `activeOrderCount`
- `activeOrderLimit`
- `paymentMethod`
- masked phone only

Full phone numbers, addresses, cookies, tokens, and payment details are not logged.

## Manual Verification Checklist

- [ ] User with 0 active COD orders can checkout.
- [ ] User with 1 active COD order can checkout.
- [ ] User with 2 active COD orders cannot checkout.
- [ ] Guest with 2 active COD orders using the same phone cannot checkout.
- [ ] Delivered orders do not count.
- [ ] Cancelled orders do not count.
- [ ] Future non-COD payment methods are not affected.
- [ ] Rejected checkout does not create an order.
- [ ] Rejected checkout does not reduce stock.
- [ ] Error message is clean and does not expose internal details.
- [ ] Existing successful checkout still returns the same response shape.

## Remaining TODOs

- Verify this behavior in staging with real cart/order data.
- Verify ImageKit uploads in staging.
- Enable Render PostgreSQL automated backups.
- Add Redis read-through caching for homepage/categories after blockers.
