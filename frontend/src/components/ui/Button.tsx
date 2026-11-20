import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'pill-accent' | 'pill-outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'text-[13px] py-1.5 px-3.5 gap-1.5 rounded-[10px]',
    md: 'text-[14px] py-2 px-4 gap-2 rounded-[12px]',
    lg: 'text-[15px] py-3 px-6 gap-2.5 rounded-[14px]',
  }[size];

  const variantClasses = {
    primary:
      'bg-[#0071E3] hover:bg-[#0077ED] active:bg-[#0062C4] text-white font-medium shadow-[0_1px_2px_rgba(0,113,227,0.25)] hover:shadow-[0_4px_12px_rgba(0,113,227,0.3)] transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
    secondary:
      'bg-[#F5F5F7] hover:bg-[#EAEAEA] active:bg-[#DFDFE2] dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] text-[#1D1D1F] dark:text-[#F5F5F7] border border-[#D2D2D7]/60 dark:border-[#38383A] font-medium transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
    ghost:
      'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-[#1D1D1F] dark:text-[#F5F5F7] transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
    'pill-accent':
      'bg-[#0071E3] hover:bg-[#0077ED] active:bg-[#0062C4] text-white rounded-full font-medium transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
    'pill-outline':
      'bg-transparent border border-[#D2D2D7] dark:border-[#38383A] hover:bg-black/5 dark:hover:bg-white/5 text-[#1D1D1F] dark:text-[#F5F5F7] rounded-full font-medium transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center select-none ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
