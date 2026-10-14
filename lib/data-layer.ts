import { isSupabaseConfigured, createClient } from './supabase/client';
import {
  INITIAL_PROFILE,
  DEMO_PROFILES,
  INITIAL_DAILY_TARGETS,
  INITIAL_GOALS,
  INITIAL_MEALS,
  RX_SUGGESTIONS,
  NEXT_MEAL_OPTIONS,
  type Profile,
  type DailyTargets,
  type Goal,
  type Meal,
  type RxSuggestion,
  type NextMealOption,
} from './mock-data';

export interface StreakInfo {
  currentStreak: number;
  bestStreak: number;
  isLoggedToday: boolean;
  streakStatus: 'active' | 'at_risk' | 'frozen';
  weekDays: {
    dayName: string;
    dayLabel: string;
    dateKey: string;
    isLogged: boolean;
    isToday: boolean;
  }[];
}

const STORAGE_KEYS = {
  MEALS: 'plate_pal_meals',
  GOALS: 'plate_pal_goals',
  PROFILE: 'plate_pal_profile',
  TARGETS: 'plate_pal_targets',
};

// Helper to access localStorage safely in SSR
function getStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

export const DataLayer = {
  isLive(): boolean {
    return isSupabaseConfigured();
  },

  async getProfile(): Promise<Profile> {
    if (this.isLive()) {
      const supabase = createClient();
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          if (data) {
            return {
              id: data.id,
              email: data.email ?? user.email ?? '',
              display_name: data.display_name ?? 'Plate Pal Friend',
              avatar_url: data.avatar_url ?? INITIAL_PROFILE.avatar_url,
              avatar_mascot: data.avatar_mascot ?? INITIAL_PROFILE.avatar_mascot,
              streak_count: data.streak_count ?? 5,
              best_streak: data.best_streak ?? 12,
              streak_freezes: data.streak_freezes ?? 1,
              xp: data.xp ?? 480,
              level: data.level ?? 3,
              level_name: data.level_name ?? 'Portion Pro',
              league: data.league ?? 'Gold',
              joined_date: data.joined_date ?? 'Oct 2026',
              badges: INITIAL_PROFILE.badges,
            };
          }
        }
      }
    }
    const stored = getStored<Profile>(STORAGE_KEYS.PROFILE, INITIAL_PROFILE);
    return {
      ...INITIAL_PROFILE,
      ...stored,
      badges: stored.badges && stored.badges.length > 0 ? stored.badges : INITIAL_PROFILE.badges,
    };
  },

  async getGoals(): Promise<Goal[]> {
    if (this.isLive()) {
      const supabase = createClient();
      if (supabase) {
        const { data } = await supabase.from('goals').select('*');
        if (data && data.length > 0) {
          return data.map((g) => ({
            id: g.id,
            goal_key: g.goal_key,
            label: g.label,
            description: g.description ?? '',
            is_active: g.is_active,
            tag: g.goal_key.replace('_', ' ').toUpperCase(),
          }));
        }
      }
    }
    return getStored<Goal[]>(STORAGE_KEYS.GOALS, INITIAL_GOALS);
  },

  async toggleGoal(goalId: string): Promise<Goal[]> {
    const currentGoals = await this.getGoals();
    const updated = currentGoals.map((g) =>
      g.id === goalId ? { ...g, is_active: !g.is_active } : g
    );

    if (this.isLive()) {
      const supabase = createClient();
      const target = updated.find((g) => g.id === goalId);
      if (supabase && target) {
        await supabase
          .from('goals')
          .update({ is_active: target.is_active })
          .eq('id', goalId);
      }
    }

    setStored(STORAGE_KEYS.GOALS, updated);
    return updated;
  },

  async getDailyTargets(): Promise<DailyTargets> {
    if (this.isLive()) {
      const supabase = createClient();
      if (supabase) {
        const { data } = await supabase
          .from('daily_targets')
          .select('*')
          .limit(1)
          .maybeSingle();
        if (data) {
          return {
            calorie_target: data.calorie_target,
            sodium_limit_mg: data.sodium_limit_mg,
            carbs_limit_g: data.carbs_limit_g,
            protein_target_g: data.protein_target_g,
            water_target_ml: data.water_target_ml,
          };
        }
      }
    }
    return getStored<DailyTargets>(STORAGE_KEYS.TARGETS, INITIAL_DAILY_TARGETS);
  },

  async getMeals(): Promise<Meal[]> {
    if (this.isLive()) {
      const supabase = createClient();
      if (supabase) {
        const { data } = await supabase
          .from('meals')
          .select('*')
          .order('logged_at', { ascending: false });
        if (data && data.length > 0) {
          return data.map((m) => ({
            id: m.id,
            title: m.title,
            meal_type: m.meal_type,
            image_url: m.image_url ?? '',
            portion_score: Number(m.portion_score),
            calories: m.calories,
            sodium_mg: m.sodium_mg,
            carbs_g: m.carbs_g,
            protein_g: m.protein_g,
            friendly_note: m.friendly_note ?? '',
            logged_at: m.logged_at,
            time_label: new Date(m.logged_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          }));
        }
      }
    }
    return getStored<Meal[]>(STORAGE_KEYS.MEALS, INITIAL_MEALS);
  },

  async logMeal(
    meal: Omit<Meal, 'id' | 'logged_at' | 'time_label'> & {
      logged_at?: string;
      time_label?: string;
    }
  ): Promise<Meal> {
    const timestamp = meal.logged_at || new Date().toISOString();
    const timeLabel =
      meal.time_label ||
      new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMeal: Meal = {
      ...meal,
      id: `m-${Date.now()}`,
      logged_at: timestamp,
      time_label: timeLabel,
    };

    if (this.isLive()) {
      const supabase = createClient();
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('meals')
            .insert({
              user_id: user.id,
              title: newMeal.title,
              meal_type: newMeal.meal_type,
              image_url: newMeal.image_url,
              portion_score: newMeal.portion_score,
              calories: newMeal.calories,
              sodium_mg: newMeal.sodium_mg,
              carbs_g: newMeal.carbs_g,
              protein_g: newMeal.protein_g,
              friendly_note: newMeal.friendly_note,
              logged_at: newMeal.logged_at,
            })
            .select()
            .single();
          if (data) {
            newMeal.id = data.id;
          }
        }
      }
    }

    const currentMeals = await this.getMeals();
    const updatedMeals = [newMeal, ...currentMeals];
    setStored(STORAGE_KEYS.MEALS, updatedMeals);

    // Duolingo-style XP and streak reward
    try {
      const currentProfile = await this.getProfile();
      const streakInfo = this.calculateStreak(updatedMeals, currentProfile);
      const xpBonus = newMeal.portion_score >= 9.0 ? 70 : 50;
      const newXp = (currentProfile.xp || 0) + xpBonus;
      const newLevel = Math.max(currentProfile.level || 1, Math.floor(newXp / 250) + 1);

      const levelNames = [
        'Beginner Eater',
        'Healthy Explorer',
        'Portion Pro',
        'Plate Master',
        'Nutrition Wizard',
        'Diamond Champion',
      ];
      const newLevelName = levelNames[Math.min(newLevel - 1, levelNames.length - 1)];

      const leagueTiers: Profile['league'][] = ['Bronze', 'Silver', 'Gold', 'Emerald', 'Diamond'];
      const leagueIndex = Math.min(Math.floor(newXp / 300), leagueTiers.length - 1);
      const newLeague = leagueTiers[leagueIndex];

      const updatedBadges = currentProfile.badges.map((b) => {
        if (b.id === 'badge-1' && streakInfo.currentStreak >= 5) return { ...b, unlocked: true };
        if (b.id === 'badge-3') return { ...b, unlocked: true };
        if (b.id === 'badge-5' && streakInfo.currentStreak >= 14) return { ...b, unlocked: true };
        return b;
      });

      await this.updateProfile({
        xp: newXp,
        level: newLevel,
        level_name: newLevelName,
        league: newLeague,
        streak_count: streakInfo.currentStreak,
        best_streak: streakInfo.bestStreak,
        badges: updatedBadges,
      });
    } catch {
      // ignore
    }

    return newMeal;
  },

  filterMealsByDate(meals: Meal[], targetDate: Date): Meal[] {
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    const targetKey = `${y}-${m}-${d}`;

    return meals.filter((meal) => {
      const mealDate = new Date(meal.logged_at);
      if (isNaN(mealDate.getTime())) return false;
      const my = mealDate.getFullYear();
      const mm = String(mealDate.getMonth() + 1).padStart(2, '0');
      const md = String(mealDate.getDate()).padStart(2, '0');
      return `${my}-${mm}-${md}` === targetKey;
    });
  },

  async uploadMealImage(fileBlob: Blob, fileExt: string): Promise<string | null> {
    if (this.isLive()) {
      const supabase = createClient();
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const fileName = `${user.id}/${Date.now()}.${fileExt}`;
          const { data, error } = await supabase.storage
            .from('meal-images')
            .upload(fileName, fileBlob, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (!error && data) {
            const { data: { publicUrl } } = supabase.storage
              .from('meal-images')
              .getPublicUrl(fileName);
            return publicUrl;
          }
        }
      }
    }
    return null;
  },

  async deleteMeal(id: string): Promise<void> {
    if (this.isLive()) {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('meals').delete().eq('id', id);
      }
    }
    const currentMeals = await this.getMeals();
    const updatedMeals = currentMeals.filter((m) => m.id !== id);
    setStored(STORAGE_KEYS.MEALS, updatedMeals);
  },

  getRxSuggestions(): RxSuggestion[] {
    return RX_SUGGESTIONS;
  },

  getNextMealOptions(): NextMealOption[] {
    return NEXT_MEAL_OPTIONS;
  },

  calculateStreak(meals: Meal[], profile?: Profile): StreakInfo {
    const datesSet = new Set<string>();
    meals.forEach((m) => {
      const d = new Date(m.logged_at);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        datesSet.add(`${y}-${mo}-${day}`);
      }
    });

    const now = new Date();
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const mo = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${mo}-${day}`;
    };

    const todayKey = formatDate(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatDate(yesterday);

    const isLoggedToday = datesSet.has(todayKey);
    const isLoggedYesterday = datesSet.has(yesterdayKey);

    let streak = 0;
    let checkDate = new Date(now);
    let streakStatus: 'active' | 'at_risk' | 'frozen' = 'at_risk';

    if (isLoggedToday) {
      streakStatus = 'active';
      while (datesSet.has(formatDate(checkDate))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    } else if (isLoggedYesterday) {
      streakStatus = 'at_risk';
      checkDate = new Date(yesterday);
      while (datesSet.has(formatDate(checkDate))) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    } else {
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      if ((profile?.streak_freezes ?? 0) > 0 && datesSet.has(formatDate(twoDaysAgo))) {
        streakStatus = 'frozen';
        checkDate = new Date(twoDaysAgo);
        while (datesSet.has(formatDate(checkDate))) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
      } else {
        streak = 0;
        streakStatus = 'at_risk';
      }
    }

    const currentStreak = Math.max(streak, profile?.streak_count ?? 1);
    const bestStreak = Math.max(currentStreak, profile?.best_streak ?? 12);

    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(monday.getDate() + mondayOffset);

    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      const k = formatDate(d);
      return {
        dayName: dayNames[i],
        dayLabel: dayLabels[i],
        dateKey: k,
        isLogged: datesSet.has(k) || (i < 5 && k <= todayKey),
        isToday: k === todayKey,
      };
    });

    return {
      currentStreak,
      bestStreak,
      isLoggedToday,
      streakStatus,
      weekDays,
    };
  },

  async updateProfile(updates: Partial<Profile>): Promise<Profile> {
    const current = await this.getProfile();
    const updated: Profile = {
      ...current,
      ...updates,
    };

    if (this.isLive()) {
      const supabase = createClient();
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({
              display_name: updated.display_name,
              avatar_url: updated.avatar_url,
              streak_count: updated.streak_count,
              level: updated.level,
            })
            .eq('id', user.id);
        }
      }
    }

    setStored(STORAGE_KEYS.PROFILE, updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('plate_pal_profile_update', { detail: updated }));
    }
    return updated;
  },

  async equipStreakFreeze(): Promise<Profile> {
    const current = await this.getProfile();
    if (current.streak_freezes >= 2) return current;
    return this.updateProfile({ streak_freezes: current.streak_freezes + 1 });
  },

  async switchProfile(profileId: string): Promise<Profile> {
    const found = DEMO_PROFILES.find((p) => p.id === profileId) || DEMO_PROFILES[0];
    setStored(STORAGE_KEYS.PROFILE, found);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('plate_pal_profile_update', { detail: found }));
    }
    return found;
  },

  getDemoProfiles(): Profile[] {
    return DEMO_PROFILES;
  },

  async loginLocal(displayName: string, email?: string): Promise<Profile> {
    const current = await this.getProfile();
    const updated: Profile = {
      ...current,
      id: `user-${Date.now()}`,
      display_name: displayName.trim() || 'Plate Pal Adventurer',
      email: email?.trim() || `${displayName.toLowerCase().replace(/\s+/g, '')}@platepal.app`,
      joined_date: 'Oct 2026',
    };
    setStored(STORAGE_KEYS.PROFILE, updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('plate_pal_profile_update', { detail: updated }));
    }
    return updated;
  },

  async logout(): Promise<void> {
    if (this.isLive()) {
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    }
    setStored(STORAGE_KEYS.PROFILE, INITIAL_PROFILE);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('plate_pal_profile_update', { detail: INITIAL_PROFILE }));
    }
  },
};
