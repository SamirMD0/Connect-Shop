'use client';

import { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search products...',
  ariaLabel = 'Search products',
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: string) => {
    const sanitized = DOMPurify.sanitize(newValue);
    setLocalValue(sanitized);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      onChange(sanitized);
    }, 300);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full pl-12 pr-10 py-3 rounded-xl bg-bg-surface border border-slate-200 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
