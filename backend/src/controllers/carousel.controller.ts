// backend/src/controllers/carousel.controller.ts
import { Request, Response, NextFunction } from 'express';
import {
  getActiveSlides,
  getAllSlides,
  createSlide,
  updateSlide,
  deleteSlide,
} from '../services/carousel.service';
import { NotFoundError } from '../utils/errors';

// ─── Public ──────────────────────────────────────────────────────────────────

export async function getActive(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const slides = await getActiveSlides();
    res.json({ success: true, slides });
  } catch (err) {
    next(err);
  }
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export async function getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const slides = await getAllSlides();
    res.json({ success: true, slides });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const slide = await createSlide(req.body);
    res.status(201).json({ success: true, slide });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const slide = await updateSlide(parseInt(req.params.id, 10), req.body);
    if (!slide) throw new NotFoundError('Carousel slide');
    res.json({ success: true, slide });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const deleted = await deleteSlide(parseInt(req.params.id, 10));
    if (!deleted) throw new NotFoundError('Carousel slide');
    res.json({ success: true, message: 'Slide deleted' });
  } catch (err) {
    next(err);
  }
}
