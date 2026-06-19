'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { api, getErrorMessage } from '../../../lib/api';
import { DataTable } from '../../../components/admin/DataTable';
import { ConfirmDialog } from '../../../components/admin/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

type ReviewStatus = 'all' | 'pending' | 'published' | 'hidden' | 'rejected';

interface Review {
  id: string;
  product_id: string;
  product_name: string;
  user_id: string;
  user_name: string;
  user_email: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: Exclude<ReviewStatus, 'all'>;
  created_at: string;
}

const statuses: ReviewStatus[] = ['all', 'pending', 'published', 'hidden', 'rejected'];

const statusClasses: Record<string, string> = {
  pending: 'bg-warning/15 text-warning',
  published: 'bg-success/15 text-success',
  hidden: 'bg-slate-100 text-slate-600',
  rejected: 'bg-danger/15 text-danger',
};

export default function AdminReviewsPage() {
  const { addToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [status, setStatus] = useState<ReviewStatus>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);

  async function fetchReviews() {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; reviews: Review[]; totalPages: number }>('/api/admin/reviews', {
        params: { page, limit: 20, status },
      });
      if (res.success) {
        setReviews(res.reviews);
        setTotalPages(res.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  async function updateReviewStatus(reviewId: string, nextStatus: Exclude<ReviewStatus, 'all'>) {
    try {
      setUpdatingId(reviewId);
      const res = await api.put<{ success: boolean; review: Review }>(`/api/admin/reviews/${reviewId}/status`, {
        status: nextStatus,
      });
      if (res.success) {
        setReviews(current => current.map(review => (
          review.id === reviewId ? { ...review, status: res.review.status } : review
        )));
      }
    } catch (error: unknown) {
      addToast(getErrorMessage(error, 'Failed to update review.'), 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteReview() {
    if (!reviewToDelete) return;

    try {
      setUpdatingId(reviewToDelete.id);
      await api.delete(`/api/admin/reviews/${reviewToDelete.id}`);
      setReviews(current => current.filter(review => review.id !== reviewToDelete.id));
      setReviewToDelete(null);
      addToast('Review deleted.', 'success');
    } catch (error: unknown) {
      addToast(getErrorMessage(error, 'Failed to delete review.'), 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  const columns = [
    {
      header: 'Review',
      cell: (review: Review) => (
        <div className="max-w-md whitespace-normal">
          <p className="font-semibold text-[#0B1B48]">{review.title || 'Untitled review'}</p>
          {review.body && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{review.body}</p>}
          <p className="mt-2 text-xs text-slate-500">{new Date(review.created_at).toLocaleString()}</p>
        </div>
      ),
    },
    {
      header: 'Product',
      cell: (review: Review) => (
        <div className="max-w-xs whitespace-normal">
          <p className="text-sm font-medium text-[#0B1B48]">{review.product_name}</p>
          <p className="text-xs font-mono text-slate-500">{review.product_id.slice(0, 8)}</p>
        </div>
      ),
    },
    {
      header: 'Customer',
      cell: (review: Review) => (
        <div>
          <p className="text-sm font-medium text-[#0B1B48]">{review.user_name}</p>
          <p className="text-xs text-slate-500">{review.user_email}</p>
        </div>
      ),
    },
    { header: 'Rating', cell: (review: Review) => `${review.rating}/5` },
    {
      header: 'Status',
      cell: (review: Review) => (
        <select
          value={review.status}
          disabled={updatingId === review.id}
          onChange={event => void updateReviewStatus(review.id, event.target.value as Exclude<ReviewStatus, 'all'>)}
          className={`rounded-full border border-transparent px-2.5 py-1.5 text-xs font-semibold outline-none hover:border-slate-300 ${statusClasses[review.status] || 'bg-slate-100 text-slate-600'}`}
        >
          <option value="pending">Pending</option>
          <option value="published">Published</option>
          <option value="hidden">Hidden</option>
          <option value="rejected">Rejected</option>
        </select>
      ),
    },
    {
      header: 'Actions',
      cell: (review: Review) => (
        <button
          onClick={() => setReviewToDelete(review)}
          disabled={updatingId === review.id}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      ),
    },
  ];

  if (loading) return <DataTable data={[]} columns={columns} keyExtractor={review => review.id} loading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B48]">Reviews</h1>
          <p className="mt-1 text-sm text-slate-500">Moderate customer reviews and publication status.</p>
        </div>
        <select
          value={status}
          onChange={event => {
            setStatus(event.target.value as ReviewStatus);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#0B1B48] outline-none transition-colors focus:border-accent"
        >
          {statuses.map(option => (
            <option key={option} value={option}>
              {option === 'all' ? 'All statuses' : option.charAt(0).toUpperCase() + option.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <DataTable data={reviews} columns={columns} keyExtractor={review => review.id} emptyMessage="No reviews found" />

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
          <button
            onClick={() => setPage(current => Math.max(1, current - 1))}
            disabled={page === 1}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#0B1B48] disabled:pointer-events-none disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(current => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#0B1B48] disabled:pointer-events-none disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
      <ConfirmDialog
        isOpen={Boolean(reviewToDelete)}
        title="Delete review"
        description="This will permanently remove the selected review from the admin list. This action cannot be undone."
        confirmLabel="Delete review"
        loading={Boolean(reviewToDelete && updatingId === reviewToDelete.id)}
        onCancel={() => setReviewToDelete(null)}
        onConfirm={() => void deleteReview()}
      />
    </div>
  );
}
