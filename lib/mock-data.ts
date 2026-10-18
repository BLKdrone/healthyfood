export interface FoodComponent {
  id: string;
  name: string;
  category: 'veggies' | 'protein' | 'carbs';
  confidence: 'high' | 'medium' | 'low';
  alternatives?: string[];
  isUserEdited?: boolean;
  userConfirmedName?: string;
  // Estimated share of plate (0-100%) or grams
  detectedRatio: number;
  // Magic Plate recommended portion intake percentage (0-100%, e.g., 50% for high carb)
  recommendedIntakePercent: number;
  // User confirmed percentage actually eaten (0-100%)
  actualIntakePercent?: number;
  // Component nutrient breakdown at 100% of detected portion
  calories: number;
  sodium_mg: number;
  carbs_g: number;
  protein_g: number;
}

export interface Meal {
  id: string;
  title: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  image_url: string;
  portion_score: number;
  calories: number;
  sodium_mg: number;
  carbs_g: number;
  protein_g: number;
  friendly_note: string;
  logged_at: string;
  time_label: string;
  // Intake tracking & verification fields
  status?: 'pending_intake' | 'intake_confirmed';
  intake_confirmed_at?: string;
  reminder_scheduled_at?: string;
  components?: FoodComponent[];
  // Original AI estimated values before user intake recording
  estimated_calories?: number;
  estimated_sodium_mg?: number;
  estimated_carbs_g?: number;
  estimated_protein_g?: number;
}

export interface DailyTargets {
  calorie_target: number;
  sodium_limit_mg: number;
  carbs_limit_g: number;
  protein_target_g: number;
  water_target_ml: number;
}

export interface Badge {
  id: string;
  title: string;
  icon: string;
  description: string;
  unlocked: boolean;
  date_unlocked?: string;
  category: 'streak' | 'nutrition' | 'camera' | 'level';
}

export type MascotExpression = 'happy' | 'thinking' | 'celebrating' | 'chewing' | 'doctor';

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  avatar_mascot?: MascotExpression;
  streak_count: number;
  best_streak: number;
  streak_freezes: number;
  xp: number;
  level: number;
  level_name: string;
  league: 'Bronze' | 'Silver' | 'Gold' | 'Emerald' | 'Diamond';
  joined_date: string;
  badges: Badge[];
}

export interface Goal {
  id: string;
  goal_key: string;
  label: string;
  description: string;
  is_active: boolean;
  tag: string;
}

export interface NextMealOption {
  id: string;
  title: string;
  tag: string;
  badge_color: 'mint' | 'peach' | 'butter' | 'softblue';
  description: string;
  image_url: string;
  calories: number;
  sodium_mg: number;
  carbs_g: number;
  protein_g: number;
  fiber_g: number;
  why_this_meal: string;
  prep_time: string;
  highlights: string[];
}

export interface RxSuggestion {
  id: string;
  title: string;
  calories: number;
  sodium_mg: number;
  protein_g: number;
  carbs_g: number;
  tags: string[];
  image_url: string;
  dietitian_note: string;
}

export const DEFAULT_BADGES: Badge[] = [
  {
    id: 'badge-1',
    title: '5-Day Streak Flame',
    icon: '🔥',
    description: 'Logged meals for 5 consecutive days',
    unlocked: true,
    date_unlocked: '2026-10-12',
    category: 'streak',
  },
  {
    id: 'badge-2',
    title: 'Veggie Royalty',
    icon: '🥦',
    description: 'Filled half your plate with greens on 5 meals',
    unlocked: true,
    date_unlocked: '2026-10-10',
    category: 'nutrition',
  },
  {
    id: 'badge-3',
    title: 'Magic Scanner',
    icon: '📸',
    description: 'Analyzed food portions using the AI camera',
    unlocked: true,
    date_unlocked: '2026-10-08',
    category: 'camera',
  },
  {
    id: 'badge-4',
    title: 'Salt Tamer',
    icon: '🧂',
    description: 'Stayed under doctor sodium limit 3 days in a row',
    unlocked: false,
    category: 'nutrition',
  },
  {
    id: 'badge-5',
    title: 'Wildfire (14-Day)',
    icon: '⚡',
    description: 'Reach a 14-day eating balance streak',
    unlocked: false,
    category: 'streak',
  },
  {
    id: 'badge-6',
    title: 'Portion Champion',
    icon: '🏆',
    description: 'Achieve Diamond League status with 1,000+ XP',
    unlocked: false,
    category: 'level',
  },
];

