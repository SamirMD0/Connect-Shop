// backend/src/controllers/wishlist.controller.ts
import { Request, Response, NextFunction } from 'express';
import { WishlistService } from '../services/wishlist.service';

export const getUserWishlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const wishlist = await WishlistService.getUserWishlist(userId);
    res.json({ success: true, wishlist });
  } catch (error) {
    next(error);
  }
};

export const addToWishlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { productId } = req.body;

    const wishlistItem = await WishlistService.addToWishlist(userId, productId);
    res.status(201).json({ success: true, item: wishlistItem });
  } catch (error) {
    next(error);
  }
};

export const removeFromWishlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { productId } = req.params;

    await WishlistService.removeFromWishlist(userId, productId);
    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (error) {
    next(error);
  }
};
