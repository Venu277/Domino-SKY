import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide-in Sheet */}
      <div
        className="relative w-full max-w-[540px] h-full bg-white dark:bg-[#1C1C1E] border-l border-[#D2D2D7]/80 dark:border-[#38383A] shadow-[-8px_0_32px_rgba(0,0,0,0.12)] flex flex-col z-10 transform transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#D2D2D7]/60 dark:border-[#38383A] flex items-center justify-between">
          <div>
            <h3 className="text-[19px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[13px] text-[#6E6E73] dark:text-[#98989D] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors cursor-pointer"
            aria-label="Close sheet"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  );
};