export const INITIAL_PROFILE: Profile = {
  id: 'demo-user-123',
  email: 'alex@platepal.app',
  display_name: 'Alex Morgan',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  avatar_mascot: 'happy',
  streak_count: 5,
  best_streak: 12,
  streak_freezes: 1,
  xp: 480,
  level: 3,
  level_name: 'Portion Pro',
  league: 'Gold',
  joined_date: 'Oct 2026',
  badges: DEFAULT_BADGES,
};

export const DEMO_PROFILES: Profile[] = [
  INITIAL_PROFILE,
  {
    id: 'demo-user-456',
    email: 'sam.taylor@platepal.app',
    display_name: 'Sam Taylor',
    avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    avatar_mascot: 'celebrating',
    streak_count: 9,
    best_streak: 15,
    streak_freezes: 2,
    xp: 790,
    level: 4,
    level_name: 'Plate Master',
    league: 'Emerald',
    joined_date: 'Sep 2026',
    badges: DEFAULT_BADGES.map((b) => (b.id === 'badge-4' ? { ...b, unlocked: true } : b)),
  },
  {
    id: 'demo-user-789',
    email: 'jordan.lee@platepal.app',
    display_name: 'Jordan Lee',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    avatar_mascot: 'chewing',
    streak_count: 2,
    best_streak: 4,
    streak_freezes: 0,
    xp: 180,
    level: 2,
    level_name: 'Healthy Explorer',
    league: 'Silver',
    joined_date: 'Oct 2026',
    badges: DEFAULT_BADGES.slice(0, 2),
  },
];

export const INITIAL_DAILY_TARGETS: DailyTargets = {
  calorie_target: 2000,
  sodium_limit_mg: 1800,
  carbs_limit_g: 175,
  protein_target_g: 90,
  water_target_ml: 2000,
};

export const INITIAL_GOALS: Goal[] = [
  {
    id: 'g-1',
    goal_key: 'lower_sodium',
    label: 'Lower sodium',
    description: 'Keep daily sodium strictly under 1,800mg to support cardiovascular health.',
    is_active: true,
    tag: 'Heart Care',
  },
  {
    id: 'g-2',
    goal_key: 'control_blood_sugar',
    label: 'Control blood sugar',
    description: 'Pair carbs with lean protein and fiber to smooth glucose curves.',
    is_active: true,
    tag: 'Metabolism',
  },
  {
    id: 'g-3',
    goal_key: 'maintain_weight',
    label: 'Maintain weight',
    description: 'Plate rule: 50% fiber veggies, 25% protein, 25% complex carbs.',
    is_active: true,
    tag: 'Balance',
  },
  {
    id: 'g-4',
    goal_key: 'increase_fiber',
    label: 'Boost dietary fiber',
    description: 'Aim for 30g+ daily from leafy greens, berries, legumes, and seeds.',
    is_active: false,
    tag: 'Gut Health',
  },
];

