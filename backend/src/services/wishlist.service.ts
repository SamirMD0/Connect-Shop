// backend/src/services/wishlist.service.ts
import { pool as db } from '../config/db';
import { NotFoundError, ConflictError } from '../utils/errors';

export interface WishlistItem {
  user_id: string;
  product_id: string;
  created_at: Date;
  // Joined fields
  product_name?: string;
  product_slug?: string;
  product_price?: number;
  product_image?: string;
  product_stock?: number;
}

export class WishlistService {
  /**
   * Get wishlist for a user.
   */
  static async getUserWishlist(userId: string): Promise<WishlistItem[]> {
    const res = await db.query(
      `SELECT w.*, p.name as product_name, p.slug as product_slug, p.price as product_price, p.image_url as product_image, p.stock as product_stock
       FROM wishlists w
       JOIN products p ON w.product_id = p.id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [userId]
    );

    return res.rows;
  }

  /**
   * Add a product to the wishlist.
   */
  static async addToWishlist(userId: string, productId: string): Promise<WishlistItem> {
    try {
      const res = await db.query(
        `INSERT INTO wishlists (user_id, product_id)
         VALUES ($1, $2)
         RETURNING *`,
        [userId, productId]
      );
      return res.rows[0];
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictError('Product is already in your wishlist.');
      }
      if (error.code === '23503') {
        throw new NotFoundError('Product not found.');
      }
      throw error;
    }
  }

  /**
   * Remove a product from the wishlist.
   */
  static async removeFromWishlist(userId: string, productId: string): Promise<boolean> {
    const res = await db.query(
      'DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2 RETURNING user_id',
      [userId, productId]
    );
    
    if (res.rows.length === 0) {
      throw new NotFoundError('Product not found in your wishlist');
    }
    
    return true;
  }
}
