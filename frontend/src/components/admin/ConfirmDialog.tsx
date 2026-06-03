import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <p className="text-sm leading-6 text-slate-700">{description}</p>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#0B1B48] disabled:pointer-events-none disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-110 disabled:pointer-events-none disabled:opacity-60"
          >
            {loading ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
