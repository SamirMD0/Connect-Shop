import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StoreImage } from '../../src/components/ui/StoreImage';
import { canResizeStorefrontImage, storefrontImageLoader } from '../../src/lib/storefront-image';

describe('selective ImageKit sizing', () => {
  const originalEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
  afterEach(() => {
    if (originalEndpoint === undefined) delete process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
    else process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT = originalEndpoint;
  });
  it('sizes ImageKit URLs while preserving query parameters and existing effects', () => {
    const src = 'https://ik.imagekit.io/synthetic/product.jpg?tr=c-maintain_ratio&fixture=1';
    const url = new URL(storefrontImageLoader({ src, width: 640, quality: 80 }));
    assert.equal(url.searchParams.get('tr'), 'c-maintain_ratio:w-640,q-80');
    assert.equal(url.searchParams.get('fixture'), '1');
    const html = renderToStaticMarkup(createElement(StoreImage, {
      src, alt: 'Synthetic', fill: true, sizes: '25vw', imagekitWidth: 768,
    }));
    assert.match(html, /w-768/);
    assert.match(html, /position:absolute/);
    assert.doesNotMatch(html, /_next\/image/);
    const thumbnail = renderToStaticMarkup(createElement(StoreImage, { src, alt: 'Synthetic', fill: true, sizes: '64px' }));
    assert.match(thumbnail, /w-128/);
  });
  it('preserves sources needing passthrough, including signed URLs and existing path transformations', () => {
    const urls = ['/uploads/fixture.jpg', '/nextmerce/fixture.png', 'data:image/png;base64,fixture',
      'https://images.unsplash.com/fixture.jpg', 'https://cdn.example.test/fixture.jpg',
      'https://ik.imagekit.io/synthetic/logo.svg', 'https://ik.imagekit.io/synthetic/animated.gif',
      'https://ik.imagekit.io/synthetic/photo.jpg?ik-s=synthetic&ik-t=123',
      'https://ik.imagekit.io/synthetic/tr:w-200/photo.jpg'];
    for (const src of urls) {
      assert.equal(canResizeStorefrontImage(src), false);
      assert.equal(storefrontImageLoader({ src, width: 640 }), src);
    }
  });
  it('preserves actual passthrough output and respects an explicit opt-out', () => {
    for (const src of ['/uploads/fixture.jpg', 'https://images.unsplash.com/fixture.jpg',
      'https://ik.imagekit.io/synthetic/photo.jpg?ik-s=synthetic']) {
      const html = renderToStaticMarkup(createElement(StoreImage, { src, width: 300, height: 200,
        alt: 'Synthetic', unoptimized: true }));
      assert.ok(html.includes(src)); assert.doesNotMatch(html, /_next\/image|w-600/);
    }
    const src = 'https://ik.imagekit.io/synthetic/photo.jpg';
    const html = renderToStaticMarkup(createElement(StoreImage, { src, width: 300, height: 200,
      alt: 'Synthetic', unoptimized: true }));
    assert.doesNotMatch(html, /w-600/);
  });

  it('supports configured custom ImageKit endpoints without transforming neighboring paths or hosts', () => {
    process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT = 'https://media.example.test/shop/';
    assert.equal(canResizeStorefrontImage('https://media.example.test/shop/product.jpg'), true);
    assert.equal(canResizeStorefrontImage('https://media.example.test/shop-other/product.jpg'), false);
    assert.equal(canResizeStorefrontImage('https://other.example.test/shop/product.jpg'), false);
    assert.equal(canResizeStorefrontImage('http://media.example.test/shop/product.jpg'), false);
  });
});
