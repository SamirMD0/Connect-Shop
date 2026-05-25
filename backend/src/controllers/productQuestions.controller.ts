import { Request, Response, NextFunction } from 'express';
import { query } from '../config/db';
import { NotFoundError } from '../utils/errors';

interface ProductQuestion {
  id: string;
  product_id: string;
  user_id: string | null;
  user_name: string | null;
  question: string;
  answer: string | null;
  answered_at: Date | null;
  created_at: Date;
}

async function getProductId(slug: string): Promise<string> {
  const rows = await query<{ id: string }>('SELECT id FROM products WHERE slug = $1', [slug]);
  if (!rows[0]) {
    throw new NotFoundError('Product');
  }
  return rows[0].id;
}

export async function listQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const productId = await getProductId(req.params.slug);
    const questions = await query<ProductQuestion>(
      `SELECT pq.*, u.name AS user_name
       FROM product_questions pq
       LEFT JOIN users u ON u.id = pq.user_id
       WHERE pq.product_id = $1
       ORDER BY pq.created_at DESC`,
      [productId]
    );

    res.json({ success: true, questions });
  } catch (err) {
    next(err);
  }
}

export async function createQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const productId = await getProductId(req.params.slug);
    const rows = await query<ProductQuestion>(
      `INSERT INTO product_questions (product_id, user_id, question)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [productId, req.user!.id, req.body.question.trim()]
    );

    res.status(201).json({
      success: true,
      question: {
        ...rows[0],
        user_name: req.user!.name,
      },
    });
  } catch (err) {
    next(err);
  }
}
