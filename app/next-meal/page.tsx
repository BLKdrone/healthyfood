'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Mascot } from '@/components/mascot/Mascot';
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet';
import { fireConfetti } from '@/components/effects/Confetti';
import { MealPlannerCalendar, formatDateKey } from '@/components/calendar/MealPlannerCalendar';
import { DataLayer } from '@/lib/data-layer';
import type { NextMealOption, Meal } from '@/lib/mock-data';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Flame,
  ChefHat,
  ArrowRight,
  TrendingDown,
  Info,
  Calendar,
} from 'lucide-react';

export default function NextMealPage() {
  const router = useRouter();
  const [options, setOptions] = useState<NextMealOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>('opt-low-sodium');
  const [isChosenModalOpen, setIsChosenModalOpen] = useState<boolean>(false);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    async function load() {
      const opts = DataLayer.getNextMealOptions();
      setOptions(opts);
      const m = await DataLayer.getMeals();
      setMeals(m);
    }
    load();
  }, []);

  const selectedOption = options.find((o) => o.id === selectedId) || options[0];

  // Daily budget baselines
  const dailyBudget = {
    calories: 2000,
    sodium: 1800,
    carbs: 175,
    protein: 90,
  };

  // Filter meals for the selected date
  const dayMeals = useMemo(
    () => DataLayer.filterMealsByDate(meals, selectedDate),
    [meals, selectedDate]
  );

  const isToday = formatDateKey(selectedDate) === formatDateKey(new Date());
  const dateLabel = isToday
    ? 'Today'
    : selectedDate.toLocaleDateString('default', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

  // Consumed before dinner for the chosen date
  const consumedCalories = dayMeals.reduce((sum, m) => sum + m.calories, 0);
  const consumedSodium = dayMeals.reduce((sum, m) => sum + m.sodium_mg, 0);
  const consumedCarbs = dayMeals.reduce((sum, m) => sum + m.carbs_g, 0);
  const consumedProtein = dayMeals.reduce((sum, m) => sum + m.protein_g, 0);

  // Baseline remaining before this meal
  const baselineRemaining = {
    calories: Math.max(dailyBudget.calories - consumedCalories, 0),
    sodium: Math.max(dailyBudget.sodium - consumedSodium, 0),
    carbs: Math.max(dailyBudget.carbs - consumedCarbs, 0),
    protein: Math.max(dailyBudget.protein - consumedProtein, 0),
  };

  // Projected remaining AFTER chosen meal
  const projectedAfter = {
    calories: baselineRemaining.calories - (selectedOption?.calories || 0),
    sodium: baselineRemaining.sodium - (selectedOption?.sodium_mg || 0),
    carbs: baselineRemaining.carbs - (selectedOption?.carbs_g || 0),
    protein: baselineRemaining.protein - (selectedOption?.protein_g || 0),
  };

  const handleChooseMeal = async () => {
    if (!selectedOption) return;

    const mealDate = new Date(selectedDate);
    mealDate.setHours(19, 0, 0, 0);

    const newLogged = await DataLayer.logMeal({
      title: selectedOption.title,
      meal_type: 'dinner',
      image_url: selectedOption.image_url,
      portion_score: 9.7,
      calories: selectedOption.calories,
      sodium_mg: selectedOption.sodium_mg,
      carbs_g: selectedOption.carbs_g,
      protein_g: selectedOption.protein_g,
      friendly_note: `Prescribed meal chosen: ${selectedOption.tag} for ${dateLabel}. Perfect balance!`,
      logged_at: mealDate.toISOString(),
      time_label: '7:00 PM',
    });

    setMeals((prev) => [newLogged, ...prev]);
    setIsChosenModalOpen(true);
    fireConfetti();
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Smart Meal Intelligence
          </span>
          <span className="text-xs text-stone-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Dinner Planner
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          Next Meal Recommendation
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Based on your meals for <span className="font-bold text-stone-800">{dateLabel}</span>, here are 3 optimized options that safeguard your doctor&apos;s
          sodium limit and smooth out your blood sugar.
        </p>
      </div>

      {/* Meal Planning Calendar */}
      <MealPlannerCalendar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        meals={meals}
      />

      {/* Earlier meals on selected date banner */}
      {dayMeals.length > 0 ? (
        <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200/80 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="font-extrabold text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Logged on {dateLabel}:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {dayMeals.map((m) => (
                <span
                  key={m.id}
                  className="bg-white border border-emerald-200/90 text-stone-800 font-semibold px-2.5 py-1 rounded-xl shadow-2xs"
                >
                  <span className="text-[10px] uppercase font-bold text-emerald-700 mr-1">
                    {m.meal_type}
                  </span>
                  {m.title} ({m.calories} kcal)
                </span>
              ))}
            </div>
          </div>
          <span className="text-emerald-800 font-bold whitespace-nowrap bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200">
            {consumedCalories} kcal consumed
          </span>
        </div>
      ) : (
        <div className="bg-stone-50 rounded-2xl border border-stone-200/80 p-3.5 flex items-center gap-2.5 text-xs text-stone-600">
          <Info className="w-4 h-4 text-stone-400 shrink-0" />
          <span>
            No earlier meals logged for <strong className="text-stone-800">{dateLabel}</strong>. Showing dinner options with full daily allowances!
          </span>
        </div>
      )}

      {/* Dynamic Section: "Your Remaining Needs" Live Dynamic Bars */}
      <Card variant="white" className="p-5 sm:p-6 border-2 border-stone-200/90 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-stone-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" /> Remaining Allowances for {dateLabel}
            </h2>
            <p className="text-xs text-stone-500">
              Select any of the 3 meal options below to preview real-time impact on your daily targets!
            </p>
          </div>

          <div className="text-xs font-bold text-stone-700 bg-stone-100 px-3 py-1 rounded-full">
            Previewing: <span className="text-emerald-700 font-black">{selectedOption?.tag}</span>
          </div>
        </div>

        {/* 4 Dynamic Progress Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Energy / Calories */}
          <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-200/70 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-orange-950 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500" /> Calories
              </span>
              <span className="font-bold text-orange-900">
                {projectedAfter.calories >= 0
                  ? `${projectedAfter.calories} kcal left`
                  : `+${Math.abs(projectedAfter.calories)} kcal over`}
              </span>
            </div>
            <ProgressBar
              current={consumedCalories + (selectedOption?.calories || 0)}
              max={dailyBudget.calories}
              size="sm"
              autoStatusColor
              showValues={false}
            />
            <span className="text-[10px] text-stone-500 block">
              Budget: {dailyBudget.calories} kcal
            </span>
          </div>

          {/* Sodium */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-950">Sodium (Cap)</span>
              <span className="font-bold text-emerald-900">
                {projectedAfter.sodium >= 0
                  ? `${projectedAfter.sodium} mg buffer`
                  : `${Math.abs(projectedAfter.sodium)} mg over`}
              </span>
            </div>
            <ProgressBar
              current={consumedSodium + (selectedOption?.sodium_mg || 0)}
              max={dailyBudget.sodium}
              size="sm"
              autoStatusColor
              showValues={false}
            />
            <span className="text-[10px] text-emerald-700 font-semibold block">
              Rx Limit: {dailyBudget.sodium} mg
            </span>
          </div>

          {/* Carbs */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-950">Carbs</span>
              <span className="font-bold text-amber-900">
                {projectedAfter.carbs >= 0
                  ? `${projectedAfter.carbs} g left`
                  : `+${Math.abs(projectedAfter.carbs)} g`}
              </span>
            </div>
            <ProgressBar
              current={consumedCarbs + (selectedOption?.carbs_g || 0)}
              max={dailyBudget.carbs}
              size="sm"
              autoStatusColor
              showValues={false}
            />
            <span className="text-[10px] text-stone-500 block">Cap: {dailyBudget.carbs} g</span>
          </div>

          {/* Protein */}
          <div className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-200/70 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-sky-950">Protein Goal</span>
              <span className="font-bold text-sky-900">
                {projectedAfter.protein <= 0
                  ? 'Goal Hit! 🎉'
                  : `${projectedAfter.protein} g to go`}
              </span>
            </div>
            <ProgressBar
              current={consumedProtein + (selectedOption?.protein_g || 0)}
              max={dailyBudget.protein}
              size="sm"
              autoStatusColor={false}
              color="softblue"
              showValues={false}
            />
            <span className="text-[10px] text-stone-500 block">Goal: {dailyBudget.protein} g</span>
          </div>
        </div>
      </Card>

      {/* 3 Option Cards (Desktop 3 in a row, Mobile stack) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-stone-900">
            Recommended Dinner Options
          </h2>
          <span className="text-xs text-stone-500">Tap to compare</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {options.map((option) => {
            const isSelected = option.id === selectedId;

            return (
              <div
                key={option.id}
                onClick={() => setSelectedId(option.id)}
                className={`pal-card-interactive p-4 sm:p-5 flex flex-col justify-between cursor-pointer select-none relative ${
                  isSelected
                    ? 'border-emerald-500 ring-4 ring-emerald-100 bg-white'
                    : 'border-stone-200/90 bg-stone-50/50 hover:bg-white'
                }`}
              >
                {isSelected && (
                  <div className="absolute -top-3 right-4 bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                  </div>
                )}

                <div>
                  {/* Dish Photo */}
                  <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-stone-200 mb-3 bg-stone-100">
                    <Image
                      src={option.image_url}
                      alt={option.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute bottom-2 left-2 bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {option.prep_time}
                    </div>
                  </div>

                  {/* Tag badge */}
                  <span className="inline-block text-[11px] font-extrabold uppercase tracking-wide text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-2.5 py-0.5 rounded-full mb-2">
                    {option.tag}
                  </span>

                  <h3 className="text-base font-bold text-stone-900 leading-snug">
                    {option.title}
                  </h3>

                  <p className="text-xs text-stone-600 mt-2 line-clamp-2">
                    {option.description}
                  </p>
                </div>

                {/* Macro summary pills */}
                <div className="mt-4 pt-3 border-t border-stone-100">
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold mb-3">
                    <div className="bg-stone-50 p-1.5 rounded-lg border border-stone-200/60 text-stone-700">
                      🔥 {option.calories} kcal
                    </div>
                    <div className="bg-emerald-50 p-1.5 rounded-lg border border-emerald-200/60 text-emerald-800">
                      Na {option.sodium_mg}mg
                    </div>
                    <div className="bg-amber-50 p-1.5 rounded-lg border border-amber-200/60 text-amber-900">
                      Carbs {option.carbs_g}g
                    </div>
                    <div className="bg-sky-50 p-1.5 rounded-lg border border-sky-200/60 text-sky-900">
                      Protein {option.protein_g}g
                    </div>
                  </div>

                  <div className="space-y-1">
                    {option.highlights.map((h) => (
                      <span
                        key={h}
                        className="text-[11px] text-stone-500 font-medium block"
                      >
                        ✓ {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* "Why this meal?" Explanation & CTA Section */}
      {selectedOption && (
        <Card
          variant="mint"
          className="p-5 sm:p-6 border-2 border-emerald-300 shadow-md relative overflow-hidden"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white border-2 border-emerald-200 flex items-center justify-center shrink-0 shadow-xs">
                <Mascot expression="thinking" size="sm" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-white/80 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    Nutritional Rationale
                  </span>
                  <span className="text-xs font-bold text-stone-600">
                    Why Plate Pal recommends this:
                  </span>
                </div>
                <h4 className="text-base sm:text-lg font-black text-emerald-950">
                  {selectedOption.title}
                </h4>
                <p className="text-xs sm:text-sm text-emerald-900/90 leading-relaxed max-w-2xl">
                  {selectedOption.why_this_meal}
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="w-full lg:w-auto shrink-0">
              <button
                type="button"
                onClick={handleChooseMeal}
                className="w-full lg:w-auto px-6 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Choose This Meal for {dateLabel} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Confirmation Modal */}
      <ResponsiveSheet
        isOpen={isChosenModalOpen}
        onClose={() => setIsChosenModalOpen(false)}
        title={`Meal Scheduled for ${dateLabel}!`}
      >
        <div className="text-center py-2 space-y-4">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
            <Mascot expression="celebrating" size="md" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-200">
              Dinner Locked In • {dateLabel}
            </span>
            <h3 className="text-xl font-black text-stone-900 mt-2">
              {selectedOption?.title}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 max-w-sm mx-auto mt-1">
              Your meal has been planned and saved for <strong className="text-stone-800">{dateLabel}</strong>. Your daily doctor sodium and calorie allowances have been updated!
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setIsChosenModalOpen(false)}
              className="flex-1 py-3 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-sm transition-colors cursor-pointer"
            >
              Keep Planning Dates
            </button>
            <button
              type="button"
              onClick={() => {
                setIsChosenModalOpen(false);
                router.push('/?celebrate=true');
              }}
              className="flex-1 py-3 rounded-full bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors shadow-md cursor-pointer"
            >
              View Dashboard
            </button>
          </div>
        </div>
      </ResponsiveSheet>
    </div>
  );
}
