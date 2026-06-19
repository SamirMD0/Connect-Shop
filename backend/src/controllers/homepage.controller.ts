import { Request, Response, NextFunction } from 'express';
import {
  createHomepageSection,
  createHomepageSectionItem,
  createHomepageBlock,
  createHomepageBrandProductSection,
  createHomepageCategoryProductSection,
  deleteHomepageBlock,
  deleteHomepageSection,
  deleteHomepageSectionItem,
  deleteHomepageBrandProductSection,
  deleteHomepageCategoryProductSection,
  getActiveHomepageContent,
  getAdminHomepageBlocks,
  getAdminHomepageSections,
  getAdminHomepageBrandProductSections,
  getAdminHomepageCategoryProductSections,
  HomepageContent,
  moveHomepageBlock,
  moveHomepageBrandProductSection,
  moveHomepageCategoryProductSection,
  createEmptyHomepageContent,
  resetHomepageBlocksToDefaults,
  updateHomepageBlock,
  updateHomepageSection,
  updateHomepageSectionItem,
  updateHomepageBrandProductSection,
  updateHomepageCategoryProductSection,
} from '../services/homepage.service';
import { getActiveSlides } from '../services/carousel.service';
import { getBrands, getCategories, getFeaturedProducts, listProducts } from '../services/products.service';
import { getJsonCache, setJsonCache } from '../config/redis';
import { CACHE_KEYS, CACHE_TTL_SECONDS } from '../utils/cachePolicy';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

type HomepageAggregateSection =
  | 'featuredProducts'
  | 'trendingProducts'
  | 'categories'
  | 'brands'
  | 'carouselSlides'
  | 'homepage';

interface HomepageAggregateData {
  featuredProducts: Awaited<ReturnType<typeof getFeaturedProducts>>;
  trendingProducts: Awaited<ReturnType<typeof getFeaturedProducts>>;
  categories: Awaited<ReturnType<typeof getCategories>>;
  brands: Awaited<ReturnType<typeof getBrands>>;
  carouselSlides: Awaited<ReturnType<typeof getActiveSlides>>;
  homepage: HomepageContent;
}

interface HomepageAggregateResponse {
  success: true;
  data: HomepageAggregateData;
  partialFailures: HomepageAggregateSection[];
}

async function safelyResolveHomepageSection<T>(
  section: HomepageAggregateSection,
  fallback: T,
  load: () => Promise<T>
): Promise<{ value: T; failed: boolean }> {
  try {
    return { value: await load(), failed: false };
  } catch (error) {
    logger.error({ err: error, section }, 'Homepage aggregate section failed');
    return { value: fallback, failed: true };
  }
}

export async function getPublicHomepage(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const cached = await getJsonCache<HomepageContent>(CACHE_KEYS.homepageActive);
    if (cached) {
      res.json({ success: true, homepage: cached });
      return;
    }

    const homepage = await getActiveHomepageContent();
    await setJsonCache(CACHE_KEYS.homepageActive, homepage, CACHE_TTL_SECONDS.homepage);
    res.json({ success: true, homepage });
  } catch (err) {
    next(err);
  }
}

export async function getPublicHomepageFull(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const cached = await getJsonCache<HomepageAggregateResponse>(CACHE_KEYS.homepageFull);
    if (cached) {
      res.json(cached);
      return;
    }

    const [
      featuredProducts,
      trendingProducts,
      categories,
      brands,
      carouselSlides,
      homepage,
    ] = await Promise.all([
      safelyResolveHomepageSection('featuredProducts', [], () => getFeaturedProducts()),
      safelyResolveHomepageSection('trendingProducts', [], async () => (
        await listProducts({ sort: 'rating', limit: 8 })
      ).products),
      safelyResolveHomepageSection('categories', [], () => getCategories()),
      safelyResolveHomepageSection('brands', [], async () => (
        await getBrands()
      ).filter((brand) => brand.is_active)),
      safelyResolveHomepageSection('carouselSlides', [], () => getActiveSlides()),
      safelyResolveHomepageSection('homepage', createEmptyHomepageContent(), () => getActiveHomepageContent()),
    ]);
    const partialFailures = [
      featuredProducts.failed ? 'featuredProducts' : null,
      trendingProducts.failed ? 'trendingProducts' : null,
      categories.failed ? 'categories' : null,
      brands.failed ? 'brands' : null,
      carouselSlides.failed ? 'carouselSlides' : null,
      homepage.failed ? 'homepage' : null,
    ].filter((section): section is HomepageAggregateSection => section !== null);
    const data: HomepageAggregateData = {
      featuredProducts: featuredProducts.value,
      trendingProducts: trendingProducts.value,
      categories: categories.value,
      brands: brands.value,
      carouselSlides: carouselSlides.value,
      homepage: homepage.value,
    };
    const responseBody: HomepageAggregateResponse = {
      success: true,
      data,
      partialFailures,
    };

    if (partialFailures.length === 0) {
      await setJsonCache(CACHE_KEYS.homepageFull, responseBody, CACHE_TTL_SECONDS.homepageFull);
    }

    res.json(responseBody);
  } catch (err) {
    next(err);
  }
}

export async function getAdminHomepage(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sections = await getAdminHomepageSections();
    res.json({ success: true, sections });
  } catch (err) {
    next(err);
  }
}

export async function getAdminBlocks(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const blocks = await getAdminHomepageBlocks();
    res.json({ success: true, blocks });
  } catch (err) {
    next(err);
  }
}

