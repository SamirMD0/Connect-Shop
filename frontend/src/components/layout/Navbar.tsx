'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container } from './Container';
import { CartIcon } from '@/components/cart/CartIcon';
import { UserMenu } from '@/components/auth/UserMenu';
import { MobileMenu } from './MobileMenu';
import { useAuth } from '@/hooks/useAuth';
import { APP_NAME } from '@/lib/constants';
import { ChevronDown, Menu, Search } from 'lucide-react';
import { WishlistIcon } from '@/components/wishlist/WishlistIcon';
import { hasAdminAccess } from '@/lib/adminPermissions';
import { api } from '@/lib/api';
import { Category, Product } from '@/lib/types';
import { SafeImage } from '@/components/ui/SafeImage';

function formatSuggestionPrice(value: string) {
  const price = parseFloat(value);
  if (!Number.isFinite(price)) return value;
  return `$${Number.isInteger(price) ? price.toFixed(0) : price.toFixed(2)}`;
}

export function Navbar() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    api.get<{ success: boolean; categories: Category[] }>('/api/categories')
      .then((res) => setCategories(res.categories || []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();

    searchAbortRef.current?.abort();

    if (query.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    const controller = new AbortController();
    searchAbortRef.current = controller;
    setSuggestionsLoading(true);

    const timer = window.setTimeout(() => {
      api.get<{ success: boolean; products: Product[] }>('/api/products', {
        params: { search: query, limit: 5 },
        signal: controller.signal,
      })
        .then((res) => {
          setSuggestions(res.products || []);
          setSuggestionsOpen(true);
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          setSuggestions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setSuggestionsLoading(false);
          }
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const parentCategories = categories.filter(category => !category.parent_id);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    setSuggestionsOpen(false);
    router.push(query ? `/store?search=${encodeURIComponent(query)}` : '/store');
  };

  return (
    <header className="sticky left-0 top-0 z-50 w-full border-b border-border bg-white shadow-sm shadow-slate-200/40">
      <Container className="max-w-[1170px]">
        <div className="flex items-center justify-between gap-3 py-3 sm:py-4 lg:gap-6 xl:py-5">
          <div className="flex min-w-0 items-center lg:flex-1 xl:gap-10">
            <Link className="flex shrink-0 items-center" href="/" aria-label={APP_NAME}>
              <span className="whitespace-nowrap text-[21px] font-bold leading-none text-text-primary sm:text-[26px] lg:text-[28px]">
                ELECTRO<span className="text-accent"> SHOP</span>
              </span>
            </Link>

            <form action="/store" method="GET" onSubmit={handleSearchSubmit} className="hidden w-full max-w-[475px] lg:block">
              <div className="flex items-center">
                <div className="group relative">
                  <Link
                    href="/store"
                    className="flex h-[46px] min-w-[160px] items-center justify-between rounded-l-[5px] border border-r-0 border-border bg-slate-50 px-3.5 text-sm font-medium text-text-primary transition-colors hover:text-accent"
                  >
                    All Categories
                    <ChevronDown className="h-4 w-4" />
                  </Link>
                  {parentCategories.length > 0 && (
                    <div className="invisible absolute left-0 top-full z-50 mt-1.5 min-w-[230px] translate-y-2 rounded-md border border-slate-200 bg-white py-2.5 opacity-0 shadow-xl shadow-slate-200/70 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                      <Link
                        href="/store"
                        className="block px-4 py-2 text-sm text-text-muted transition-colors hover:bg-slate-50 hover:text-accent"
                      >
                        All Products
                      </Link>
                      {parentCategories.slice(0, 8).map((category) => (
                        <Link
                          key={category.id}
                          href={`/store?category=${category.slug}`}
                          className="block px-4 py-2 text-sm capitalize text-text-muted transition-colors hover:bg-slate-50 hover:text-accent"
                        >
                          {category.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative w-full min-w-[260px] max-w-[333px]">
                  <span className="absolute left-0 top-1/2 inline-block h-5 w-px -translate-y-1/2 bg-slate-300" />
                  <label htmlFor="navbar-search" className="sr-only">
                    Search products
                  </label>
                  <input
                    type="search"
                    name="search"
                    id="navbar-search"
                    placeholder="I am shopping for..."
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setSuggestionsOpen(true);
                    }}
                    onFocus={() => {
                      if (searchQuery.trim().length >= 2) setSuggestionsOpen(true);
                    }}
                    onBlur={() => {
                      window.setTimeout(() => setSuggestionsOpen(false), 120);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') setSuggestionsOpen(false);
                    }}
                    autoComplete="off"
                    className="h-[46px] w-full rounded-r-[5px] border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-10 text-sm text-text-primary outline-none transition-all placeholder:text-text-muted focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/15"
                  />
                  <button
                    id="search-btn"
                    aria-label="Search"
                    type="submit"
                    className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-text-muted transition-colors hover:text-accent"
                  >
                    <Search className="h-[18px] w-[18px]" />
                  </button>

                  {suggestionsOpen && searchQuery.trim().length >= 2 && (
                    <div
                      id="navbar-search-suggestions"
                      role="region"
                      aria-label="Search suggestions"
                      className="absolute right-0 top-full z-50 mt-2 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl shadow-slate-200/80"
                    >
                      <div className="border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                        Search suggestions
                      </div>
                      {suggestionsLoading ? (
                        <div className="space-y-2 px-4 py-3">
                          {[1, 2, 3].map((item) => (
                            <div key={item} className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded bg-slate-100 skeleton-shimmer" />
                              <div className="flex-1 space-y-2">
                                <div className="h-3 rounded bg-slate-100 skeleton-shimmer" />
                                <div className="h-3 w-20 rounded bg-slate-100 skeleton-shimmer" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : suggestions.length > 0 ? (
                        <div className="max-h-[330px] overflow-y-auto py-1">
                          {suggestions.map((product) => (
                            <Link
                              key={product.id}
                              href={`/store/${product.slug}`}
                              onClick={() => {
                                setSearchQuery('');
                                setSuggestionsOpen(false);
                              }}
                              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                            >
                              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded border border-slate-200 bg-white">
                                <SafeImage
                                  src={product.image_url}
                                  alt={product.name}
                                  fill
                                  className="object-contain p-1.5"
                                  sizes="48px"
                                  fallback={
                                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-accent/40">
                                      {product.name.charAt(0)}
                                    </div>
                                  }
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-1 text-sm font-semibold text-text-primary">
                                  {product.name}
                                </p>
                                <p className="mt-0.5 line-clamp-1 text-xs text-text-muted">
                                  {product.brand || product.category_name || 'Product'}
                                </p>
                              </div>
                              <span className="shrink-0 text-sm font-semibold text-accent">
                                {formatSuggestionPrice(product.price)}
                              </span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-4 text-sm text-text-muted">
                          No matching products found.
                        </div>
                      )}
                      <Link
                        href={`/store?search=${encodeURIComponent(searchQuery.trim())}`}
                        onClick={() => setSuggestionsOpen(false)}
                        className="block border-t border-border px-4 py-3 text-sm font-semibold text-accent transition-colors hover:bg-bg-elevated hover:text-text-primary"
                      >
                        View all results for &quot;{searchQuery.trim()}&quot;
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>

          <div className="flex shrink-0 items-center gap-3 lg:gap-5">
            <div className="hidden items-center gap-3.5 xl:flex">
              <span className="flex h-6 w-6 items-center justify-center text-accent">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path fillRule="evenodd" clipRule="evenodd" d="M4.7177 3.09215C5.94388 1.80121 7.9721 2.04307 8.98569 3.47665L10.2467 5.26014C11.0574 6.4068 10.9889 8.00097 10.0214 9.01965L9.7765 9.27743C9.76142 9.31959 9.7287 9.43538 9.7609 9.65513C9.82765 10.1107 10.1793 11.0364 11.607 12.5394C13.0391 14.0472 13.9078 14.4025 14.3103 14.4679C14.484 14.4961 14.5748 14.4716 14.6038 14.4614L15.0124 14.0312C15.8862 13.1113 17.2485 12.9301 18.347 13.5623L20.2575 14.662C21.8904 15.6019 22.2705 17.9011 20.9655 19.275L19.545 20.7705C19.1016 21.2373 18.497 21.6358 17.75 21.7095C15.9261 21.8895 11.701 21.655 7.27161 16.9917C3.13844 12.6403 2.35326 8.85538 2.25401 7.00615C2.20497 6.09248 2.61224 5.30879 3.1481 4.74464L4.7177 3.09215ZM7.7609 4.34262C7.24855 3.61797 6.32812 3.57473 5.80528 4.12518L4.23568 5.77767C3.90429 6.12656 3.73042 6.52646 3.75185 6.92576C3.83289 8.43558 4.48307 11.8779 8.35919 15.9587C12.4234 20.2375 16.1676 20.3584 17.6026 20.2167C17.8864 20.1887 18.1783 20.0313 18.4574 19.7375L19.8779 18.2419C20.4907 17.5968 20.3301 16.4345 19.5092 15.962L17.5987 14.8624C17.086 14.5673 16.4854 14.6584 16.1 15.0642L15.6445 15.5437L15.1174 15.043C15.6078 15.5803 15.4022 15.7387 15.1606 15.8544C14.8846 15.9633 14.5201 16.0216 14.0699 15.9485C13.1923 15.806 12.0422 15.1757 10.5194 13.5724C8.99202 11.9644 8.40746 10.7647 8.27675 9.87259C8.21022 9.41852 8.26346 9.05492 8.36116 8.78035C8.40921 8.64533 8.46594 8.53766 8.51826 8.4559L8.93376 7.98662C9.3793 7.51755 9.44403 6.72317 9.02189 6.1261L7.7609 4.34262Z" fill="currentColor" />
                </svg>
              </span>
              <div>
                <span className="block text-[10px] font-semibold uppercase leading-4 text-text-muted">
                  For support
                </span>
                <p className="text-sm font-medium text-text-primary">Contact us</p>
              </div>
            </div>

            <span className="hidden h-7 w-px bg-slate-200 xl:block" />

            <div className="hidden items-center gap-5 md:flex">
              <div className="min-w-[112px]">
                {loading ? (
                  <div className="h-10 w-28 rounded-md bg-slate-100 skeleton-shimmer" />
                ) : user ? (
                  <UserMenu />
                ) : (
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center text-accent">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 1.25C9.37666 1.25 7.25001 3.37665 7.25001 6C7.25001 8.62335 9.37666 10.75 12 10.75C14.6234 10.75 16.75 8.62335 16.75 6C16.75 3.37665 14.6234 1.25 12 1.25ZM8.75001 6C8.75001 4.20507 10.2051 2.75 12 2.75C13.7949 2.75 15.25 4.20507 15.25 6C15.25 7.79493 13.7949 9.25 12 9.25C10.2051 9.25 8.75001 7.79493 8.75001 6Z" fill="currentColor" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 12.25C9.68646 12.25 7.55494 12.7759 5.97546 13.6643C4.4195 14.5396 3.25001 15.8661 3.25001 17.5C3.25001 18.8078 3.2097 19.544 4.52642 21.2635C5.15589 21.7761 6.03649 22.1406 7.22622 22.3815C8.41927 22.6229 9.97424 22.75 12 22.75C14.0258 22.75 15.5808 22.6229 16.7738 22.3815C17.9635 22.1406 18.8441 21.7761 19.4736 21.2635C20.7526 20.222 20.75 18.7638 20.75 17.5C20.75 15.8661 19.5805 14.5396 18.0246 13.6643C16.4451 12.7759 14.3136 12.25 12 12.25ZM4.75001 17.5C4.75001 16.6487 5.37139 15.7251 6.71085 14.9717C8.02681 14.2315 9.89529 13.75 12 13.75C14.1047 13.75 15.9732 14.2315 17.2892 14.9717C18.6286 15.7251 19.25 16.6487 19.25 17.5C19.25 18.8078 19.2097 19.544 18.5264 20.1004C18.1559 20.4022 17.5365 20.6967 16.4762 20.9113C15.4193 21.1252 13.9742 21.25 12 21.25C10.0258 21.25 8.58075 21.1252 7.5238 20.9113C6.46354 20.6967 5.84413 20.4022 5.4736 20.1004C4.79033 19.544 4.75001 18.8078 4.75001 17.5Z" fill="currentColor" />
                      </svg>
                    </span>
                    <div className="flex flex-col items-start gap-1">
                      <span className="block text-[10px] font-semibold uppercase leading-4 text-text-muted">
                        Account
                      </span>
                      <Link
                        href="/auth/register"
                        className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hover"
                      >
                        Sign up
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              <WishlistIcon />
              <CartIcon />
            </div>

            <div className="flex items-center gap-1.5 md:hidden">
              <WishlistIcon />
              <CartIcon />
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-white text-text-primary transition-colors hover:border-accent hover:text-accent"
                aria-label="Open menu"
                aria-expanded={mobileOpen}
                aria-controls="mobile-navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </Container>

      <div className="hidden border-t border-slate-200 bg-white xl:block">
        <Container className="max-w-[1170px]">
          <div className="flex items-center justify-between">
            <nav>
              <ul className="flex items-center gap-6 text-sm">
                <li className="group relative before:absolute before:left-0 before:top-0 before:h-[3px] before:w-0 before:rounded-b-[3px] before:bg-accent before:transition-all before:duration-200 hover:before:w-full">
                  <Link href="/" className="flex py-6 font-medium text-text-primary transition-colors hover:text-accent">
                    Home
                  </Link>
                </li>
                <li className="group relative before:absolute before:left-0 before:top-0 before:h-[3px] before:w-0 before:rounded-b-[3px] before:bg-accent before:transition-all before:duration-200 hover:before:w-full">
                  <Link href="/store" className="flex py-6 font-medium text-text-primary transition-colors hover:text-accent">
                    Shop
                  </Link>
                </li>
                <li className="group relative before:absolute before:left-0 before:top-0 before:h-[3px] before:w-0 before:rounded-b-[3px] before:bg-accent before:transition-all before:duration-200 hover:before:w-full">
                  <button type="button" className="flex items-center gap-1.5 py-6 text-sm font-medium text-text-primary transition-colors hover:text-accent" aria-haspopup="true">
                    Categories
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <ul className="invisible absolute left-0 top-full z-50 min-w-[230px] translate-y-4 rounded-lg border border-border bg-white py-2 opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    <li>
                      <Link href="/store" className="flex min-h-11 items-center px-4 py-2 text-sm text-text-muted transition-colors hover:bg-bg-elevated hover:text-accent">
                        All Products
                      </Link>
                    </li>
                    {parentCategories.slice(0, 8).map((category) => (
                      <li key={category.id}>
                        <Link
                          href={`/store?category=${category.slug}`}
                          className="flex min-h-11 items-center px-4 py-2 text-sm capitalize text-text-muted transition-colors hover:bg-bg-elevated hover:text-accent"
                        >
                          {category.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
                <li className="group relative before:absolute before:left-0 before:top-0 before:h-[3px] before:w-0 before:rounded-b-[3px] before:bg-accent before:transition-all before:duration-200 hover:before:w-full">
                  <Link href="/store?sort=rating" className="flex items-center gap-2 py-6 font-medium text-text-primary transition-colors hover:text-accent">
                    Best Sellers
                    <span className="rounded bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase leading-4 text-white">
                      Sale
                    </span>
                  </Link>
                </li>
                <li className="group relative before:absolute before:left-0 before:top-0 before:h-[3px] before:w-0 before:rounded-b-[3px] before:bg-accent before:transition-all before:duration-200 hover:before:w-full">
                  <Link href="/contact" className="flex py-6 font-medium text-text-primary transition-colors hover:text-accent">
                    Contact
                  </Link>
                </li>
                {user && (
                  <li className="group relative before:absolute before:left-0 before:top-0 before:h-[3px] before:w-0 before:rounded-b-[3px] before:bg-accent before:transition-all before:duration-200 hover:before:w-full">
                    <Link href="/account" className="flex py-6 font-medium text-text-primary transition-colors hover:text-accent">
                      Account
                    </Link>
                  </li>
                )}
                {user && hasAdminAccess(user.role) && (
                  <li className="group relative before:absolute before:left-0 before:top-0 before:h-[3px] before:w-0 before:rounded-b-[3px] before:bg-accent before:transition-all before:duration-200 hover:before:w-full">
                    <Link href="/admin" className="flex py-6 font-semibold text-accent transition-colors hover:text-text-primary">
                      Dashboard
                    </Link>
                  </li>
                )}
              </ul>
            </nav>

            <div className="flex items-center gap-4 text-xs font-semibold text-text-muted">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success" />
                Cash on Delivery
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent" />
                Fast Local Delivery
              </span>
            </div>
          </div>
        </Container>
      </div>

      <MobileMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)} categories={parentCategories} />
    </header>
  );
}
