'use client';

import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

export type CardVariant = 'white' | 'mint' | 'peach' | 'butter' | 'softblue' | 'lavender';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  variant?: CardVariant;
  interactive?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<CardVariant, string> = {
  white: 'bg-white border-stone-200/90 text-stone-800 shadow-[0_4px_20px_-2px_rgba(41,37,36,0.04)]',
  mint: 'bg-[#F2FBF5] border-emerald-200/80 text-emerald-950 shadow-[0_4px_20px_-2px_rgba(16,185,129,0.06)]',
  peach: 'bg-[#FFF7ED] border-orange-200/80 text-orange-950 shadow-[0_4px_20px_-2px_rgba(249,115,22,0.06)]',
  butter: 'bg-[#FEFCE8] border-amber-200/80 text-amber-950 shadow-[0_4px_20px_-2px_rgba(234,179,8,0.06)]',
  softblue: 'bg-[#F0F9FF] border-sky-200/80 text-sky-950 shadow-[0_4px_20px_-2px_rgba(2,132,199,0.06)]',
  lavender: 'bg-[#FAF5FF] border-purple-200/80 text-purple-950 shadow-[0_4px_20px_-2px_rgba(168,85,247,0.06)]',
};

export function Card({
  variant = 'white',
  interactive = false,
  children,
  className = '',
  ...props
}: CardProps) {
  const baseClasses = `rounded-[24px] border-2 p-5 transition-colors ${variantStyles[variant]}`;

  if (interactive) {
    return (
      <motion.div
        whileHover={{ y: -2, scale: 1.008 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`${baseClasses} cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={`${baseClasses} ${className}`} {...(props as React.HTMLAttributes<HTMLDivElement>)}>
      {children}
    </div>
  );
}
