'use client';

import React from 'react';
import Link from 'next/link';
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet';
import { Mascot } from '@/components/mascot/Mascot';
import { fireConfetti } from '@/components/effects/Confetti';
import { DataLayer, type StreakInfo } from '@/lib/data-layer';
import type { Profile } from '@/lib/mock-data';
import {
  Flame,
  Snowflake,
  Award,
  Camera,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakInfo: StreakInfo | null;
  profile: Profile | null;
  onProfileUpdate?: (updated: Profile) => void;
}

export function StreakModal({
  isOpen,
  onClose,
  streakInfo,
  profile,
  onProfileUpdate,
}: StreakModalProps) {
  const currentStreak = streakInfo?.currentStreak ?? profile?.streak_count ?? 5;
  const isLoggedToday = streakInfo?.isLoggedToday ?? false;
  const streakStatus = streakInfo?.streakStatus ?? 'active';
  const freezes = profile?.streak_freezes ?? 1;

  // Next Milestone calculation
  const milestones = [3, 7, 14, 30, 50, 100];
  const nextMilestone = milestones.find((m) => m > currentStreak) ?? 100;
  const prevMilestone = [...milestones].reverse().find((m) => m <= currentStreak) ?? 0;
  const milestonePercent = Math.min(
    Math.round(((currentStreak - prevMilestone) / (nextMilestone - prevMilestone)) * 100),
    100
  );

  const handleEquipFreeze = async () => {
    if (freezes >= 2) return;
    const updated = await DataLayer.equipStreakFreeze();
    if (onProfileUpdate) onProfileUpdate(updated);
    fireConfetti({ particleCount: 25 });
  };

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Streak & Portion Milestones"
      className="max-w-md"
    >
      <div className="text-center py-1 space-y-5">
        {/* Animated Mascot & Big Flame Header */}
        <div className="relative flex flex-col items-center justify-center">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-b from-orange-100 to-amber-50 border-2 border-orange-200/90 flex items-center justify-center shadow-inner relative">
            <Mascot expression={isLoggedToday ? 'celebrating' : 'happy'} size="lg" />
            <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md border-2 border-white">
              <Flame className="w-5 h-5 fill-amber-300 stroke-orange-700 animate-bounce" />
            </div>
          </div>

          <div className="mt-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-black uppercase tracking-wider border border-orange-200">
              <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-600" />
              <span>{currentStreak} Day Streak</span>
            </div>
            <h3 className="text-2xl font-black text-stone-900 tracking-tight mt-1">
              {isLoggedToday ? 'Your Flame is Burning Bright!' : 'Keep Your Streak Alive!'}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-xs mx-auto">
              {isLoggedToday
                ? "You've logged healthy portions today. Every balanced plate fuels your habit!"
                : 'Log a balanced meal today to extend your streak and keep your streak flame lit.'}
            </p>
          </div>
        </div>

        {/* Duolingo-style 7-Day Week Calendar */}
        <div className="bg-stone-50 rounded-2xl border-2 border-stone-200 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500 mb-2.5 px-1">
            <span>This Week</span>
            <span className="text-[11px] text-emerald-700 font-extrabold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Best: {streakInfo?.bestStreak ?? profile?.best_streak ?? 12} days
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {(streakInfo?.weekDays ?? []).map((day, idx) => {
              const isFuture = !day.isLogged && !day.isToday && idx > 4;
              return (
                <div key={day.dateKey} className="flex flex-col items-center gap-1">
                  <span className="text-[11px] font-bold text-stone-400">
                    {day.dayLabel}
                  </span>
                  <div
                    className={`w-9 h-10 rounded-xl flex items-center justify-center transition-all ${
                      day.isLogged
                        ? 'bg-gradient-to-t from-orange-500 to-amber-400 text-white shadow-sm border border-orange-400 scale-105'
                        : day.isToday
                        ? 'bg-orange-50 border-2 border-dashed border-orange-400 text-orange-600 animate-pulse'
                        : isFuture
                        ? 'bg-stone-100 text-stone-300'
                        : 'bg-stone-200 text-stone-400'
                    }`}
                  >
                    {day.isLogged ? (
                      <Flame className="w-5 h-5 fill-amber-200 stroke-orange-700" />
                    ) : day.isToday ? (
                      <Clock className="w-4 h-4 text-orange-500" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-stone-300" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div className="bg-white rounded-2xl border-2 border-stone-200/90 p-4 text-left shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-stone-700 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Next Milestone: {nextMilestone} Days</span>
            </span>
            <span className="text-orange-600 font-black">{currentStreak} / {nextMilestone}</span>
          </div>
          <div className="w-full h-3 rounded-full bg-stone-100 overflow-hidden border border-stone-200">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.max(milestonePercent, 10)}%` }}
            />
          </div>
        </div>

        {/* Streak Freeze Inventory (Duolingo Style) */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-sky-50/80 border-2 border-sky-200/80 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-600 shrink-0">
              <Snowflake className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-sky-950">Streak Freeze</h4>
                <span className="text-[10px] font-black bg-sky-200 text-sky-900 px-1.5 py-0.2 rounded-full">
                  {freezes} / 2 Equipped
                </span>
              </div>
              <p className="text-[11px] text-sky-800/80 mt-0.5">
                Protects your flame if you miss logging for a day.
              </p>
            </div>
          </div>

          {freezes < 2 ? (
            <button
              type="button"
              onClick={handleEquipFreeze}
              className="px-3 py-1.5 rounded-full bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              + Equip
            </button>
          ) : (
            <span className="text-[11px] font-bold text-sky-700 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-sky-600" /> Full
            </span>
          )}
        </div>

        {/* Duolingo League and XP Banner */}
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">🏆</span>
            <div>
              <span className="font-extrabold text-amber-950">
                {profile?.league || 'Gold'} League
              </span>
              <span className="text-[10px] text-amber-800/80 block">
                Lv. {profile?.level || 3} • {profile?.level_name || 'Portion Pro'}
              </span>
            </div>
          </div>
          <span className="font-black text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded-full text-[11px]">
            ⚡ {profile?.xp || 480} XP
          </span>
        </div>

        {/* Action Button */}
        <div className="pt-1 space-y-2">
          {!isLoggedToday ? (
            <Link
              href="/camera"
              onClick={onClose}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Camera className="w-4 h-4" /> Log Meal with Camera & Save Streak
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                fireConfetti();
                onClose();
              }}
              className="w-full py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
            >
              Awesome, Keep Healthy Eating!
            </button>
          )}
        </div>
      </div>
    </ResponsiveSheet>
  );
}
