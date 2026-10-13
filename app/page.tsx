'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { PortionCard } from '@/components/ui/PortionCard';
import { Mascot, type MascotExpression } from '@/components/mascot/Mascot';
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet';
import { fireConfetti } from '@/components/effects/Confetti';
import { formatDateKey } from '@/components/calendar/MealPlannerCalendar';
import { DataLayer } from '@/lib/data-layer';
import type { Meal, DailyTargets, Profile } from '@/lib/mock-data';
import {
  Flame,
  Award,
  Camera,
  Utensils,
  Lightbulb,
  PlusCircle,
  TrendingUp,
  Droplet,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

function HomePageContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');

  const [profile, setProfile] = useState<Profile | null>(null);
  const [targets, setTargets] = useState<DailyTargets | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const [y, m, d] = dateParam.split('-').map(Number);
      const dObj = new Date(y, m - 1, d);
      if (!isNaN(dObj.getTime())) return dObj;
    }
    return new Date();
  });
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const [mascotMood, setMascotMood] = useState<MascotExpression>('happy');

  useEffect(() => {
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const [y, m, d] = dateParam.split('-').map(Number);
      const dObj = new Date(y, m - 1, d);
      if (!isNaN(dObj.getTime())) {
        setSelectedDate(dObj);
      }
    }
  }, [dateParam]);

  useEffect(() => {
    async function loadData() {
      const p = await DataLayer.getProfile();
      const t = await DataLayer.getDailyTargets();
      const m = await DataLayer.getMeals();
      setProfile(p);
      setTargets(t);
      setMeals(m);
    }
    loadData();
  }, []);

  // Filter meals for the currently selected calendar date
  const displayedMeals = useMemo(
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

  // Compute intake from meals logged on the selected date
  const totalCalories = displayedMeals.reduce((sum, m) => sum + m.calories, 0);
  const totalSodium = displayedMeals.reduce((sum, m) => sum + m.sodium_mg, 0);
  const totalCarbs = displayedMeals.reduce((sum, m) => sum + m.carbs_g, 0);
  const totalProtein = displayedMeals.reduce((sum, m) => sum + m.protein_g, 0);

  const calorieTarget = targets?.calorie_target || 2000;
  const sodiumLimit = targets?.sodium_limit_mg || 1800;
  const carbsLimit = targets?.carbs_limit_g || 175;
  const proteinTarget = targets?.protein_target_g || 90;

  // Calorie ring metrics
  const calPercent = Math.min((totalCalories / calorieTarget) * 100, 100);
  const strokeDashoffset = 283 - (283 * calPercent) / 100;

  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const handleOpenStreak = () => {
    setIsStreakModalOpen(true);
    setMascotMood('celebrating');
    fireConfetti();
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Top Bar / Mascot Greeting & Streak Chips */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-50/80 via-sky-50/60 to-orange-50/60 rounded-[28px] border-2 border-emerald-100/90 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setMascotMood(mascotMood === 'happy' ? 'chewing' : 'happy');
              fireConfetti({ particleCount: 15 });
            }}
            className="cursor-pointer transition-transform active:scale-95 shrink-0"
            title="Click Pal for a cute surprise!"
          >
            <Mascot expression={mascotMood} size="lg" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                Hi, {profile?.display_name || 'Friend'}!
              </h1>
              <span className="text-xl">🥗</span>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
              You&apos;re keeping your plate 50% green today. Keep it up!
            </p>
          </div>
        </div>

        {/* Streak & Level Chips (Clickable) */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <Chip
            label={`${profile?.streak_count || 5} Day Streak`}
            variant="peach"
            active
            icon={<Flame className="w-4 h-4 text-orange-500 fill-orange-400" />}
            onClick={handleOpenStreak}
            size="md"
          />
          <Chip
            label={`Lv. ${profile?.level || 3} Pro`}
            variant="butter"
            active
            icon={<Award className="w-4 h-4 text-amber-600" />}
            onClick={handleOpenStreak}
            size="md"
          />
        </div>
      </section>

      {/* Date Navigator Bar (Correlated with Calendar) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-2xl border-2 border-stone-200/90 p-3 sm:px-4 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevDay}
            className="p-2 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="relative flex items-center gap-2 px-2 cursor-pointer group">
            <CalendarIcon className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-black text-stone-900 group-hover:text-emerald-700 transition-colors">
              {dateLabel}
            </span>
            <span className="text-xs text-stone-400 hidden sm:inline">
              ({selectedDate.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })})
            </span>
            <input
              type="date"
              value={formatDateKey(selectedDate)}
              onChange={(e) => {
                if (e.target.value) {
                  const [y, m, d] = e.target.value.split('-').map(Number);
                  setSelectedDate(new Date(y, m - 1, d));
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="Click to select date from calendar"
            />
          </div>

          <button
            type="button"
            onClick={handleNextDay}
            className="p-2 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!isToday && (
            <button
              type="button"
              onClick={() => setSelectedDate(new Date())}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              Back to Today
            </button>
          )}

          <Link
            href="/next-meal"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200/80 px-3 py-1.5 rounded-full border border-stone-200 transition-colors"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>Full Meal Calendar</span>
          </Link>
        </div>
      </div>

      {/* Main Responsive Layout:
          Desktop: Grid 12 cols (Left 5 cols: Daily Balance & Targets, Right 7 cols: Meal Timeline & Next Meal recommendation)
          Mobile/Tablet: Stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column (Desktop 5 cols): Daily Intake & Rings */}
        <div className="lg:col-span-5 space-y-6">
          {/* Calorie Ring & Core Energy Card */}
          <Card variant="white" className="flex flex-col items-center text-center relative overflow-hidden">
            <div className="w-full flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                  Energy Balance ({dateLabel})
                </span>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {displayedMeals.length > 0 ? `${displayedMeals.length} Logged` : 'No Meals'}
              </span>
            </div>

            {/* Circular Progress Ring */}
            <div className="relative w-44 h-44 my-2 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background Track */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="transparent"
                  stroke="#F3F4F6"
                  strokeWidth="8"
                />
                {/* Progress Track */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="transparent"
                  stroke="url(#calorieGradient)"
                  strokeWidth="8"
                  strokeDasharray="283"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34D399" />
                    <stop offset="100%" stopColor="#38BDF8" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Inside Ring Numbers */}
              <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                <span className="text-3xl font-black text-stone-900 tracking-tight">
                  {totalCalories.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-stone-500">
                  of {calorieTarget.toLocaleString()} kcal
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1 border border-emerald-200/60">
                  {Math.round(calPercent)}% consumed
                </span>
              </div>
            </div>

            {/* Mini Nutrient Indicator Bars */}
            <div className="w-full space-y-3.5 mt-4 pt-4 border-t border-stone-100 text-left">
              <ProgressBar
                label="Sodium Intake"
                current={totalSodium}
                max={sodiumLimit}
                unit="mg"
                autoStatusColor
              />
              <ProgressBar
                label="Carbohydrates & Sugars"
                current={totalCarbs}
                max={carbsLimit}
                unit="g"
                autoStatusColor
              />
              <ProgressBar
                label="Lean Protein Goal"
                current={totalProtein}
                max={proteinTarget}
                unit="g"
                autoStatusColor={false}
                color="softblue"
              />
            </div>
          </Card>

          {/* Daily Tip Card */}
          <Card variant="butter" className="relative overflow-hidden">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-200/70 border border-amber-300 flex items-center justify-center shrink-0 text-amber-900">
                <Lightbulb className="w-5 h-5 fill-amber-400 stroke-amber-800" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-amber-950">Daily Plate Wisdom</h4>
                <p className="text-xs sm:text-sm text-amber-900/90 mt-1 leading-relaxed">
                  Drinking a glass of room-temperature water 15 minutes before lunch triggers satiety
                  mechanisms, helping you stick naturally to your 50% veggie target!
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                    <Droplet className="w-3.5 h-3.5 text-sky-500 fill-sky-400" /> 6 / 8 glasses today
                  </span>
                  <Link
                    href="/prescription"
                    className="text-xs font-extrabold text-amber-900 underline hover:text-amber-950"
                  >
                    View Doctor Rx
                  </Link>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Actions Card */}
          <Card variant="white" className="p-4 sm:p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
              Quick Shortcuts
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href={`/camera?date=${formatDateKey(selectedDate)}`}
                className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-950 font-bold text-xs sm:text-sm hover:bg-emerald-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <span>Magic Plate Camera</span>
              </Link>

              <Link
                href="/next-meal"
                className="flex items-center gap-3 p-3 rounded-2xl bg-sky-50 border-2 border-sky-200 text-sky-950 font-bold text-xs sm:text-sm hover:bg-sky-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0">
                  <Utensils className="w-4 h-4" />
                </div>
                <span>Meal Planner Calendar</span>
              </Link>
            </div>
          </Card>
        </div>

        {/* Right Column (Desktop 7 cols): How You've Eaten Timeline */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
                How You&apos;ve Eaten on {dateLabel}
              </h2>
              <p className="text-xs text-stone-500">
                {displayedMeals.length} balanced meals logged for this day with portion scoring
              </p>
            </div>

            <Link
              href={`/camera?date=${formatDateKey(selectedDate)}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border-2 border-emerald-200/90 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors"
            >
              <PlusCircle className="w-4 h-4" /> Log Meal
            </Link>
          </div>

          {/* Meal Cards List or Empty State */}
          {displayedMeals.length > 0 ? (
            <div className="space-y-3.5">
              {displayedMeals.map((meal) => (
                <PortionCard
                  key={meal.id}
                  meal={meal}
                  onDelete={async () => {
                    await DataLayer.deleteMeal(meal.id);
                    setMeals((prev) => prev.filter((m) => m.id !== meal.id));
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="bg-stone-50/80 rounded-2xl border-2 border-dashed border-stone-200 p-8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-white border border-stone-200 flex items-center justify-center text-xl shadow-xs">
                🥗
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-800">
                  No Meals Logged for {dateLabel}
                </h3>
                <p className="text-xs text-stone-500 max-w-xs mx-auto mt-0.5">
                  Scan your meal with the camera or plan recommendations ahead!
                </p>
              </div>
              <div className="flex justify-center gap-2 pt-1">
                <Link
                  href={`/camera?date=${formatDateKey(selectedDate)}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-full shadow-sm transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" /> Scan Meal
                </Link>
                <Link
                  href="/next-meal"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-700 bg-white border border-stone-200 hover:bg-stone-100 px-3.5 py-2 rounded-full transition-colors"
                >
                  <Utensils className="w-3.5 h-3.5" /> Plan with AI
                </Link>
              </div>
            </div>
          )}

          {/* Next Meal Teaser Card */}
          <Card
            variant="mint"
            className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white border-2 border-emerald-200 flex items-center justify-center text-2xl shadow-xs">
                🍽️
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Evening Dinner Suggestion
                </span>
                <h4 className="text-base font-bold text-emerald-950">
                  Ready to plan tonight&apos;s plate?
                </h4>
                <p className="text-xs text-emerald-800/90">
                  You have 580 kcal and 620mg sodium remaining.
                </p>
              </div>
            </div>

            <Link
              href="/next-meal"
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-emerald-600 text-white font-bold text-xs sm:text-sm hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Get Recommendation
            </Link>
          </Card>
        </div>
      </div>

      {/* Streak & Level Dialog */}
      <ResponsiveSheet
        isOpen={isStreakModalOpen}
        onClose={() => setIsStreakModalOpen(false)}
        title="Streak & Portion Milestones"
      >
        <div className="text-center py-2 space-y-4">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-orange-50 border-2 border-orange-200 flex items-center justify-center">
            <Mascot expression="celebrating" size="md" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-100/80 px-3 py-1 rounded-full border border-orange-200">
              5 Days in a Row!
            </span>
            <h3 className="text-xl font-black text-stone-900 mt-2">
              You&apos;re a Level 3 Portion Pro!
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 max-w-sm mx-auto mt-1">
              Plate Pal awards points every time you fill 50% of your plate with vegetables and stay
              within your doctor sodium limits.
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 bg-stone-50 rounded-2xl p-3 border border-stone-200 text-center">
            <div>
              <span className="text-[11px] font-semibold text-stone-500">Average Score</span>
              <p className="text-base font-black text-emerald-700">9.5 ⭐</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-stone-500">Days Logged</span>
              <p className="text-base font-black text-orange-600">5 / 7</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-stone-500">Next Level</span>
              <p className="text-base font-black text-amber-700">Lv. 4</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsStreakModalOpen(false)}
            className="w-full py-3 rounded-full bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors shadow-md cursor-pointer"
          >
            Awesome, Let&apos;s Keep Eating Well!
          </button>
        </div>
      </ResponsiveSheet>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-sm font-semibold text-stone-500">Loading Plate Pal Dashboard...</p>
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
