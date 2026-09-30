-- ==============================================================================
-- Plate Pal: Healthy Eating Companion Database Schema
-- Supabase Postgres Migration with Row-Level Security (RLS)
-- ==============================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT DEFAULT 'Plate Pal Friend',
  avatar_url TEXT,
  streak_count INT NOT NULL DEFAULT 5,
  level INT NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. GOALS TABLE (e.g. Lower sodium, Control blood sugar, Maintain weight)
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. DAILY TARGETS TABLE
CREATE TABLE IF NOT EXISTS public.daily_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_date DATE NOT NULL DEFAULT CURRENT_DATE,
  calorie_target INT NOT NULL DEFAULT 2000,
  sodium_limit_mg INT NOT NULL DEFAULT 1800,
  carbs_limit_g INT NOT NULL DEFAULT 175,
  protein_target_g INT NOT NULL DEFAULT 90,
  water_target_ml INT NOT NULL DEFAULT 2000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_date)
);

-- 4. MEALS TABLE
CREATE TABLE IF NOT EXISTS public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  image_url TEXT,
  portion_score NUMERIC(3,1) NOT NULL DEFAULT 9.0 CHECK (portion_score >= 0 AND portion_score <= 10),
  calories INT NOT NULL DEFAULT 0,
  sodium_mg INT NOT NULL DEFAULT 0,
  carbs_g INT NOT NULL DEFAULT 0,
  protein_g INT NOT NULL DEFAULT 0,
  friendly_note TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. USER POINTS TABLE
CREATE TABLE IF NOT EXISTS public.user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  points_balance INT NOT NULL DEFAULT 350,
  total_earned INT NOT NULL DEFAULT 850,
  tier TEXT NOT NULL DEFAULT 'Portion Pro',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. PARTNERS TABLE (Ecosystem partners)
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. OFFERS TABLE
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  points_cost INT NOT NULL DEFAULT 150,
  discount_code TEXT,
  badge_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. REWARDS TABLE (User claimed offers)
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired'))
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- Profiles: users only see and update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Goals: users only see and manage their own goals
CREATE POLICY "Users can view own goals"
  ON public.goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON public.goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON public.goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON public.goals FOR DELETE
  USING (auth.uid() = user_id);

-- Daily targets: users only see and manage their targets
CREATE POLICY "Users can view own daily targets"
  ON public.daily_targets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily targets"
  ON public.daily_targets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily targets"
  ON public.daily_targets FOR UPDATE
  USING (auth.uid() = user_id);

-- Meals: users only see and manage their logged meals
CREATE POLICY "Users can view own meals"
  ON public.meals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meals"
  ON public.meals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meals"
  ON public.meals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meals"
  ON public.meals FOR DELETE
  USING (auth.uid() = user_id);

-- User points: users only see their points
CREATE POLICY "Users can view own points"
  ON public.user_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own points"
  ON public.user_points FOR UPDATE
  USING (auth.uid() = user_id);

-- Partners & Offers: readable by any authenticated user
CREATE POLICY "Anyone can view partners"
  ON public.partners FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view active offers"
  ON public.offers FOR SELECT
  USING (is_active = true);

-- Rewards: users only see and claim their rewards
CREATE POLICY "Users can view own rewards"
  ON public.rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rewards"
  ON public.rewards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', 'Plate Pal Friend'));

  INSERT INTO public.user_points (user_id, points_balance, total_earned)
  VALUES (new.id, 100, 100);

  INSERT INTO public.goals (user_id, goal_key, label, description, is_active)
  VALUES 
    (new.id, 'lower_sodium', 'Lower sodium', 'Keep daily intake under 1,800mg', true),
    (new.id, 'control_blood_sugar', 'Control blood sugar', 'Pair carbs with protein & fiber', true),
    (new.id, 'maintain_weight', 'Maintain weight', 'Fill 50% plate with colorful veggies', true);

  INSERT INTO public.daily_targets (user_id, calorie_target, sodium_limit_mg, carbs_limit_g, protein_target_g)
  VALUES (new.id, 2000, 1800, 175, 90);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- SEED DATA FOR PARTNERS & OFFERS
-- ==============================================================================

INSERT INTO public.partners (id, name, category, description, logo_url, website_url)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Green Leaf Organic Farms', 'farm_fresh', 'Hand-picked organic CSA boxes delivered straight to your door.', '🥬', 'https://example.com/greenleaf'),
  ('22222222-2222-2222-2222-222222222222', 'Sprout Kitchen & Cafe', 'healthy_eats', 'Low-sodium macro-balanced grain bowls and slow cold-pressed juices.', '🥗', 'https://example.com/sprout'),
  ('33333333-3333-3333-3333-333333333333', 'PureCare Telehealth', 'wellness', 'Licensed clinical dietitian consultations & metabolic health checks.', '🩺', 'https://example.com/purecare')
ON CONFLICT DO NOTHING;

INSERT INTO public.offers (id, partner_id, title, description, points_cost, discount_code, badge_text)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '$15 Off Your First Veggie Crate', 'Redeem 200 Pal Points for $15 off locally harvested seasonal organic greens.', 200, 'PALVEGGIE15', 'Popular'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Free Avocado Super-Side at Sprout', 'Claim a complimentary portion-approved heart-healthy side with any bowl.', 150, 'PALAVO', 'Healthy Choice'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'Free 20-min Nutritionist Review', 'Get personalized feedback on your Plate Pal logs from a registered dietitian.', 400, 'PALDIETITIAN', 'Doctor Rx')
ON CONFLICT DO NOTHING;
