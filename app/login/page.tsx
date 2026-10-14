'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Mascot, type MascotExpression } from '@/components/mascot/Mascot';
import { StreakModal } from '@/components/streak/StreakModal';
import { fireConfetti } from '@/components/effects/Confetti';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { DataLayer, type StreakInfo } from '@/lib/data-layer';
import type { Profile, Meal } from '@/lib/mock-data';
import { login, signup, logout } from './actions';
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
  Snowflake,
  User,
  Edit3,
  ShieldCheck,
  RefreshCw,
  Trophy,
  Star,
  Clock,
  Zap,
} from 'lucide-react';

const MASCOT_AVATARS: { id: MascotExpression; label: string; emoji: string }[] = [
  { id: 'happy', label: 'Happy Pal', emoji: '🥗' },
  { id: 'chewing', label: 'Chewing Pal', emoji: '🥪' },
  { id: 'celebrating', label: 'Party Pal', emoji: '🎉' },
  { id: 'thinking', label: 'Smart Pal', emoji: '💡' },
];

export default function LoginPage() {
  const router = useRouter();
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);

  // Profile edit state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [newGuestName, setNewGuestName] = useState('');
  const [showCloudAuth, setShowCloudAuth] = useState(false);

  useEffect(() => {
    setIsConfigured(isSupabaseConfigured());
    loadAccountData();
  }, []);

  async function loadAccountData() {
    const p = await DataLayer.getProfile();
    const m = await DataLayer.getMeals();
    const s = DataLayer.calculateStreak(m, p);
    setProfile(p);
    setMeals(m);
    setStreakInfo(s);
    setEditName(p.display_name);
  }

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
        setAuthMessage('Account created! Please check your email or log in.');
        setIsError(false);
      } else {
        await loadAccountData();
        fireConfetti();
      }
    } catch (err: unknown) {
      setIsError(true);
      setAuthMessage(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    const updated = await DataLayer.updateProfile({ display_name: editName.trim() });
    setProfile(updated);
    setIsEditingName(false);
    fireConfetti({ particleCount: 20 });
  };

  const handleSelectAvatarMascot = async (mascot: MascotExpression) => {
    const updated = await DataLayer.updateProfile({ avatar_mascot: mascot });
    setProfile(updated);
    fireConfetti({ particleCount: 20 });
  };

  const handleEquipFreeze = async () => {
    const updated = await DataLayer.equipStreakFreeze();
    setProfile(updated);
    fireConfetti({ particleCount: 25 });
  };

  const handleSwitchProfile = async (profileId: string) => {
    setIsLoading(true);
    const switched = await DataLayer.switchProfile(profileId);
    setProfile(switched);
    setEditName(switched.display_name);
    const m = await DataLayer.getMeals();
    const s = DataLayer.calculateStreak(m, switched);
    setStreakInfo(s);
    setIsLoading(false);
    fireConfetti({ particleCount: 30 });
  };

  const handleCreateGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuestName.trim()) return;
    const created = await DataLayer.loginLocal(newGuestName.trim());
    setProfile(created);
    setNewGuestName('');
    const m = await DataLayer.getMeals();
    const s = DataLayer.calculateStreak(m, created);
    setStreakInfo(s);
    fireConfetti();
  };

  const handleLogout = async () => {
    await DataLayer.logout();
    if (isConfigured) {
      await logout();
    }
    await loadAccountData();
  };

  const xpProgress = profile ? ((profile.xp % 250) / 250) * 100 : 0;
  const demoProfiles = DataLayer.getDemoProfiles();

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fadeIn py-2 sm:py-4">
      {/* Duolingo-Style Header Profile Card */}
      {profile && (
        <Card variant="white" className="p-5 sm:p-6 relative overflow-hidden border-2 border-stone-200/90 shadow-sm">
          {/* Header row: Avatar, Name, League */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="relative group">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-100 to-amber-100 border-2 border-emerald-300 flex items-center justify-center shadow-inner overflow-hidden p-1.5">
                <Mascot expression={profile.avatar_mascot || 'happy'} size="md" />
              </div>
              <span className="absolute -bottom-1 -right-1 text-base bg-white rounded-full p-0.5 shadow-xs border border-stone-200">
                ⭐
              </span>
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="px-3 py-1 rounded-xl border-2 border-emerald-500 text-sm font-bold text-stone-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="px-2 py-1 text-xs text-stone-500 hover:text-stone-700"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                      {profile.display_name}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
                      title="Edit Display Name"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black border border-amber-300 self-center sm:self-auto">
                  <Trophy className="w-3 h-3 text-amber-600" />
                  <span>{profile.league} League</span>
                </div>
              </div>

              <p className="text-xs text-stone-500">
                {profile.email} • Joined {profile.joined_date}
              </p>

              {/* Avatar Mascot Selector */}
              <div className="pt-2 flex items-center justify-center sm:justify-start gap-1.5">
                <span className="text-[10px] font-bold uppercase text-stone-400 mr-1">
                  Mascot:
                </span>
                {MASCOT_AVATARS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectAvatarMascot(m.id)}
                    className={`px-2 py-1 rounded-xl text-xs font-bold transition-all ${
                      profile.avatar_mascot === m.id
                        ? 'bg-emerald-100 text-emerald-900 border-2 border-emerald-400 scale-105 shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80 border border-stone-200'
                    }`}
                    title={m.label}
                  >
                    <span>{m.emoji}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Duolingo Stats Grid (Streak, XP, Level, Freeze) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-stone-100">
            {/* Streak Card */}
            <button
              type="button"
              onClick={() => {
                setIsStreakModalOpen(true);
                fireConfetti({ particleCount: 20 });
              }}
              className="p-3 rounded-2xl bg-orange-50/80 border-2 border-orange-200 text-left hover:bg-orange-100/70 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase text-orange-600 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 fill-orange-400 text-orange-600 group-hover:scale-110 transition-transform" />
                  Streak
                </span>
                <span className="text-[10px] font-bold text-orange-700 bg-orange-200/60 px-1.5 py-0.2 rounded-full">
                  {streakInfo?.isLoggedToday ? 'Active 🔥' : 'Pending ⏳'}
                </span>
              </div>
              <div className="text-xl font-black text-orange-950">
                {streakInfo?.currentStreak ?? profile.streak_count} <span className="text-xs font-bold text-orange-700">Days</span>
              </div>
            </button>

            {/* XP & Level Card */}
            <div className="p-3 rounded-2xl bg-amber-50/80 border-2 border-amber-200 text-left">
              <span className="text-[11px] font-bold uppercase text-amber-700 flex items-center gap-1 mb-1">
                <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-600" />
                Total XP
              </span>
              <div className="text-xl font-black text-amber-950">
                {profile.xp} <span className="text-xs font-bold text-amber-700">XP</span>
              </div>
              <div className="w-full h-1.5 bg-amber-200 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>

            {/* Level Tier Card */}
            <div className="p-3 rounded-2xl bg-emerald-50/80 border-2 border-emerald-200 text-left">
              <span className="text-[11px] font-bold uppercase text-emerald-700 flex items-center gap-1 mb-1">
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                Rank
              </span>
              <div className="text-base font-black text-emerald-950 truncate">
                Lv. {profile.level}
              </div>
              <span className="text-[11px] font-semibold text-emerald-800 line-clamp-1">
                {profile.level_name}
              </span>
            </div>

            {/* Streak Freeze Card */}
            <div className="p-3 rounded-2xl bg-sky-50/80 border-2 border-sky-200 text-left flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase text-sky-700 flex items-center gap-1 mb-1">
                  <Snowflake className="w-3.5 h-3.5 text-sky-600" />
                  Freezes
                </span>
                <div className="text-base font-black text-sky-950">
                  {profile.streak_freezes} / 2
                </div>
              </div>
              {profile.streak_freezes < 2 ? (
                <button
                  type="button"
                  onClick={handleEquipFreeze}
                  className="text-[10px] font-extrabold text-white bg-sky-500 hover:bg-sky-600 px-2 py-0.5 rounded-full transition-all text-center mt-1 cursor-pointer"
                >
                  + Equip Freeze
                </button>
              ) : (
                <span className="text-[10px] font-bold text-sky-700 mt-1 flex items-center gap-0.5">
                  <ShieldCheck className="w-3 h-3" /> Protected
                </span>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Duolingo Achievements / Badges Shelf */}
      {profile && (
        <Card variant="white" className="p-5 border-2 border-stone-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700">
                Achievements & Badges
              </h3>
            </div>
            <span className="text-xs font-bold text-stone-500">
              {profile.badges.filter((b) => b.unlocked).length} / {profile.badges.length} Unlocked
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {profile.badges.map((badge) => (
              <div
                key={badge.id}
                className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center text-center ${
                  badge.unlocked
                    ? 'bg-gradient-to-b from-amber-50/80 to-stone-50 border-amber-300 shadow-xs'
                    : 'bg-stone-50/60 border-stone-200 opacity-60'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl mb-1.5 shadow-xs ${
                    badge.unlocked ? 'bg-amber-100 border border-amber-300' : 'bg-stone-200 text-stone-400'
                  }`}
                >
                  {badge.unlocked ? badge.icon : '🔒'}
                </div>
                <h4 className="text-xs font-bold text-stone-900 line-clamp-1">{badge.title}</h4>
                <p className="text-[10px] text-stone-500 line-clamp-2 mt-0.5 leading-tight">
                  {badge.description}
                </p>
                {badge.unlocked && (
                  <span className="text-[9px] font-black text-emerald-700 uppercase mt-1 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
                    Earned ✓
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Switch Demo Account / Local Profiles */}
      <Card variant="white" className="p-5 border-2 border-stone-200/90 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700">
              Quick Switch Profile
            </h3>
          </div>
          <span className="text-xs text-stone-400">One-click testing</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {demoProfiles.map((dp) => {
            const isCurrent = profile?.id === dp.id;
            return (
              <button
                key={dp.id}
                type="button"
                onClick={() => handleSwitchProfile(dp.id)}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                    : 'border-stone-200 bg-stone-50/80 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-stone-900 truncate">
                    {dp.display_name}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-stone-500 flex items-center gap-2">
                  <span>🔥 {dp.streak_count}d</span>
                  <span>⚡ {dp.xp} XP</span>
                  <span>Lv.{dp.level}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom guest name form */}
        <form onSubmit={handleCreateGuest} className="mt-4 pt-3 border-t border-stone-100 flex gap-2">
          <input
            type="text"
            placeholder="Create custom profile name..."
            value={newGuestName}
            onChange={(e) => setNewGuestName(e.target.value)}
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="px-3 py-2 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition-colors"
          >
            Create
          </button>
        </form>
      </Card>

      {/* Cloud Supabase Authentication Section */}
      <Card variant="white" className="p-5 border-2 border-stone-200/90 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700">
              Supabase Cloud Account
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowCloudAuth(!showCloudAuth)}
            className="text-xs font-bold text-sky-700 hover:underline cursor-pointer"
          >
            {showCloudAuth ? 'Hide Login' : 'Show Email Login'}
          </button>
        </div>

        {!isConfigured ? (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Live Supabase Sync is Optional</p>
              <p className="text-amber-800/90 leading-relaxed">
                Plate Pal operates with <strong>full local persistence & gamification</strong> even without cloud credentials.
                To sync your streaks across multiple devices, connect your Supabase project in <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env.local</code>.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Supabase Cloud Sync is configured & active.</span>
          </div>
        )}

        {showCloudAuth && (
          <form action={(formData) => handleAuth(formData, 'login')} className="mt-4 space-y-3 pt-3 border-t border-stone-100">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Email</label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  placeholder="alex@platepal.app"
                  disabled={!isConfigured}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-emerald-500 disabled:bg-stone-100"
                />
                <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  disabled={!isConfigured}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-emerald-500 disabled:bg-stone-100"
                />
                <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
              </div>
            </div>

            {authMessage && (
              <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${isError ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`}>
                {isError ? <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> : <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                <span>{authMessage}</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={isLoading || !isConfigured}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
              <button
                type="submit"
                formAction={(formData) => handleAuth(formData, 'signup')}
                disabled={isLoading || !isConfigured}
                className="flex-1 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition-colors disabled:opacity-50"
              >
                Sign Up
              </button>
            </div>
          </form>
        )}
      </Card>

      {/* Logout Action Button */}
      <div className="pt-2 flex justify-center">
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-stone-500 hover:text-rose-700 hover:bg-rose-50 border border-stone-200 hover:border-rose-200 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out / Reset Session
        </button>
      </div>

      {/* Reusable Streak Celebration Modal */}
      <StreakModal
        isOpen={isStreakModalOpen}
        onClose={() => setIsStreakModalOpen(false)}
        streakInfo={streakInfo}
        profile={profile}
        onProfileUpdate={(updated) => setProfile(updated)}
      />
    </div>
  );
}
