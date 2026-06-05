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
  resetHomepageBlocksToDefaults,
  updateHomepageBlock,
  updateHomepageSection,
  updateHomepageSectionItem,
  updateHomepageBrandProductSection,
  updateHomepageCategoryProductSection,
} from '../services/homepage.service';
import { getJsonCache, setJsonCache } from '../config/redis';
import { CACHE_KEYS, CACHE_TTL_SECONDS } from '../utils/cachePolicy';
import { NotFoundError } from '../utils/errors';

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
