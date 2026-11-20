import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  ...props
}) => {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6 sm:p-7',
    lg: 'p-8 sm:p-10',
  }[padding];

  return (
    <div
      className={`bg-white dark:bg-[#1C1C1E] border border-[#D2D2D7]/60 dark:border-[#38383A] rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] ${paddingStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
