import { Request, Response, NextFunction } from 'express';
import {
  createHomepageSection,
  createHomepageSectionItem,
  deleteHomepageSection,
  deleteHomepageSectionItem,
  getActiveHomepageContent,
  getAdminHomepageSections,
  HomepageContent,
  updateHomepageSection,
  updateHomepageSectionItem,
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
