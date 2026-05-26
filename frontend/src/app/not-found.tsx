import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <Container className="flex min-h-[70vh] items-center justify-center py-16">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <SearchX className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold text-text-primary">Page not found</h1>
        <p className="mt-3 text-text-muted">
          The page you are looking for may have moved or is no longer available.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/store">
            <Button>Shop products</Button>
          </Link>
          <Link href="/">
            <Button variant="secondary">Go home</Button>
          </Link>
        </div>
      </div>
    </Container>
  );
}
