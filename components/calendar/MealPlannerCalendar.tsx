'use client';

import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  Utensils,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Meal } from '@/lib/mock-data';

interface MealPlannerCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  meals: Meal[];
  className?: string;
}

// Helper to format date as YYYY-MM-DD in local time
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return formatDateKey(a) === formatDateKey(b);
}

export function MealPlannerCalendar({
  selectedDate,
  onSelectDate,
  meals,
  className = '',
}: MealPlannerCalendarProps) {
  const [showMonthView, setShowMonthView] = useState(false);
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  const today = new Date();
  const todayKey = formatDateKey(today);
  const selectedKey = formatDateKey(selectedDate);

  // Group meals count and scores by date key
  const mealsByDate = React.useMemo(() => {
    const map = new Map<string, { count: number; totalCalories: number; avgScore: number }>();
    meals.forEach((m) => {
      const d = new Date(m.logged_at);
      if (isNaN(d.getTime())) return;
      const key = formatDateKey(d);
      const existing = map.get(key) || { count: 0, totalCalories: 0, avgScore: 0 };
      existing.count += 1;
      existing.totalCalories += m.calories;
      existing.avgScore =
        (existing.avgScore * (existing.count - 1) + (m.portion_score || 9.0)) / existing.count;
      map.set(key, existing);
    });
    return map;
  }, [meals]);

  // Generate 7-day rolling week window centered around selectedDate or starting near today
  const weekDays = React.useMemo(() => {
    const days: Date[] = [];
    // Start 3 days before selectedDate
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - 3);

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [selectedDate]);

  const handlePrevWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    onSelectDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    onSelectDate(newDate);
  };

  const handlePrevMonth = () => {
    setCurrentMonthDate(
      new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(
      new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1)
    );
  };

  // Month grid calculation
  const monthYearLabel = currentMonthDate.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const daysInMonth = new Date(
    currentMonthDate.getFullYear(),
    currentMonthDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfWeek = new Date(
    currentMonthDate.getFullYear(),
    currentMonthDate.getMonth(),
    1
  ).getDay();

  const monthGridDays: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    monthGridDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    monthGridDays.push(
      new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), day)
    );
  }

  const selectedStats = mealsByDate.get(selectedKey);
  const isSelectedToday = selectedKey === todayKey;

  return (
    <div
      className={`bg-white rounded-3xl border-2 border-stone-200/90 shadow-sm p-4 sm:p-5 transition-all ${className}`}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <CalendarIcon className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-stone-900 flex items-center gap-1.5">
              Meal Planning Calendar
              {isSelectedToday && (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Today
                </span>
              )}
            </h3>
            <p className="text-xs text-stone-500">
              {selectedDate.toLocaleDateString('default', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
              {selectedStats ? ` • ${selectedStats.count} meals planned/logged` : ' • Plan next meal'}
            </p>
          </div>
        </div>

        {/* Actions: Jump to Today & Month View Toggle */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          {!isSelectedToday && (
            <button
              type="button"
              onClick={() => {
                const t = new Date();
                onSelectDate(t);
                setCurrentMonthDate(new Date(t.getFullYear(), t.getMonth(), 1));
              }}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              Today
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setCurrentMonthDate(
                new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
              );
              setShowMonthView(!showMonthView);
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 px-3 py-1.5 rounded-full border border-stone-200 transition-colors cursor-pointer"
          >
            <span>{showMonthView ? 'Week Strip' : 'Month View'}</span>
            {showMonthView ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Week Strip Mode */}
      {!showMonthView && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
              title="Previous week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-stone-500">
              {weekDays[0].toLocaleDateString('default', { month: 'short', day: 'numeric' })} –{' '}
              {weekDays[6].toLocaleDateString('default', { month: 'short', day: 'numeric' })}
            </span>

            <button
              type="button"
              onClick={handleNextWeek}
              className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
              title="Next week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 7 Day Cards */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {weekDays.map((day) => {
              const key = formatDateKey(day);
              const isSelected = key === selectedKey;
              const isToday = key === todayKey;
              const dayStats = mealsByDate.get(key);
              const dayName = day.toLocaleDateString('default', { weekday: 'narrow' });
              const dayNum = day.getDate();

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectDate(day)}
                  className={`flex flex-col items-center justify-between py-2 sm:py-2.5 px-1 rounded-2xl border-2 transition-all cursor-pointer text-center select-none ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-102 ring-2 ring-emerald-200'
                      : isToday
                      ? 'bg-emerald-50/80 text-emerald-950 border-emerald-300 hover:bg-emerald-100/80'
                      : 'bg-stone-50/60 text-stone-700 border-stone-200/80 hover:bg-white hover:border-stone-300'
                  }`}
                >
                  <span
                    className={`text-[10px] sm:text-[11px] font-bold uppercase ${
                      isSelected ? 'text-emerald-100' : 'text-stone-400'
                    }`}
                  >
                    {dayName}
                  </span>

                  <span
                    className={`text-sm sm:text-base font-black my-0.5 ${
                      isSelected ? 'text-white' : 'text-stone-800'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {/* Status Indicator Dot or Score */}
                  <div className="h-4 flex items-center justify-center">
                    {dayStats && dayStats.count > 0 ? (
                      <span
                        className={`inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1 py-0.2 rounded-full ${
                          isSelected
                            ? 'bg-emerald-800/80 text-emerald-100'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                        title={`${dayStats.count} meals`}
                      >
                        <Utensils className="w-2.5 h-2.5" />
                        <span className="hidden sm:inline">{dayStats.count}</span>
                      </span>
                    ) : (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-emerald-200' : 'bg-stone-300'
                        }`}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Expanded Month Grid View */}
      {showMonthView && (
        <div className="mt-4 pt-3 border-t border-stone-100 animate-fadeIn">
          {/* Month Navigator */}
          <div className="flex items-center justify-between mb-3 px-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-extrabold text-stone-900">{monthYearLabel}</span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => (
              <span key={i} className="text-[11px] font-bold text-stone-400">
                {w}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthGridDays.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="h-10" />;
              }

              const key = formatDateKey(day);
              const isSelected = key === selectedKey;
              const isToday = key === todayKey;
              const dayStats = mealsByDate.get(key);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onSelectDate(day);
                    setShowMonthView(false);
                  }}
                  className={`h-11 sm:h-12 rounded-xl flex flex-col items-center justify-center p-1 text-xs font-bold transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isToday
                      ? 'bg-emerald-50 text-emerald-950 border border-emerald-300 font-black'
                      : 'hover:bg-stone-100 text-stone-800'
                  }`}
                >
                  <span>{day.getDate()}</span>
                  {dayStats && dayStats.count > 0 && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                        isSelected ? 'bg-amber-300' : 'bg-emerald-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
