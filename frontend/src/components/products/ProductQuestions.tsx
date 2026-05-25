'use client';

import { useEffect, useState } from 'react';
import { HelpCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';

interface Question {
  id: string;
  user_name: string | null;
  question: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
}

export function ProductQuestions({ slug }: { slug: string }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<{ success: boolean; questions: Question[] }>(`/api/products/${slug}/questions`)
      .then((res) => setQuestions(res.questions || []))
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, [slug]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || question.trim().length < 5) return;

    setSubmitting(true);
    try {
      const res = await api.post<{ success: boolean; question: Question }>(`/api/products/${slug}/questions`, {
        question,
      });
      setQuestions([res.question, ...questions]);
      setQuestion('');
      addToast('Question submitted', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to submit question', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-16 border-t border-slate-200/60 pt-16">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-text-primary">Product Q&A</h2>
        {!user && <p className="text-sm text-text-muted">Sign in to ask a question</p>}
      </div>

      {user && (
        <form onSubmit={submit} className="mb-8 rounded-2xl border border-slate-200/60 bg-slate-50 p-5">
          <label className="mb-2 block text-sm font-medium text-text-primary">Ask about this product</label>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={3}
            maxLength={1000}
            className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
            placeholder="Compatibility, warranty, delivery, or product details"
          />
          <Button type="submit" loading={submitting} disabled={question.trim().length < 5}>
            Submit Question
          </Button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/60 bg-slate-50 py-8 text-center text-text-muted">
          <HelpCircle className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          No questions yet.
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{item.user_name || 'Customer'}</p>
                  <p className="text-xs text-text-muted">{new Date(item.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-text-primary">{item.question}</p>
              {item.answer && (
                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase text-accent">ElecSHOP answer</p>
                  <p className="text-sm text-text-muted">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
