// backend/src/services/review.service.ts
import { pool as db } from '../config/db';
import { NotFoundError, ConflictError } from '../utils/errors';

export interface Review {
  id: string;
  product_id: string;
  product_name?: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  user_email?: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: 'pending' | 'published' | 'hidden' | 'rejected';
  is_verified: boolean;
  moderated_by: string | null;
  moderated_at: Date | null;
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

    const countRes = await db.query(
      `SELECT COUNT(*) FROM reviews WHERE product_id = $1 AND status = 'published'`,
      [productId]
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const res = await db.query(
      `SELECT r.*, u.name as user_name, u.avatar_url as user_avatar
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = $1 AND r.status = 'published'
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

  static async listReviewsForModeration(options: {
    page?: number;
    limit?: number;
    status?: Review['status'] | 'all';
  } = {}): Promise<{ reviews: Review[]; total: number; page: number; totalPages: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const offset = (page - 1) * limit;
    const status = options.status || 'all';
    const params: any[] = [];
    const where = status === 'all' ? '' : 'WHERE r.status = $1';

    if (status !== 'all') {
      params.push(status);
    }

    const countRes = await db.query(
      `SELECT COUNT(*)
       FROM reviews r
       ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const res = await db.query(
      `SELECT r.*,
              p.name AS product_name,
              u.name AS user_name,
              u.email AS user_email,
              u.avatar_url AS user_avatar
       FROM reviews r
       JOIN products p ON p.id = r.product_id
       JOIN users u ON u.id = r.user_id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      reviews: res.rows,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  static async moderateReview(
    id: string,
    status: Review['status'],
    moderatorId: string
  ): Promise<Review> {
    const allowedStatuses = new Set(['pending', 'published', 'hidden', 'rejected']);
    if (!allowedStatuses.has(status)) {
      throw new ConflictError('Invalid review status.');
    }

    const rows = await db.query(
      `UPDATE reviews
       SET status = $1,
           moderated_by = $2,
           moderated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, moderatorId, id]
    );

    if (rows.rows.length === 0) {
      throw new NotFoundError('Review not found');
    }

    return rows.rows[0];
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
