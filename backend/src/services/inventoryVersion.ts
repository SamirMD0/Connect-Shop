import { AppError } from '../utils/errors';

export function assertInventoryChange(stock: unknown, version: unknown, currentVersion: number): void {
  if (!Number.isSafeInteger(stock) || Number(stock) < 0 || Number(stock) > 2147483647) {
    throw new AppError('Stock must be a nonnegative integer.', 400);
  }
  if (!Number.isSafeInteger(version) || Number(version) < 0) {
    throw new AppError('An inventory version is required when changing stock. Reload the product.', 409, true, 'INVENTORY_VERSION_REQUIRED');
  }
  if (version !== currentVersion) {
    throw new AppError('Inventory changed since this product was loaded. Reload and review stock before saving.', 409, true, 'INVENTORY_CONFLICT');
  }
}
