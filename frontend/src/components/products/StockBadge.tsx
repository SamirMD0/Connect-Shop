import { Badge } from '@/components/ui/Badge';

interface StockBadgeProps {
  stock: number;
}

export function StockBadge({ stock }: StockBadgeProps) {
  if (stock === 0) {
    return <Badge variant="danger">Out of Stock</Badge>;
  }
  if (stock <= 10) {
    return <Badge variant="warning">Low Stock — {stock} left</Badge>;
  }
  return <Badge variant="success">In Stock</Badge>;
}
