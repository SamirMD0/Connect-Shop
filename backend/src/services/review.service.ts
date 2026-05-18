// backend/src/services/review.service.ts
import { db } from '../db';
import { NotFoundError, ConflictError } from '../utils/errors';

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified: boolean;
  created_at: Date;
}

export class ReviewService {
  /**
   * Get reviews for a product with pagination.
   */
  static async getProductReviews(
    productId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ reviews: Review[]; total: number; page: number; totalPages: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 10;
    const offset = (page - 1) * limit;

    // First check if product exists
    const prodRes = await db.query('SELECT id FROM products WHERE id = $1', [productId]);
    if (prodRes.rows.length === 0) {
      throw new NotFoundError('Product not found');
    }

    const countRes = await db.query('SELECT COUNT(*) FROM reviews WHERE product_id = $1', [productId]);
    const total = parseInt(countRes.rows[0].count, 10);

    const res = await db.query(
      `SELECT r.*, u.name as user_name, u.avatar_url as user_avatar
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [productId, limit, offset]
    );

    return {
      reviews: res.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Create a new review.
   */
  static async createReview(data: {
    productId: string;
    userId: string;
    rating: number;
    title?: string;
    body?: string;
  }): Promise<Review> {
    try {
      const res = await db.query(
        `INSERT INTO reviews (product_id, user_id, rating, title, body)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [data.productId, data.userId, data.rating, data.title || null, data.body || null]
      );
      return res.rows[0];
    } catch (error: any) {
      // 23505 is unique_violation
      if (error.code === '23505') {
        throw new ConflictError('You have already reviewed this product.');
      }
      if (error.code === '23503') {
        throw new NotFoundError('Product not found.');
      }
      throw error;
    }
  }

  /**
   * Delete a review.
   */
  static async deleteReview(id: string, userId: string, isAdmin: boolean): Promise<boolean> {
    const query = isAdmin
      ? 'DELETE FROM reviews WHERE id = $1 RETURNING id'
      : 'DELETE FROM reviews WHERE id = $1 AND user_id = $2 RETURNING id';
    
    const params = isAdmin ? [id] : [id, userId];
    const res = await db.query(query, params);
    
    if (res.rows.length === 0) {
      throw new NotFoundError('Review not found or unauthorized');
    }
    
    return true;
  }
}
