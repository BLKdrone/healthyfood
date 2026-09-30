'use client';

import React from 'react';
import { motion } from 'framer-motion';

export type ChipVariant = 'mint' | 'peach' | 'butter' | 'softblue' | 'neutral';

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  active?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles: Record<ChipVariant, { inactive: string; active: string }> = {
  mint: {
    inactive: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100/70',
    active: 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-200',
  },
  peach: {
    inactive: 'bg-orange-50 text-orange-800 border-orange-200/80 hover:bg-orange-100/70',
    active: 'bg-orange-500 text-white border-orange-600 shadow-sm shadow-orange-200',
  },
  butter: {
    inactive: 'bg-amber-50 text-amber-900 border-amber-200/80 hover:bg-amber-100/70',
    active: 'bg-amber-400 text-amber-950 border-amber-500 shadow-sm shadow-amber-200',
  },
  softblue: {
    inactive: 'bg-sky-50 text-sky-800 border-sky-200/80 hover:bg-sky-100/70',
    active: 'bg-sky-500 text-white border-sky-600 shadow-sm shadow-sky-200',
  },
  neutral: {
    inactive: 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200/70',
    active: 'bg-stone-800 text-white border-stone-900 shadow-sm',
  },
};

const sizeStyles = {
  sm: 'text-xs px-2.5 py-1 min-h-[32px] gap-1.5',
  md: 'text-sm px-3.5 py-2 min-h-[44px] gap-2 font-medium',
  lg: 'text-base px-4 py-2.5 min-h-[48px] gap-2.5 font-semibold',
};

export function Chip({
  label,
  variant = 'neutral',
  active = false,
  icon,
  onClick,
  className = '',
  size = 'md',
}: ChipProps) {
  const currentStyles = active
    ? variantStyles[variant].active
    : variantStyles[variant].inactive;

  const content = (
    <>
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span className="truncate">{label}</span>
    </>
  );

  if (onClick) {
    return (
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        whileHover={{ scale: 1.02 }}
        onClick={onClick}
        className={`inline-flex items-center justify-center rounded-full border-2 transition-all cursor-pointer select-none ${sizeStyles[size]} ${currentStyles} ${className}`}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border-2 select-none ${sizeStyles[size]} ${currentStyles} ${className}`}
    >
      {content}
    </span>
  );
}
