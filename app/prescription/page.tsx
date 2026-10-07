'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Mascot } from '@/components/mascot/Mascot';
import { fireConfetti } from '@/components/effects/Confetti';
import { DataLayer } from '@/lib/data-layer';
import type { Goal, RxSuggestion, Meal } from '@/lib/mock-data';
import {
  ShieldCheck,
  CheckCircle2,
  Circle,
  Sparkles,
  Calendar,
  AlertCircle,
  ChevronRight,
  HeartPulse,
} from 'lucide-react';

export default function PrescriptionPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [rxSuggestions, setRxSuggestions] = useState<RxSuggestion[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [checklist, setChecklist] = useState([
    {
      id: 'chk-1',
      title: '50/25/25 Portion Rule',
      desc: 'Fill half your plate with fibrous vegetables, one quarter with lean protein, one quarter with whole carbs.',
      completed: true,
    },
    {
      id: 'chk-2',
      title: 'Sodium Cap Under 1,800mg',
      desc: 'Limit processed seasoning and cured meats; favor lemon, herbs, and garlic for flavor.',
      completed: true,
    },
    {
      id: 'chk-3',
      title: 'Visual Meal Log with Magic Plate',
      desc: 'Capture at least 2 meals daily through camera plate scan for AI portion scoring.',
      completed: false,
    },
    {
      id: 'chk-4',
      title: 'Daily Hydration Benchmark',
      desc: 'Drink at least 2 liters of water spaced across the day to ease sodium clearance.',
      completed: true,
    },
  ]);

  useEffect(() => {
    async function loadData() {
      const g = await DataLayer.getGoals();
      setGoals(g);
      setRxSuggestions(DataLayer.getRxSuggestions());
      const m = await DataLayer.getMeals();
      setMeals(m);
    }
    loadData();
  }, []);

  const handleToggleGoal = async (id: string) => {
    const updated = await DataLayer.toggleGoal(id);
    setGoals(updated);
    fireConfetti({ particleCount: 20 });
  };

  const handleToggleCheck = (id: string) => {
    setChecklist((prev) =>
      prev.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c))
    );
    fireConfetti({ particleCount: 15 });
  };

  const consumedSodium = meals.reduce((sum, m) => sum + m.sodium_mg, 0);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Medical Dietary Order
          </span>
          <span className="text-xs text-stone-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Active Rx #8492
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          Doctor&apos;s Food Prescription
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Clinically personalized dietary targets prescribed by your care team to improve cardiometabolic biomarkers.
        </p>
      </div>

      {/* Doctor Avatar Card */}
      <Card variant="white" className="p-5 sm:p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-emerald-300 bg-emerald-50 shrink-0">
              <Image
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80"
                alt="Dr. Evelyn Reed"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-stone-900">Dr. Evelyn Reed, MD</h3>
                <ShieldCheck className="w-4 h-4 text-emerald-600 fill-emerald-100" />
              </div>
              <p className="text-xs font-semibold text-emerald-700">
                Preventive Cardiology & Clinical Nutrition
              </p>
              <p className="text-[11px] text-stone-500">Metro Health Wellness Center</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-900 border border-emerald-200/90 rounded-2xl px-3 py-2">
              <Mascot expression="doctor" size="sm" />
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                  Prescription Status
                </span>
                <span className="text-xs font-black">Verified & Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Doctor's Clinical Note */}
        <div className="mt-4 pt-4 border-t border-stone-100 bg-[#F9FDFB] rounded-2xl p-4 border border-emerald-100/80">
          <div className="flex items-start gap-2.5">
            <HeartPulse className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                Physician Instructions
              </h5>
              <p className="text-xs sm:text-sm text-stone-700 mt-1 leading-relaxed">
                &ldquo;Your arterial pressure response has shown consistent stabilization since cutting
                lunchtime sodium below 600mg. Continue aiming for <strong>50% fiber-rich greens</strong>{' '}
                on dinner plates to sustain healthy nitric oxide synthesis.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Goal Chips Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-stone-900">Active Health Directives</h2>
          <span className="text-xs text-stone-500">Tap to toggle goals</span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {goals.map((goal) => (
            <Chip
              key={goal.id}
              label={goal.label}
              variant={goal.is_active ? 'mint' : 'neutral'}
              active={goal.is_active}
              icon={goal.is_active ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              onClick={() => handleToggleGoal(goal.id)}
              size="md"
            />
          ))}
        </div>
      </section>

      {/* Two Column Layout on Desktop: Left Daily Target Cards, Right Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left 6 cols: Daily Target Cards with Progress */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-black text-stone-900">Today&apos;s Prescribed Targets</h2>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Live Progress
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sodium Target */}
            <Card variant="white" className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">Sodium Limit</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {Math.round((consumedSodium / 1800) * 100)}% used
                </span>
              </div>
              <div className="text-xl font-black text-stone-900">
                {consumedSodium} <span className="text-xs font-normal text-stone-500">/ 1,800 mg</span>
              </div>
              <ProgressBar current={consumedSodium} max={1800} autoStatusColor size="sm" showValues={false} />
              <p className="text-[11px] text-stone-500">{Math.max(1800 - consumedSodium, 0)} mg remaining for dinner.</p>
            </Card>

            {/* Added Sugar Cap */}
            <Card variant="white" className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">Added Sugar Cap</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Safe
                </span>
              </div>
              <div className="text-xl font-black text-stone-900">
                12 <span className="text-xs font-normal text-stone-500">/ 25 g</span>
              </div>
              <ProgressBar current={12} max={25} autoStatusColor size="sm" showValues={false} />
              <p className="text-[11px] text-stone-500">Keeps insulin swings gentle.</p>
            </Card>

            {/* Veggie Servings */}
            <Card variant="white" className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">Daily Veggie Servings</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  4 of 5 done
                </span>
              </div>
              <div className="text-xl font-black text-stone-900">
                4 <span className="text-xs font-normal text-stone-500">/ 5 portions</span>
              </div>
              <ProgressBar current={4} max={5} autoStatusColor={false} color="mint" size="sm" showValues={false} />
              <p className="text-[11px] text-stone-500">1 portion with dinner hits goal!</p>
            </Card>

            {/* Water Target */}
            <Card variant="white" className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">Hydration Glasses</span>
                <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
                  75% target
                </span>
              </div>
              <div className="text-xl font-black text-stone-900">
                6 <span className="text-xs font-normal text-stone-500">/ 8 glasses</span>
              </div>
              <ProgressBar current={6} max={8} autoStatusColor={false} color="softblue" size="sm" showValues={false} />
              <p className="text-[11px] text-stone-500">Supports normal vascular tone.</p>
            </Card>
          </div>
        </div>

        {/* Right 6 cols: Prescription Checklist */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-black text-stone-900">Clinical Protocol Checklist</h2>
            <span className="text-xs text-stone-500">Daily routine</span>
          </div>

          <Card variant="white" className="p-4 sm:p-5 space-y-3">
            {checklist.map((item) => (
              <div
                key={item.id}
                onClick={() => handleToggleCheck(item.id)}
                className={`flex items-start gap-3.5 p-3 rounded-2xl border-2 transition-colors cursor-pointer select-none ${
                  item.completed
                    ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100/60'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {item.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                  ) : (
                    <Circle className="w-5 h-5 text-stone-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4
                    className={`text-sm font-bold ${
                      item.completed ? 'line-through text-emerald-900/70' : 'text-stone-900'
                    }`}
                  >
                    {item.title}
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Meal Suggestion Carousel / Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-stone-900">
              Dietitian Prescribed Meal Ideas
            </h2>
            <p className="text-xs text-stone-500">
              Tailored specifically to your active sodium and glycemic directives
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-700">3 Verified Recipes</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rxSuggestions.map((dish) => (
            <Card
              key={dish.id}
              interactive
              className="p-4 flex flex-col justify-between overflow-hidden group"
            >
              <div>
                <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-stone-200 mb-3 bg-stone-100">
                  <Image
                    src={dish.image_url}
                    alt={dish.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {dish.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-bold uppercase tracking-wider bg-stone-900/80 text-white backdrop-blur-xs px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <h4 className="text-base font-bold text-stone-900 leading-snug line-clamp-2">
                  {dish.title}
                </h4>

                <p className="text-xs text-stone-600 mt-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200/60 leading-relaxed">
                  <Sparkles className="w-3 h-3 text-amber-500 inline mr-1" />
                  {dish.dietitian_note}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-semibold text-stone-700">
                  <span>{dish.calories} kcal</span>
                  <span>•</span>
                  <span className="text-emerald-700">Na {dish.sodium_mg}mg</span>
                </div>

                <span className="text-emerald-600 font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                  Recipe <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
