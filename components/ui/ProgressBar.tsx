'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface ProgressBarProps {
  label?: string;
  current: number;
  max: number;
  unit?: string;
  autoStatusColor?: boolean;
  color?: 'mint' | 'peach' | 'butter' | 'softblue' | 'red' | 'yellow' | 'green';
  size?: 'sm' | 'md' | 'lg';
  showValues?: boolean;
  className?: string;
}

export function ProgressBar({
  label,
  current,
  max,
  unit = '',
  autoStatusColor = true,
  color,
  size = 'md',
  showValues = true,
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((current / (max || 1)) * 100, 0), 100);
  const rawRatio = current / (max || 1);

  // Auto color logic: green (optimal <75%), yellow (caution 75-99%), red (alert >=100%)
  let barColorClass = 'bg-emerald-400';
  let badgeText = 'Optimal';
  let badgeColorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';

  if (autoStatusColor) {
    if (rawRatio >= 1.0) {
      barColorClass = 'bg-rose-500';
      badgeText = 'Limit Hit';
      badgeColorClass = 'bg-rose-50 text-rose-700 border-rose-200';
    } else if (rawRatio >= 0.75) {
      barColorClass = 'bg-amber-400';
      badgeText = 'Nearing';
      badgeColorClass = 'bg-amber-50 text-amber-800 border-amber-200';
    } else {
      barColorClass = 'bg-emerald-400';
      badgeText = 'Safe';
      badgeColorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  } else if (color) {
    const fixedColors: Record<string, string> = {
      mint: 'bg-emerald-400',
      peach: 'bg-orange-400',
      butter: 'bg-amber-400',
      softblue: 'bg-sky-400',
      red: 'bg-rose-500',
      yellow: 'bg-amber-400',
      green: 'bg-emerald-400',
    };
    barColorClass = fixedColors[color] || 'bg-emerald-400';
  }

  const heightStyles = {
    sm: 'h-2',
    md: 'h-3.5',
    lg: 'h-5',
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || showValues) && (
        <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5 font-medium text-stone-700">
          <div className="flex items-center gap-2">
            {label && <span className="font-semibold text-stone-800">{label}</span>}
            {autoStatusColor && (
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${badgeColorClass}`}
              >
                {badgeText}
              </span>
            )}
          </div>
          {showValues && (
            <span className="text-stone-600 font-semibold tabular-nums">
              {current.toLocaleString()} / {max.toLocaleString()}{' '}
              {unit && <span className="text-stone-400 text-xs font-normal">{unit}</span>}
            </span>
          )}
        </div>
      )}

      {/* Track */}
      <div
        className={`w-full overflow-hidden rounded-full bg-stone-100 border border-stone-200/80 p-0.5 ${heightStyles[size]}`}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full rounded-full transition-colors ${barColorClass}`}
        />
      </div>
    </div>
  );
}
