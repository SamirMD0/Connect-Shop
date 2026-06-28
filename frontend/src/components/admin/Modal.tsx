import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'default' | 'wide';
}

export function Modal({ isOpen, onClose, title, children, size = 'default' }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div 
        className="fixed inset-0 bg-slate-950/35 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      <div
        className={`relative z-10 flex max-h-[85vh] sm:max-h-[90vh] w-full animate-scale-in flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/60 sm:my-8 m-2 sm:m-0 ${size === 'wide' ? 'max-w-5xl' : 'max-w-lg'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/70 px-6 py-4">
          <h3 id={titleId} className="text-lg font-semibold text-[#0B1B48]">{title}</h3>
          <button 
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-slate-100 hover:text-[#0B1B48] focus:outline-none focus:ring-2 focus:ring-accent/20"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
