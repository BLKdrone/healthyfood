'use client';

import React from 'react';
import Image from 'next/image';
import { Card } from './Card';
import { Star, Flame, Sparkles } from 'lucide-react';
import type { Meal } from '@/lib/mock-data';

interface PortionCardProps {
  meal: Meal;
  className?: string;
  onClick?: () => void;
}

export function PortionCard({ meal, className = '', onClick }: PortionCardProps) {
  // Score styling
  const scoreColor =
    meal.portion_score >= 9.0
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : meal.portion_score >= 8.0
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : 'bg-rose-100 text-rose-800 border-rose-300';

  return (
    <Card
      interactive={Boolean(onClick)}
      onClick={onClick}
      className={`relative overflow-hidden p-4 sm:p-5 ${className}`}
    >
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Dish Thumbnail */}
        <div className="relative w-full sm:w-28 h-40 sm:h-28 shrink-0 rounded-2xl overflow-hidden border-2 border-stone-200/90 bg-stone-100">
          {meal.image_url ? (
            <Image
              src={meal.image_url}
              alt={meal.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 112px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-600 text-3xl">
              🥗
            </div>
          )}
          {/* Meal Type Pill */}
          <span className="absolute bottom-2 left-2 bg-stone-900/80 backdrop-blur-xs text-white text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full">
            {meal.meal_type}
          </span>
        </div>

        {/* Content Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-stone-500">{meal.time_label}</span>
              <h4 className="text-base sm:text-lg font-bold text-stone-900 leading-snug truncate">
                {meal.title}
              </h4>
            </div>

            {/* Portion Score Pill */}
            <div
              className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full border-2 font-black text-sm ${scoreColor}`}
            >
              <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
              <span>{meal.portion_score.toFixed(1)}</span>
            </div>
          </div>

          {/* Friendly Note */}
          {meal.friendly_note && (
            <div className="mt-2 text-xs sm:text-sm text-stone-600 bg-stone-50 rounded-xl p-2.5 border border-stone-200/60 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="line-clamp-2">{meal.friendly_note}</p>
            </div>
          )}

          {/* Nutrient Quick Badges */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 font-semibold text-stone-700 bg-orange-50 border border-orange-200/80 px-2 py-0.5 rounded-lg">
              <Flame className="w-3 h-3 text-orange-500" />
              {meal.calories} kcal
            </span>
            <span className="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg">
              Sodium {meal.sodium_mg}mg
            </span>
            <span className="font-medium text-amber-900 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg">
              Carbs {meal.carbs_g}g
            </span>
            <span className="font-medium text-sky-900 bg-sky-50 border border-sky-200/80 px-2 py-0.5 rounded-lg">
              Protein {meal.protein_g}g
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
