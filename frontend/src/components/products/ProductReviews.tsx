'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { RatingStars } from './RatingStars';
import { Button } from '@/components/ui/Button';
import { Star, User } from 'lucide-react';

interface Review {
  id: string;
  user_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
}

export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadReviews() {
      try {
        const res = await api.get<{ success: boolean; reviews: Review[] }>(`/api/reviews/${productId}`);
        if (res.reviews) {
          setReviews(res.reviews);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadReviews();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSubmitting(true);
    try {
      const res = await api.post<{ success: boolean; review: any }>(`/api/reviews/${productId}`, {
        rating,
        title,
        body
      });
      setReviews([{ ...res.review, user_name: user.name }, ...reviews]);
      setShowForm(false);
      setTitle('');
      setBody('');
      setRating(5);
      addToast('Review submitted successfully!', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to submit review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-16 border-t border-slate-200/60 pt-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-text-primary">Customer Reviews</h2>
        {user ? (
          <Button variant="outline" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Write a Review'}
          </Button>
        ) : (
          <p className="text-sm text-text-muted">Sign in to write a review</p>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 mb-8 animate-fade-in">
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-primary mb-2">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 focus:outline-none"
                >
                  <Star className={`w-6 h-6 ${star <= rating ? 'fill-accent text-accent' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-primary mb-2">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
              placeholder="Summary of your review"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-2">Review</label>
            <textarea
              required
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
              placeholder="What did you think about this product?"
            />
          </div>
          <Button type="submit" variant="primary" loading={submitting}>
            Submit Review
          </Button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-text-muted py-8 text-center bg-slate-50 rounded-2xl border border-slate-200/60">
          No reviews yet. Be the first to review this product!
        </p>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center text-accent">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">{review.user_name}</p>
                    <p className="text-xs text-text-muted">
                      {new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <RatingStars rating={review.rating} reviewCount={0} showCount={false} />
              </div>
              {review.title && <h4 className="font-semibold text-text-primary mb-2">{review.title}</h4>}
              {review.body && <p className="text-text-muted leading-relaxed">{review.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
