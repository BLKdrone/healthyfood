'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Mascot } from '@/components/mascot/Mascot';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { DataLayer } from '@/lib/data-layer';
import type { Profile } from '@/lib/mock-data';
import { login, signup } from './actions';
import {
  Lock,
  Mail,
  ArrowRight,
  Database,
  Sparkles,
  CheckCircle,
  AlertCircle,
  LogOut,
  Flame,
  Award,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    setIsConfigured(isSupabaseConfigured());
    DataLayer.getProfile().then(setProfile);
  }, []);

  const handleAuth = async (formData: FormData, mode: 'login' | 'signup') => {
    if (!isConfigured) return;
    setIsLoading(true);
    setAuthMessage(null);
    setIsError(false);

    try {
      const result = mode === 'login' ? await login(formData) : await signup(formData);
      
      if (result?.error) {
        setIsError(true);
        setAuthMessage(result.error);
      } else if (mode === 'signup') {
        setAuthMessage('Signed up! Please check your email (or try logging in if auto-confirmed).');
        setIsError(false);
      }
    } catch (err: unknown) {
      setIsError(true);
      setAuthMessage(err instanceof Error ? err.message : 'Auth failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoBypass = () => {
    router.push('/');
  };

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fadeIn py-4">
      {/* Brand & Mascot */}
      <div className="text-center space-y-2">
        <Mascot expression="happy" size="lg" className="mx-auto" />
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          Welcome to Plate Pal
        </h1>
        <p className="text-xs sm:text-sm text-stone-600">
          Your cute AI companion for healthy portions and personalized care.
        </p>
      </div>

      {/* Supabase Status Banner */}
      {!isConfigured ? (
        <Card variant="butter" className="p-5 border-amber-300">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-200 text-amber-900 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-950">
                Connect Supabase to Enable Live Cloud Login
              </h4>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                Supabase environment variables are currently empty in <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">.env.local</code>.
                Plate Pal is running in <strong>Full Interactive Demo Mode</strong> with mock data!
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-200/80 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-800">
              Zero configuration required to test
            </span>
            <button
              type="button"
              onClick={handleDemoBypass}
              className="px-3.5 py-1.5 rounded-full bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-xs transition-colors cursor-pointer"
            >
              Continue as Guest Demo →
            </button>
          </div>
        </Card>
      ) : (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Connected to Supabase live instance!</span>
        </div>
      )}

      {/* Current Demo Profile Card */}
      {profile && (
        <Card variant="white" className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Active Session Profile
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {isConfigured ? 'Cloud User' : 'Demo Profile'}
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center font-bold text-emerald-900 text-sm">
              AM
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-stone-900 truncate">
                {profile.display_name}
              </h3>
              <p className="text-xs text-stone-500 truncate">{profile.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-stone-100 text-center">
            <div className="bg-orange-50/70 p-2 rounded-xl border border-orange-200/60">
              <span className="text-[10px] uppercase font-bold text-orange-600 flex items-center justify-center gap-1">
                <Flame className="w-3 h-3" /> Streak
              </span>
              <span className="text-sm font-black text-orange-950">
                {profile.streak_count} Days
              </span>
            </div>
            <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-200/60">
              <span className="text-[10px] uppercase font-bold text-amber-600 flex items-center justify-center gap-1">
                <Award className="w-3 h-3" /> Level
              </span>
              <span className="text-sm font-black text-amber-950">
                Lv. {profile.level} Pro
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Sign In Form */}
      <Card variant="white" className="p-6">
        <h3 className="text-base font-bold text-stone-900 mb-4">
          {isConfigured ? 'Sign in with your email' : 'Sign In with Supabase'}
        </h3>

        <form action={(formData) => handleAuth(formData, 'login')} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                name="email"
                placeholder="alex@platepal.app"
                disabled={!isConfigured}
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl border-2 border-stone-200 focus:border-emerald-500 focus:outline-none text-sm text-stone-800 disabled:bg-stone-100 disabled:text-stone-400"
              />
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                disabled={!isConfigured}
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl border-2 border-stone-200 focus:border-emerald-500 focus:outline-none text-sm text-stone-800 disabled:bg-stone-100 disabled:text-stone-400"
              />
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
            </div>
          </div>

          {authMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                isError
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {isError ? (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              )}
              <span>{authMessage}</span>
            </div>
          )}

          {isConfigured ? (
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-1/2 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Wait...' : 'Sign In'}
              </button>
              <button
                type="submit"
                formAction={(formData) => handleAuth(formData, 'signup')}
                disabled={isLoading}
                className="w-1/2 py-3 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                Sign Up
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleDemoBypass}
              className="w-full py-3 rounded-full bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              Enter Plate Pal in Demo Mode <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </form>
      </Card>
    </div>
  );
}
