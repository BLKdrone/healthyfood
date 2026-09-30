import { isSupabaseConfigured, createClient } from './supabase/client';
import {
  INITIAL_PROFILE,
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
              streak_count: data.streak_count ?? 5,
              level: data.level ?? 3,
              level_name: 'Portion Pro',
            };
          }
        }
      }
    }
    return getStored<Profile>(STORAGE_KEYS.PROFILE, INITIAL_PROFILE);
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

  async logMeal(meal: Omit<Meal, 'id' | 'logged_at' | 'time_label'>): Promise<Meal> {
    const newMeal: Meal = {
      ...meal,
      id: `m-${Date.now()}`,
      logged_at: new Date().toISOString(),
      time_label: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
    return newMeal;
  },

  getRxSuggestions(): RxSuggestion[] {
    return RX_SUGGESTIONS;
  },

  getNextMealOptions(): NextMealOption[] {
    return NEXT_MEAL_OPTIONS;
  },
};
