import type { Brand, Category, Product } from './products.service';

interface HomepageReadLoaders {
  featured: () => Promise<Product[]>;
  trending: () => Promise<Product[]>;
  newest: () => Promise<Product[]>;
  categories: () => Promise<Category[]>;
  brands: () => Promise<Brand[]>;
}

// Request-local promises only: no cross-request or authenticated-data cache.
export function createHomepageReads(loaders: HomepageReadLoaders): HomepageReadLoaders {
  function once<T>(load: () => Promise<T>): () => Promise<T> {
    let pending: Promise<T> | undefined;
    return () => pending ??= Promise.resolve().then(load);
  }
  return {
    featured: once(loaders.featured), trending: once(loaders.trending),
    newest: once(loaders.newest), categories: once(loaders.categories), brands: once(loaders.brands),
  };
}

export type HomepageReads = ReturnType<typeof createHomepageReads>;