export async function createBlock(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const block = await createHomepageBlock(req.body);
    res.status(201).json({ success: true, block });
  } catch (err) {
    next(err);
  }
}

export async function updateBlock(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const block = await updateHomepageBlock(req.params.id, req.body);
    if (!block) throw new NotFoundError('Homepage block');
    res.json({ success: true, block });
  } catch (err) {
    next(err);
  }
}

export async function deleteBlock(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const deleted = await deleteHomepageBlock(req.params.id);
    if (!deleted) throw new NotFoundError('Homepage block');
    res.json({ success: true, message: 'Homepage block deleted' });
  } catch (err) {
    next(err);
  }
}

export async function moveBlockUp(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const block = await moveHomepageBlock(req.params.id, 'up');
    if (!block) throw new NotFoundError('Homepage block');
    res.json({ success: true, block });
  } catch (err) {
    next(err);
  }
}

export async function moveBlockDown(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const block = await moveHomepageBlock(req.params.id, 'down');
    if (!block) throw new NotFoundError('Homepage block');
    res.json({ success: true, block });
  } catch (err) {
    next(err);
  }
}

export async function resetBlocksToDefaults(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const blocks = await resetHomepageBlocksToDefaults();
    res.json({ success: true, blocks });
  } catch (err) {
    next(err);
  }
}

export async function getAdminBrandProductSections(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sections = await getAdminHomepageBrandProductSections();
    res.json({ success: true, sections });
  } catch (err) {
    next(err);
  }
}

export async function createBrandProductSection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const section = await createHomepageBrandProductSection(req.body);
    res.status(201).json({ success: true, section });
  } catch (err) {
    next(err);
  }
}

export async function updateBrandProductSection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const section = await updateHomepageBrandProductSection(req.params.id, req.body);
    if (!section) throw new NotFoundError('Homepage brand product section');
    res.json({ success: true, section });
  } catch (err) {
    next(err);
  }
}

export async function deleteBrandProductSection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const deleted = await deleteHomepageBrandProductSection(req.params.id);
    if (!deleted) throw new NotFoundError('Homepage brand product section');
    res.json({ success: true, message: 'Homepage brand product section deleted' });
  } catch (err) {
    next(err);
  }
}

export async function moveBrandProductSectionUp(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const section = await moveHomepageBrandProductSection(req.params.id, 'up');
    if (!section) throw new NotFoundError('Homepage brand product section');
    res.json({ success: true, section });
  } catch (err) {
    next(err);
  }
}

export async function moveBrandProductSectionDown(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const section = await moveHomepageBrandProductSection(req.params.id, 'down');
    if (!section) throw new NotFoundError('Homepage brand product section');
    res.json({ success: true, section });
  } catch (err) {
    next(err);
  }
}

export async function getAdminCategoryProductSections(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sections = await getAdminHomepageCategoryProductSections();
    res.json({ success: true, sections });
  } catch (err) {
    next(err);
  }
}

export async function createCategoryProductSection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const section = await createHomepageCategoryProductSection(req.body);
    res.status(201).json({ success: true, section });
  } catch (err) {
    next(err);
  }
}

export async function updateCategoryProductSection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const section = await updateHomepageCategoryProductSection(req.params.id, req.body);
    if (!section) throw new NotFoundError('Homepage category product section');
    res.json({ success: true, section });
  } catch (err) {
    next(err);
  }
}

export async function deleteCategoryProductSection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const deleted = await deleteHomepageCategoryProductSection(req.params.id);
    if (!deleted) throw new NotFoundError('Homepage category product section');
    res.json({ success: true, message: 'Homepage category product section deleted' });
  } catch (err) {
    next(err);
  }
}

export async function moveCategoryProductSectionUp(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const section = await moveHomepageCategoryProductSection(req.params.id, 'up');
    if (!section) throw new NotFoundError('Homepage category product section');
    res.json({ success: true, section });
  } catch (err) {
    next(err);
  }
}

export async function moveCategoryProductSectionDown(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const section = await moveHomepageCategoryProductSection(req.params.id, 'down');
    if (!section) throw new NotFoundError('Homepage category product section');
    res.json({ success: true, section });
  } catch (err) {
    next(err);
  }
}

export async function createSection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const section = await createHomepageSection(req.body);
    res.status(201).json({ success: true, section });
  } catch (err) {
    next(err);
  }
}

export async function updateSection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const section = await updateHomepageSection(req.params.id, req.body);
    if (!section) throw new NotFoundError('Homepage section');
    res.json({ success: true, section });
  } catch (err) {
    next(err);
  }
}

export async function deleteSection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const deleted = await deleteHomepageSection(req.params.id);
    if (!deleted) throw new NotFoundError('Homepage section');
    res.json({ success: true, message: 'Homepage section deleted' });
  } catch (err) {
    next(err);
  }
}

export async function createSectionItem(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const item = await createHomepageSectionItem(req.params.id, req.body);
    if (!item) throw new NotFoundError('Homepage section');
    res.status(201).json({ success: true, item });
  } catch (err) {
    next(err);
  }
}

export async function updateSectionItem(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const item = await updateHomepageSectionItem(req.params.id, req.body);
    if (!item) throw new NotFoundError('Homepage section item');
    res.json({ success: true, item });
  } catch (err) {
    next(err);
  }
}

export async function deleteSectionItem(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const deleted = await deleteHomepageSectionItem(req.params.id);
    if (!deleted) throw new NotFoundError('Homepage section item');
    res.json({ success: true, message: 'Homepage section item deleted' });
  } catch (err) {
    next(err);
  }
}
