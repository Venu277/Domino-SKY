import React from 'react';

export type PillVariant = 'neutral' | 'ontime' | 'delayed' | 'cancelled' | 'accent';

interface PillProps {
  label: string;
  variant?: PillVariant;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export const Pill: React.FC<PillProps> = ({
  label,
  variant = 'neutral',
  icon,
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-[11px] py-0.5 px-2 gap-1 font-medium',
    md: 'text-[12px] py-1 px-2.5 gap-1.5 font-medium',
  }[size];

  const variantStyles = {
    neutral:
      'bg-[#E5E5EA]/70 dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#98989D]',
    ontime:
      'bg-[#34C759]/12 text-[#248A3D] dark:text-[#30D158] border border-[#34C759]/20',
    delayed:
      'bg-[#FF9F0A]/12 text-[#B25E00] dark:text-[#FF9F0A] border border-[#FF9F0A]/20',
    cancelled:
      'bg-[#FF3B30]/12 text-[#D70015] dark:text-[#FF453A] border border-[#FF3B30]/20',
    accent:
      'bg-[#0071E3]/12 text-[#0071E3] border border-[#0071E3]/20',
  }[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full tracking-tight ${sizeStyles} ${variantStyles} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
    </span>
  );
};
