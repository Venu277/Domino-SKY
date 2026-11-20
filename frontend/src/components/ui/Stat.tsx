import React, { useEffect, useState } from 'react';
import { Pill, type PillVariant } from './Pill.js';

interface StatProps {
  label: string;
  value: number;
  delta?: number;
  deltaLabel?: string;
  variant?: PillVariant;
  unit?: string;
  caption?: string;
  size?: 'normal' | 'compact';
}

export const Stat: React.FC<StatProps> = ({
  label,
  value,
  delta,
  deltaLabel,
  variant = 'neutral',
  unit,
  caption,
  size = 'normal',
}) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = displayValue;
    const endValue = value;
    const duration = 600; // 600ms count-up as per spec

    if (startValue === endValue) return;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Apple easeOutQuart curve
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(startValue + (endValue - startValue) * ease);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };

    const animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [value]);

  const isCompact = size === 'compact';

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[13px] font-medium text-[#6E6E73] dark:text-[#98989D] uppercase tracking-wider">
          {label}
        </span>
        {delta !== undefined && delta !== 0 && (
          <Pill
            label={`${delta > 0 ? '+' : ''}${delta.toLocaleString()} ${deltaLabel || ''}`.trim()}
            variant={variant}
            size="sm"
          />
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span
          className={`tnum font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight ${
            isCompact ? 'text-[32px] leading-[36px]' : 'text-[48px] sm:text-[56px] leading-[54px] sm:leading-[60px]'
          }`}
        >
          {displayValue.toLocaleString()}
        </span>
        {unit && (
          <span className="text-[15px] font-normal text-[#6E6E73] dark:text-[#98989D]">
            {unit}
          </span>
        )}
      </div>

      {caption && (
        <span className="text-[12px] text-[#6E6E73] dark:text-[#98989D] mt-2 leading-tight">
          {caption}
        </span>
      )}
    </div>
  );
};
