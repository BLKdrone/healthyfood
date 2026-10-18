'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Card } from './Card';
import {
  Star,
  Flame,
  Sparkles,
  Trash2,
  Clock,
  CheckCircle,
  Sliders,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Bell,
  RotateCcw,
  Utensils,
} from 'lucide-react';
import { fireConfetti } from '@/components/effects/Confetti';
import { DataLayer } from '@/lib/data-layer';
import { simulate30MinReminder } from '@/lib/notifications';
import type { Meal, FoodComponent } from '@/lib/mock-data';

interface PortionCardProps {
  meal: Meal;
  className?: string;
  onClick?: () => void;
  onDelete?: () => void;
  onIntakeUpdated?: (updatedMeal: Meal) => void;
}

export function PortionCard({
  meal,
  className = '',
  onClick,
  onDelete,
  onIntakeUpdated,
}: PortionCardProps) {
  const isPending = meal.status === 'pending_intake';
  const [isTrackerOpen, setIsTrackerOpen] = useState<boolean>(isPending);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize sliders at the recommended intake percentage (NOT 100%)
  const [sliderValues, setSliderValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    if (meal.components && meal.components.length > 0) {
      meal.components.forEach((c) => {
        // If already confirmed, use actualIntakePercent, else initialize at recommendedIntakePercent
        initial[c.id] = c.actualIntakePercent !== undefined ? c.actualIntakePercent : c.recommendedIntakePercent ?? 100;
      });
    } else {
      initial['default'] = isPending ? 75 : 100;
    }
    return initial;
  });

  // Calculate live nutrients from current slider values
  const liveNutrients = useMemo(() => {
    if (meal.components && meal.components.length > 0) {
      let cal = 0;
      let na = 0;
      let carbs = 0;
      let protein = 0;

      meal.components.forEach((c) => {
        const percent = sliderValues[c.id] ?? c.recommendedIntakePercent ?? 100;
        const frac = percent / 100;
        cal += (c.calories || 0) * frac;
        na += (c.sodium_mg || 0) * frac;
        carbs += (c.carbs_g || 0) * frac;
        protein += (c.protein_g || 0) * frac;
      });

      return {
        calories: Math.round(cal),
        sodium_mg: Math.round(na),
        carbs_g: Math.round(carbs),
        protein_g: Math.round(protein),
      };
    }

    const defaultPercent = (sliderValues['default'] ?? (isPending ? 75 : 100)) / 100;
    const baseCal = meal.estimated_calories || meal.calories;
    const baseNa = meal.estimated_sodium_mg || meal.sodium_mg;
    const baseCarbs = meal.estimated_carbs_g || meal.carbs_g;
    const baseProtein = meal.estimated_protein_g || meal.protein_g;

    return {
      calories: Math.round(baseCal * defaultPercent),
      sodium_mg: Math.round(baseNa * defaultPercent),
      carbs_g: Math.round(baseCarbs * defaultPercent),
      protein_g: Math.round(baseProtein * defaultPercent),
    };
  }, [meal, sliderValues, isPending]);

  // Shortcut 1: "Ate recommended amount" (sets each slider to its recommended percentage)
  const handleSetRecommended = () => {
    const updated: Record<string, number> = {};
    if (meal.components && meal.components.length > 0) {
      meal.components.forEach((c) => {
        updated[c.id] = c.recommendedIntakePercent ?? 100;
      });
    } else {
      updated['default'] = 75;
    }
    setSliderValues(updated);
  };

  // Shortcut 2: "Ate full dish" (sets all sliders to 100%)
  const handleSetFullDish = () => {
    const updated: Record<string, number> = {};
    if (meal.components && meal.components.length > 0) {
      meal.components.forEach((c) => {
        updated[c.id] = 100;
      });
    } else {
      updated['default'] = 100;
    }
    setSliderValues(updated);
  };

  // Confirm Intake Handler
  const handleConfirmIntake = async () => {
    setIsSubmitting(true);
    try {
      const updated = await DataLayer.confirmMealIntake(meal.id, sliderValues);
      if (updated) {
        fireConfetti({ particleCount: 25 });
        onIntakeUpdated?.(updated);
        setIsTrackerOpen(false);
      }
    } catch (err) {
      console.error('Error confirming intake:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Score styling
  const scoreColor =
    meal.portion_score >= 9.0
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : meal.portion_score >= 8.0
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : 'bg-rose-100 text-rose-800 border-rose-300';

  return (
    <Card
      id={`meal-${meal.id}`}
      interactive={Boolean(onClick)}
      onClick={onClick}
      className={`relative overflow-hidden p-4 sm:p-5 transition-all ${
        isPending
          ? 'border-2 border-amber-300 bg-gradient-to-b from-white to-amber-50/30 shadow-xs'
          : 'border border-stone-200/90'
      } ${className}`}
    >
      {/* Pending Intake Banner */}
      {isPending && (
        <div className="mb-3 -mt-1 flex flex-wrap items-center justify-between gap-2 bg-amber-100/80 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs font-black">
            <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
            <span>Pending intake confirmation</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Testing Simulation Pill */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                simulate30MinReminder(meal.id, meal.title);
              }}
              title="Test notification trigger immediately"
              className="text-[10px] font-bold text-amber-800 bg-white/80 hover:bg-white border border-amber-300/80 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
            >
              ⏱️ Simulate 30m Reminder
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsTrackerOpen(!isTrackerOpen);
              }}
              className="text-xs font-extrabold text-amber-900 underline flex items-center gap-0.5 cursor-pointer"
            >
              {isTrackerOpen ? (
                <>
                  Collapse <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  Record Intake <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main Meal Row */}
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
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-500">{meal.time_label}</span>
                {isPending ? (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                    Estimated
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-0.5">
                    <CheckCircle className="w-2.5 h-2.5" /> Intake Confirmed
                  </span>
                )}
              </div>
              <h4 className="text-base sm:text-lg font-bold text-stone-900 leading-snug break-words">
                {meal.title}
              </h4>
            </div>

            <div className="flex items-center gap-2">
              {/* Portion Score Pill */}
              <div
                className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full border-2 font-black text-sm ${scoreColor}`}
              >
                <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                <span>{meal.portion_score.toFixed(1)}</span>
              </div>

              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                  title="Delete meal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
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
              {isPending ? `${meal.estimated_calories || meal.calories} kcal (est.)` : `${meal.calories} kcal`}
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

            {/* Edit intake toggle button for confirmed meals */}
            {!isPending && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTrackerOpen(!isTrackerOpen);
                }}
                className="text-[11px] font-bold text-stone-500 hover:text-stone-800 hover:bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200 transition-colors ml-auto cursor-pointer"
              >
                {isTrackerOpen ? 'Close Tracker' : 'Edit Intake ✏️'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Actual Intake Tracker Panel (Requirement 2) */}
      {isTrackerOpen && (
        <div className="mt-4 pt-4 border-t-2 border-dashed border-stone-200/90 space-y-4 animate-fadeIn">
          {/* Tracker Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-stone-50 p-3 rounded-2xl border border-stone-200">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black text-stone-800">
                <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                <span>Actual Intake Tracker</span>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Record the percentage actually eaten relative to what was originally detected.
              </p>
            </div>

            {/* Shortcut Buttons */}
            <div className="flex items-center gap-1.5 self-stretch sm:self-auto justify-end">
              <button
                type="button"
                onClick={handleSetRecommended}
                className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/90 border border-emerald-300 px-2.5 py-1 rounded-xl transition-all cursor-pointer shadow-2xs"
                title="Sets each slider to the portion recommended by Magic Plate"
              >
                ✨ Ate recommended amount
              </button>
              <button
                type="button"
                onClick={handleSetFullDish}
                className="text-[11px] font-bold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 px-2.5 py-1 rounded-xl transition-all cursor-pointer shadow-2xs"
                title="Sets all sliders to 100%"
              >
                🍽️ Ate full dish
              </button>
            </div>
          </div>

          {/* Component Sliders */}
          <div className="space-y-3">
            {meal.components && meal.components.length > 0 ? (
              meal.components.map((comp) => {
                const currentVal = sliderValues[comp.id] ?? comp.recommendedIntakePercent ?? 100;
                const recPercent = comp.recommendedIntakePercent ?? 100;
                const categoryEmoji =
                  comp.category === 'veggies' ? '🥦' : comp.category === 'protein' ? '🍗' : '🍚';

                return (
                  <div
                    key={comp.id}
                    className="bg-white rounded-xl border border-stone-200/90 p-3 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span>{categoryEmoji}</span>
                        <span className="font-extrabold text-stone-900">{comp.name}</span>
                        <span className="text-[10px] text-stone-400">
                          (Original Detected: {comp.detectedRatio}%)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                          Rec: {recPercent}%
                        </span>
                        <span className="text-xs font-black text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200 min-w-12 text-center">
                          Ate {currentVal}%
                        </span>
                      </div>
                    </div>

                    {/* Adjustable Slider initialized at recommended % */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[10px] text-stone-400 font-bold">0%</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={currentVal}
                        onChange={(e) =>
                          setSliderValues((prev) => ({
                            ...prev,
                            [comp.id]: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-emerald-600 cursor-pointer h-2 bg-stone-200 rounded-lg"
                        aria-label={`Adjust eaten percentage for ${comp.name}`}
                      />
                      <span className="text-[10px] text-stone-400 font-bold">100%</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-stone-500">
                      <span>
                        Consumed: ~{Math.round(comp.calories * (currentVal / 100))} kcal (of {comp.calories} kcal)
                      </span>
                      {currentVal === recPercent && (
                        <span className="text-emerald-700 font-bold">Matches Magic Plate recommendation ✓</span>
                      )}
                      {currentVal === 100 && recPercent < 100 && (
                        <span className="text-amber-700 font-bold">Ate full portion</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              /* Fallback single whole-dish slider if components not present */
              <div className="bg-white rounded-xl border border-stone-200/90 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                  <span>Whole Dish Consumed</span>
                  <span className="bg-stone-100 px-2 py-0.5 rounded-md">
                    {sliderValues['default'] ?? 75}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={sliderValues['default'] ?? 75}
                  onChange={(e) =>
                    setSliderValues((prev) => ({ ...prev, default: Number(e.target.value) }))
                  }
                  className="w-full accent-emerald-600 cursor-pointer h-2 bg-stone-200 rounded-lg"
                />
              </div>
            )}
          </div>

          {/* Live Actual Calculation Summary & Confirm Button */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider">
                Calculated Actual Intake
              </span>
              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs font-bold text-stone-800">
                <span className="text-orange-600 font-black">{liveNutrients.calories} kcal</span>
                <span>•</span>
                <span>Sodium {liveNutrients.sodium_mg}mg</span>
                <span>•</span>
                <span>Carbs {liveNutrients.carbs_g}g</span>
                <span>•</span>
                <span>Protein {liveNutrients.protein_g}g</span>
              </div>
              <span className="text-[10px] text-stone-500">
                Originally detected: {meal.estimated_calories || meal.calories} kcal
              </span>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmIntake}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Confirm Actual Intake'}</span>
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
