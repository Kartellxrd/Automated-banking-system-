'use client';

import { AlertTriangle, Loader2, X } from 'lucide-react';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const destructive = tone === 'danger';
  const caution = tone === 'warning';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 rounded-2xl p-2.5 ${destructive ? 'bg-rose-50 text-rose-600' : caution ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 id="confirm-dialog-title" className="text-lg font-black text-slate-950">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>
            </div>
          </div>
          <button type="button" disabled={busy} onClick={onCancel} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40" aria-label="Close confirmation dialog">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col-reverse gap-2 bg-slate-50 p-4 sm:flex-row sm:justify-end sm:p-5">
          <button type="button" disabled={busy} onClick={onCancel} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
            {cancelLabel}
          </button>
          <button type="button" disabled={busy} onClick={onConfirm} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white disabled:opacity-50 ${destructive ? 'bg-rose-600 hover:bg-rose-500' : caution ? 'bg-amber-600 hover:bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
