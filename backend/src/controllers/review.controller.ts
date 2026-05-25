// backend/src/controllers/review.controller.ts
import { Request, Response, NextFunction } from 'express';
import { hasAdminPermission } from '../middleware/admin';
import { ReviewService } from '../services/review.service';

export const getProductReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const result = await ReviewService.getProductReviews(productId, { page, limit });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const createReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const userId = req.user!.id;
    const { rating, title, body } = req.body;

    const review = await ReviewService.createReview({
      productId,
      userId,
      rating,
      title,
      body,
    });

    res.status(201).json({ success: true, review });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const isAdmin = hasAdminPermission(req.user, 'reviews');

    await ReviewService.deleteReview(id, userId, isAdmin);
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    next(error);
  }
};
