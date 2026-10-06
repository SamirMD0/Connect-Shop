import assert from 'node:assert/strict';
import { it } from 'node:test';
import { inventoryEdit } from '../../src/lib/inventory-edit';
it('content saves omit unchanged stock, while new and changed inventory is explicit', () => {
  assert.deepEqual(inventoryEdit(10, 10, 7), {});
  assert.deepEqual(inventoryEdit(10, 10), {});
  assert.deepEqual(inventoryEdit(12, 10, 7), { stock: 12, inventory_version: 7 });
  assert.deepEqual(inventoryEdit(0), { stock: 0 });
  assert.throws(() => inventoryEdit(12, 10));
  assert.throws(() => inventoryEdit(1.5));
});
