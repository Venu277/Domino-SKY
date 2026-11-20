import React from 'react';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: SegmentedProps<T>) {
  const sizeStyles = {
    sm: 'p-0.5 text-[12px]',
    md: 'p-1 text-[13px]',
  }[size];

  const itemSizeStyles = {
    sm: 'py-1 px-2.5 rounded-[7px]',
    md: 'py-1.5 px-3 rounded-[9px]',
  }[size];

  return (
    <div
      className={`inline-flex items-center bg-[#E5E5EA]/70 dark:bg-[#2C2C2E] rounded-[11px] select-none ${sizeStyles} ${className}`}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${itemSizeStyles} ${
              isActive
                ? 'bg-white dark:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
            }`}
          >
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-[#E5E5EA] dark:bg-[#48484A] text-[#1D1D1F] dark:text-[#F5F5F7]'
                    : 'bg-black/5 dark:bg-white/5 text-[#6E6E73]'
                }`}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
