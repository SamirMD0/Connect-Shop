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
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="min-h-11 w-full rounded-lg border border-border bg-bg-surface py-2.5 pl-10 pr-12 text-sm text-text-primary transition-[border-color,box-shadow] placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-text-muted transition-colors hover:text-text-primary"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
