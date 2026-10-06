import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { customerConfigSchema } from '../src/config/customerConfig';

function load(input: Record<string,string> = {}) {
  const envId = require.resolve('../src/config/env');
  require.cache[envId] = { id: envId, filename: envId, loaded: true, exports: { env: customerConfigSchema.parse(input) } } as NodeModule;
  delete require.cache[require.resolve('../src/config/business')];
  return require('../src/config/business') as typeof import('../src/config/business');
}
describe('backend monetary configuration regression', () => {
  it('preserves default discounted tax, regional shipping and public decimal settings', () => {
    const rules=load(); const total=rules.checkoutTotals(19.99,4,' Beirut ');
    assert.equal(total.tax,1.76); assert.equal(total.shipping,3); assert.equal(total.total,20.75); assert.equal(total.currency,'USD');
    assert.equal(rules.publicBusinessSettings().freeShippingThreshold,'150.00');
  });
  it('uses configured customer rules and preserves pre-discount free delivery eligibility', () => {
    const rules=load({STORE_CURRENCY:'EUR',STORE_TAX_RATE:'0.2',STORE_FREE_SHIPPING_THRESHOLD:'50',STORE_SHIPPING_BY_REGION:'{"alpha":2.75}'});
    assert.equal(rules.checkoutTotals(19.99,4,' Alpha ').total,21.94); assert.equal(rules.checkoutTotals(50,40,'Alpha').shipping,0);
    assert.equal(rules.publicBusinessSettings().currency,'EUR');
  });
  it('uses fallback for inherited object names while honoring explicitly configured region names', () => {
    const rules=load({STORE_SHIPPING_DEFAULT:'6'});
    for(const region of ['constructor','__proto__','toString','Unknown']) assert.equal(rules.checkoutTotals(10,0,region).shipping,6);
    const custom=load({STORE_SHIPPING_BY_REGION:'{"constructor":2.75}'});
    assert.equal(custom.checkoutTotals(10,0,'constructor').shipping,2.75);
  });
});
