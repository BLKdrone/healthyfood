'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mascot } from '../mascot/Mascot';
import { DataLayer, type StreakInfo } from '@/lib/data-layer';
import type { Profile } from '@/lib/mock-data';
import { Home, Pill, Camera, Utensils, User, Flame, Award, Sparkles, Zap } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);

  useEffect(() => {
    async function load() {
      const p = await DataLayer.getProfile();
      const m = await DataLayer.getMeals();
      const s = DataLayer.calculateStreak(m, p);
      setProfile(p);
      setStreakInfo(s);
    }
    load();

    const handleProfileUpdate = () => {
      load();
    };
    window.addEventListener('plate_pal_profile_update', handleProfileUpdate);
    return () => {
      window.removeEventListener('plate_pal_profile_update', handleProfileUpdate);
    };
  }, [pathname]);

  const navLinks = [
    { label: 'Home Dashboard', href: '/', icon: Home, badge: 'Today' },
    { label: "Doctor's Rx", href: '/prescription', icon: Pill, badge: 'Goals' },
    { label: 'Magic Plate Camera', href: '/camera', icon: Camera, badge: 'Scan' },
    { label: 'Next Meal AI', href: '/next-meal', icon: Utensils, badge: 'Smart' },
    { label: 'Profile & Settings', href: '/login', icon: User },
  ];

  return (
    <aside
      aria-label="Desktop Navigation"
      className="hidden lg:flex fixed top-0 left-0 bottom-0 w-72 flex-col justify-between bg-white border-r-2 border-stone-200/90 shadow-[4px_0_24px_rgba(0,0,0,0.02)] p-6 z-30"
    >
      {/* Top Brand & Mascot */}
      <div>
        <Link href="/" className="flex items-center gap-3.5 group mb-8 select-none">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border-2 border-emerald-200/80 flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
            <Mascot expression="happy" size="sm" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-stone-900">
                Plate Pal
              </span>
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
            </div>
            <p className="text-xs font-semibold text-stone-400">
              Your portion-control buddy
            </p>
          </div>
        </Link>

        {/* Navigation Menu */}
        <nav className="space-y-1.5">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between px-3.5 py-3 rounded-2xl border-2 transition-all select-none min-h-[48px] ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200 font-bold shadow-sm'
                    : 'bg-transparent text-stone-600 border-transparent hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? 'text-emerald-600 stroke-[2.5]' : 'text-stone-400 stroke-2'
                    }`}
                  />
                  <span className="text-sm">{link.label}</span>
                </div>
                {link.badge && (
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                      isActive
                        ? 'bg-emerald-200 text-emerald-900 border-emerald-300'
                        : 'bg-stone-100 text-stone-500 border-stone-200'
                    }`}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Status Card */}
      <Link
        href="/login"
        className="block bg-[#FFFDF9] rounded-2xl border-2 border-stone-200/90 p-3.5 hover:border-emerald-300 transition-all group"
      >
        <div className="flex items-center gap-3 mb-2.5">
          <div className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-emerald-300 bg-emerald-50 flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
            <Mascot expression={profile?.avatar_mascot || 'happy'} size="sm" />
          </div>
          <div className="min-w-0 flex-1">
            <h5 className="text-sm font-bold text-stone-900 truncate">
              {profile?.display_name || 'Plate Pal Friend'}
            </h5>
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <Award className="w-3 h-3" /> Lv. {profile?.level || 3} • {profile?.league || 'Gold'}
            </span>
          </div>
        </div>

        {/* Streak & XP pills */}
        <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-stone-100 text-center">
          <div className="bg-orange-50/80 rounded-xl p-1.5 border border-orange-200/60">
            <span className="text-[10px] uppercase font-bold text-orange-600 flex items-center justify-center gap-0.5">
              <Flame className="w-3 h-3 fill-orange-400" /> Streak
            </span>
            <span className="text-xs font-black text-orange-950">
              {streakInfo?.currentStreak ?? profile?.streak_count ?? 5} Days
            </span>
          </div>
          <div className="bg-amber-50/80 rounded-xl p-1.5 border border-amber-200/60">
            <span className="text-[10px] uppercase font-bold text-amber-700 flex items-center justify-center gap-0.5">
              <Zap className="w-3 h-3 fill-amber-400" /> Total XP
            </span>
            <span className="text-xs font-black text-amber-950">
              {profile?.xp || 480} XP
            </span>
          </div>
        </div>
      </Link>
    </aside>
  );
}