function getRelativeISO(daysOffset: number, hours: number, minutes: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function getPastMinutesISO(minutesAgo: number): string {
  const d = new Date();
  d.setTime(d.getTime() - minutesAgo * 60 * 1000);
  return d.toISOString();
}

export const INITIAL_MEALS: Meal[] = [
  // Today's earlier meals
  {
    id: 'm-1',
    title: 'Avocado Toast & Poached Egg Bowl',
    meal_type: 'breakfast',
    image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=80',
    portion_score: 9.6,
    calories: 410,
    sodium_mg: 320,
    carbs_g: 38,
    protein_g: 18,
    friendly_note: 'Terrific portioning! Healthy monounsaturated fats paired with whole sourdough.',
    logged_at: getRelativeISO(0, 8, 15),
    time_label: '8:15 AM',
    status: 'intake_confirmed',
    intake_confirmed_at: getRelativeISO(0, 8, 45),
    estimated_calories: 410,
    estimated_sodium_mg: 320,
    estimated_carbs_g: 38,
    estimated_protein_g: 18,
    components: [
      {
        id: 'c-1-1',
        name: 'Whole Grain Sourdough',
        category: 'carbs',
        confidence: 'high',
        detectedRatio: 30,
        recommendedIntakePercent: 100,
        actualIntakePercent: 100,
        calories: 160,
        sodium_mg: 180,
        carbs_g: 30,
        protein_g: 5,
      },
      {
        id: 'c-1-2',
        name: 'Poached Eggs (2 pcs)',
        category: 'protein',
        confidence: 'high',
        detectedRatio: 25,
        recommendedIntakePercent: 100,
        actualIntakePercent: 100,
        calories: 140,
        sodium_mg: 120,
        carbs_g: 1,
        protein_g: 12,
      },
      {
        id: 'c-1-3',
        name: 'Fresh Avocado & Greens',
        category: 'veggies',
        confidence: 'high',
        detectedRatio: 45,
        recommendedIntakePercent: 100,
        actualIntakePercent: 100,
        calories: 110,
        sodium_mg: 20,
        carbs_g: 7,
        protein_g: 1,
      },
    ],
  },
  {
    id: 'm-2',
    title: 'Mediterranean Herb Chicken & Greens',
    meal_type: 'lunch',
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
    portion_score: 9.1,
    calories: 620,
    sodium_mg: 580,
    carbs_g: 62,
    protein_g: 38,
    friendly_note: 'Great 50% vegetable ratio! Sodium was well within our midday budget.',
    logged_at: getPastMinutesISO(35), // logged 35 minutes ago to demonstrate 30-min intake reminder!
    time_label: '12:45 PM',
    status: 'pending_intake',
    reminder_scheduled_at: getPastMinutesISO(35),
    estimated_calories: 620,
    estimated_sodium_mg: 580,
    estimated_carbs_g: 62,
    estimated_protein_g: 38,
    components: [
      {
        id: 'c-2-1',
        name: 'Herb Grilled Chicken Breast',
        category: 'protein',
        confidence: 'high',
        alternatives: ['Herb Grilled Chicken Breast', 'Crispy Tofu Steak', 'Roast Turkey Cutlet'],
        detectedRatio: 25,
        recommendedIntakePercent: 100,
        calories: 220,
        sodium_mg: 240,
        carbs_g: 2,
        protein_g: 32,
      },
      {
        id: 'c-2-2',
        name: 'Mediterranean Garden Salad',
        category: 'veggies',
        confidence: 'high',
        detectedRatio: 50,
        recommendedIntakePercent: 100,
        calories: 120,
        sodium_mg: 80,
        carbs_g: 15,
        protein_g: 3,
      },
      {
        id: 'c-2-3',
        name: 'Herbed Rice & Chickpeas',
        category: 'carbs',
        confidence: 'medium', // Demonstrates alternative selection
        alternatives: ['Herbed Rice & Chickpeas', 'Whole Grain Quinoa', 'Steamed Brown Rice', 'Roast Potatoes'],
        detectedRatio: 25,
        recommendedIntakePercent: 75, // Magic Plate recommended eating 3/4
        calories: 280,
        sodium_mg: 260,
        carbs_g: 45,
        protein_g: 3,
      },
    ],
  },
  {
    id: 'm-3',
    title: 'Greek Yogurt, Blueberries & Walnuts',
    meal_type: 'snack',
    image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&auto=format&fit=crop&q=80',
    portion_score: 9.8,
    calories: 210,
    sodium_mg: 75,
    carbs_g: 18,
    protein_g: 14,
    friendly_note: 'Smart low-sodium pick! Antioxidants and protein keep hunger calm.',
    logged_at: getRelativeISO(0, 15, 40),
    time_label: '3:40 PM',
    status: 'intake_confirmed',
    intake_confirmed_at: getRelativeISO(0, 15, 50),
    estimated_calories: 210,
    estimated_sodium_mg: 75,
    estimated_carbs_g: 18,
    estimated_protein_g: 14,
    components: [
      {
        id: 'c-3-1',
        name: 'Plain Greek Yogurt',
        category: 'protein',
        confidence: 'high',
        detectedRatio: 50,
        recommendedIntakePercent: 100,
        actualIntakePercent: 100,
        calories: 130,
        sodium_mg: 65,
        carbs_g: 6,
        protein_g: 13,
      },
      {
        id: 'c-3-2',
        name: 'Fresh Blueberries & Walnuts',
        category: 'veggies',
        confidence: 'high',
        detectedRatio: 50,
        recommendedIntakePercent: 100,
        actualIntakePercent: 100,
        calories: 80,
        sodium_mg: 10,
        carbs_g: 12,
        protein_g: 1,
      },
    ],
  },

  // Yesterday's meals
  {
    id: 'm-y1',
    title: 'Overnight Rolled Oats with Chia & Berries',
    meal_type: 'breakfast',
    image_url: 'https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=500&auto=format&fit=crop&q=80',
    portion_score: 9.7,
    calories: 360,
    sodium_mg: 90,
    carbs_g: 52,
    protein_g: 16,
    friendly_note: 'High fiber start that stabilized glucose and supported gut health.',
    logged_at: getRelativeISO(-1, 8, 0),
    time_label: '8:00 AM',
  },
  {
    id: 'm-y2',
    title: 'Warm Quinoa, Roasted Veggie & Tahini Bowl',
    meal_type: 'lunch',
    image_url: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=500&auto=format&fit=crop&q=80',
    portion_score: 9.3,
    calories: 540,
    sodium_mg: 410,
    carbs_g: 65,
    protein_g: 22,
    friendly_note: 'Balanced plant protein and vibrant roasted veggies.',
    logged_at: getRelativeISO(-1, 12, 30),
    time_label: '12:30 PM',
  },
  {
    id: 'm-y3',
    title: 'Steamed Lemon Cod with Roasted Zucchini',
    meal_type: 'dinner',
    image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500&auto=format&fit=crop&q=80',
    portion_score: 9.9,
    calories: 440,
    sodium_mg: 210,
    carbs_g: 24,
    protein_g: 36,
    friendly_note: 'Doctor Rx low-sodium triumph! Well within daily parameters.',
    logged_at: getRelativeISO(-1, 19, 0),
    time_label: '7:00 PM',
  },

  // 2 days ago
  {
    id: 'm-2d1',
    title: 'Spinach & Mushroom Egg White Scramble',
    meal_type: 'breakfast',
    image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=80',
    portion_score: 9.5,
    calories: 320,
    sodium_mg: 280,
    carbs_g: 18,
    protein_g: 28,
    friendly_note: 'Lean protein powerhouse to fuel active morning.',
    logged_at: getRelativeISO(-2, 8, 30),
    time_label: '8:30 AM',
  },
  {
    id: 'm-2d2',
    title: 'Grilled Salmon with Mixed Leaf Garden Salad',
    meal_type: 'lunch',
    image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&auto=format&fit=crop&q=80',
    portion_score: 9.4,
    calories: 590,
    sodium_mg: 460,
    carbs_g: 22,
    protein_g: 44,
    friendly_note: 'Terrific omega-3 rich lunch with crisp greens.',
    logged_at: getRelativeISO(-2, 13, 0),
    time_label: '1:00 PM',
  },
];

export const RX_SUGGESTIONS: RxSuggestion[] = [
  {
    id: 'rx-1',
    title: 'Citrus Glazed Wild Salmon & Asparagus',
    calories: 460,
    sodium_mg: 240,
    protein_g: 39,
    carbs_g: 18,
    tags: ['Low Sodium', 'High Omega-3'],
    image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&auto=format&fit=crop&q=80',
    dietitian_note: 'Prescribed for heart rate variability and blood pressure stability.',
  },
  {
    id: 'rx-2',
    title: 'Crispy Lemon Tofu & Edamame Bowl',
    calories: 420,
    sodium_mg: 290,
    protein_g: 28,
    carbs_g: 32,
    tags: ['Plant Protein', 'Low GI'],
    image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=80',
    dietitian_note: 'High plant fiber slows digestion and keeps post-meal glucose steady.',
  },
  {
    id: 'rx-3',
    title: 'Herb-Roasted Turkey & Sweet Potato Mash',
    calories: 480,
    sodium_mg: 310,
    protein_g: 42,
    carbs_g: 36,
    tags: ['Lean Protein', 'Potassium Rich'],
    image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=80',
    dietitian_note: 'Naturally high in potassium to gently balance electrolytes.',
  },
];

export const NEXT_MEAL_OPTIONS: NextMealOption[] = [
  {
    id: 'opt-low-sodium',
    title: 'Steamed Lemon Cod with Roasted Zucchini & Quinoa',
    tag: 'Low Sodium Recovery',
    badge_color: 'mint',
    description: 'Delicate Atlantic cod seasoned with fresh dill, cracked black pepper, and lemon zest on zucchini ribbons.',
    image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500&auto=format&fit=crop&q=80',
    calories: 440,
    sodium_mg: 210,
    carbs_g: 24,
    protein_g: 36,
    fiber_g: 8,
    why_this_meal:
      'Because lunch included 580mg of sodium, this dinner provides 36g of restorative lean protein while staying under 220mg of sodium, safeguarding your 1,800mg daily doctor limit.',
    prep_time: '20 mins',
    highlights: ['Doctor Rx Match', 'Ultra-low sodium (<220mg)', 'Rich in EPA/DHA'],
  },
  {
    id: 'opt-high-protein',
    title: 'Herb-Crusted Chicken Breast with Sautéed Broccolini',
    tag: 'High Protein Boost',
    badge_color: 'peach',
    description: 'Juicy skillet chicken breast with rosemary, olive oil drizzle, and tender blistered broccolini.',
    image_url: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=500&auto=format&fit=crop&q=80',
    calories: 460,
    sodium_mg: 340,
    carbs_g: 16,
    protein_g: 44,
    fiber_g: 6,
    why_this_meal:
      'Leaves 14g of carbs unspent while pumping 44g of clean protein, closing your daily protein gap without triggering any late-evening blood glucose spikes.',
    prep_time: '25 mins',
    highlights: ['44g Pure Protein', 'Low Carbohydrate (<20g)', 'Long-lasting Satiety'],
  },
  {
    id: 'opt-high-fiber',
    title: 'Warm Spiced Chickpea & Cauliflower Rainbow Bowl',
    tag: 'High Fiber Balance',
    badge_color: 'butter',
    description: 'Turmeric-roasted cauliflower florets, spiced chickpeas, baby spinach, and sesame lemon tahini sauce.',
    image_url: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=500&auto=format&fit=crop&q=80',
    calories: 470,
    sodium_mg: 290,
    carbs_g: 32,
    protein_g: 19,
    fiber_g: 13,
    why_this_meal:
      'Packed with 13g of prebiotic soluble fiber that supports gut microbiome diversity and ensures deep, uninterrupted overnight recovery.',
    prep_time: '15 mins',
    highlights: ['13g Prebiotic Fiber', '100% Plant-powered', 'Natural anti-inflammatory'],
  },
];
