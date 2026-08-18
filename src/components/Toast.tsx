import React, { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

export interface ToastProps {
  show: boolean;
  message: string;
  type?: 'success' | 'info' | 'error';
  duration?: number;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  show,
  message,
  type = 'success',
  duration = 2800,
  onClose,
}) => {
  useEffect(() => {
    if (show && duration > 0 && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  return (
    <div
      id="top-toast-notification"
      className="fixed top-4 inset-x-0 z-[9999] flex justify-center pointer-events-none px-4 transition-all duration-300 transform"
    >
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/60 flex items-center gap-3 max-w-md w-auto pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div className="text-xs sm:text-sm font-bold tracking-tight text-slate-100 flex-1">
          {message}
        </div>
        {onClose && (
          <button
            type="button"
            id="btn-close-toast"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800/60 cursor-pointer ml-1"
            aria-label="Tutup notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
