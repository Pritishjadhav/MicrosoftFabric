'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';

interface ConfirmDeleteDialogProps {
  fileName: string;
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteDialog({
  fileName,
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
}: ConfirmDeleteDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button when dialog opens
  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen) return null;

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-desc"
    >
      {/* Backdrop */}
      <div
        className="dialog-overlay absolute inset-0"
        onClick={!isDeleting ? onCancel : undefined}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 fade-in">
        {/* Close button */}
        {!isDeleting && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        )}

        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-5">
          <AlertTriangle size={22} className="text-red-500" />
        </div>

        {/* Content */}
        <h2
          id="delete-dialog-title"
          className="text-lg font-semibold text-slate-800 mb-2"
        >
          Delete File?
        </h2>
        <p id="delete-dialog-desc" className="text-slate-500 text-sm mb-1 leading-relaxed">
          Are you sure you want to delete{' '}
          <span className="font-medium text-slate-700 break-all">&ldquo;{fileName}&rdquo;</span>?
        </p>
        <p className="text-slate-400 text-xs mb-6">
          This will permanently remove the file from Microsoft Fabric OneLake. This action cannot be undone.
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={isDeleting}
            className="btn btn-secondary"
            aria-label="Cancel deletion"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="btn btn-danger flex items-center gap-2"
            aria-label={`Confirm deletion of ${fileName}`}
          >
            {isDeleting ? (
              <>
                <Loader2 size={15} className="spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={15} />
                Delete File
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
