/** Send stock only when intentionally edited, with the version originally loaded. */
export function inventoryEdit(stock: number, originalStock?: number, version?: number): { stock?: number; inventory_version?: number } {
  if (!Number.isSafeInteger(stock) || stock < 0 || stock > 2147483647) throw new Error('Stock must be a nonnegative integer.');
  if (originalStock === undefined) return { stock };
  if (stock === originalStock) return {};
  if (!Number.isSafeInteger(version) || Number(version) < 0) throw new Error('Reload this product before changing stock.');
  return { stock, inventory_version: version };
}
