'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Pill, Camera, Utensils, User, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { Mascot } from '../mascot/Mascot';
import { DataLayer, type StreakInfo } from '@/lib/data-layer';
import type { Profile } from '@/lib/mock-data';

export function BottomNav() {
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

  const navItems = [
    { label: 'Home', href: '/', icon: Home, isProfile: false },
    { label: 'Rx', href: '/prescription', icon: Pill, isProfile: false },
    // Center camera item handled specially
    { label: 'Next Meal', href: '/next-meal', icon: Utensils, isProfile: false },
    {
      label: profile ? `Lv. ${profile.level}` : 'Profile',
      href: '/login',
      icon: User,
      isProfile: true,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t-2 border-stone-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] pb-safe"
    >
      <div className="relative flex items-center justify-around h-16 max-w-lg mx-auto px-3">
        {/* First 2 items */}
        {navItems.slice(0, 2).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors select-none ${
                isActive ? 'text-emerald-600 font-bold' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-dot"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full"
                  />
                )}
              </div>
              <span className="text-[11px] mt-1">{item.label}</span>
            </Link>
          );
        })}

        {/* Center Camera Floating Button */}
        <div className="relative -top-5 flex items-center justify-center px-2">
          <Link
            href="/camera"
            aria-label="Magic Plate Camera"
            className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-400 to-sky-400 text-white border-4 border-[#FFFDF9] shadow-[0_8px_20px_rgba(16,185,129,0.35)] transition-transform active:scale-90 hover:scale-105 cursor-pointer"
          >
            <motion.div
              animate={{ rotate: [0, -4, 4, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            >
              <Camera className="w-7 h-7 stroke-[2.5]" />
            </motion.div>
            {/* Subtle animated ring around camera */}
            <span className="absolute inset-0 rounded-full border-2 border-white/60 animate-ping opacity-25 pointer-events-none" />
          </Link>
        </div>

        {/* Next 2 items */}
        {navItems.slice(2).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors select-none ${
                isActive ? 'text-emerald-600 font-bold' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <div className="relative flex items-center justify-center">
                {item.isProfile ? (
                  <div className="relative flex items-center justify-center">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center overflow-hidden transition-all ${
                        isActive
                          ? 'bg-emerald-100 border-2 border-emerald-500 shadow-xs scale-105'
                          : 'bg-stone-100 border border-stone-200'
                      }`}
                    >
                      <div className="w-10 h-10 flex items-center justify-center scale-65">
                        <Mascot expression={profile?.avatar_mascot || 'happy'} size="sm" animate={false} />
                      </div>
                    </div>
                    {streakInfo && (
                      <span className="absolute -top-1.5 -right-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[9px] font-black px-1.5 py-0 rounded-full border border-white shadow-xs flex items-center gap-0.5">
                        <Flame className="w-2.5 h-2.5 fill-amber-300 stroke-none" />
                        {streakInfo.currentStreak}
                      </span>
                    )}
                  </div>
                ) : (
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                )}
                {isActive && !item.isProfile && (
                  <motion.div
                    layoutId="bottom-nav-dot"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full"
                  />
                )}
              </div>
              <span className={`text-[11px] mt-1 ${item.isProfile ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
