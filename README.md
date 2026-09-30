# 🥗 Plate Pal — Cute AI Portion-Control & Healthy Eating Companion

Plate Pal is a responsive, joyful web application built with **Next.js (App Router, React 19, TypeScript)** and **Tailwind CSS**. It is designed with a cute, tactile, hand-drawn pastel aesthetic to help users develop healthy eating habits, follow physician-prescribed dietary targets (such as sodium and sugar limits), and receive smart portion recommendations with an interactive camera scanner.

---

## ✨ Features & Screens

1. **Home Dashboard (`/`)**:
   - **Pal the Mascot**: Cheerful animated plate with dynamic greetings and facial expressions.
   - **Calorie Progress Ring**: Circular SVG progress gauge displaying consumed vs target energy balance.
   - **Dynamic Nutrient Mini-Bars**: Sodium, Carbohydrates/Sugars, and Protein with automatic green/yellow/red status indicators.
   - **"How You've Eaten So Far" Timeline**: Meal cards featuring dish thumbnail, ⭐ portion score, and encouraging feedback.
   - **Streak & Level Chip Dialog**: Interactive celebration modal triggered by streak and level pills with confetti.
   - **Daily Tip Card**: Gentle plate wisdom and hydration tracking (glasses of water).

2. **Doctor's Food Prescription (`/prescription`)**:
   - **Doctor Avatar Card**: Dr. Evelyn Reed, MD (Cardiometabolic Specialist) with clinic note and prescription status.
   - **Interactive Goal Chips**: Toggleable health directives (*Lower sodium*, *Control blood sugar*, *Maintain weight*, *Boost dietary fiber*).
   - **Daily Target Cards with Progress**: Live sodium cap (<1,800mg), added sugar (<25g), veggie servings (5 portions), and hydration.
   - **Clinical Protocol Checklist**: Interactive checklist for daily portion compliance.
   - **Dietitian Prescribed Meal Suggestions**: Recipe carousel tailored to the user's specific health goals.

3. **Magic Plate Camera (`/camera`)**:
   - **WebRTC Live Camera Feed**: Directly accesses the rear camera on mobile devices via `getUserMedia`.
   - **Desktop Phone Frame**: On wide screens (>1024px), the scanner is centered in an elegant smartphone frame.
   - **Overlay Colored Zones with Dotted Outlines**: Animated dashed bounding zones for Vegetables (50%), Lean Protein (25%), and Complex Carbs (25%).
   - **Floating Speech Bubbles**:
     - *"Eat more vegetables 🥦 (Aim for 50% of your plate)"*
     - *"Keep this portion 🍳 (Spot-on palm size)"*
     - *"Eat ¾ of rice 🍚 (Slightly generous portion)"*
   - **Swappable AI Engine (`analyzeMeal()`)**: Clean modular design in `lib/ai/meal-analyzer.ts`, ready for real Gemini Vision API integration.
   - **Upload & Preset Fallback**: One-click meal presets (Salmon Bowl, Egg Toast, Chickpea Salad) and drag-and-drop file upload for devices without cameras.
   - **"Log This Meal"**: Instant portion score calculation, confetti burst, and timeline update.

4. **Next Meal Recommendation (`/next-meal`)**:
   - **Dynamic Remaining Needs**: Live dynamic bars for Calories, Sodium, Carbs, and Protein that recalculate in real-time when switching between meal options.
   - **3 Recommendation Option Cards**:
     1. *Low Sodium Recovery* (e.g. Steamed Lemon Cod with Roasted Zucchini & Quinoa)
     2. *High Protein Boost* (e.g. Herb-Crusted Skillet Chicken with Sautéed Broccolini)
     3. *High Fiber Balance* (e.g. Warm Spiced Chickpea & Cauliflower Rainbow Bowl)
   - **"Why This Meal?" Section**: Detailed nutritional rationale explaining how the dish balances the user's earlier meals and respects the doctor's prescription.
   - **CTA "Choose This Meal"**: Confetti celebration and automatic addition to the daily plan.

5. **Authentication & Supabase Settings (`/login`)**:
   - Clean email authentication with session profile display.
   - **Graceful Fallback**: If Supabase credentials are missing, shows a friendly banner explaining that Plate Pal is running in **Local Demo Mode**, with a one-click **"Continue as Guest Demo"** button.

---

## 📱 Responsive Layout Behavior

- **Mobile (< 640px)**: Full-width single column, fixed bottom tab bar with an elevated center Camera button, iOS safe-area inset support (`pb-safe`).
- **Tablet (640px – 1024px)**: Centered container (`max-w-2xl mx-auto`), 2-column card grids, bottom tab bar retained.
- **Desktop (> 1024px)**: Left sidebar navigation replaces the bottom bar; main content expands to `max-w-5xl` with multi-column grids (e.g. Daily Balance ring beside the Meal Timeline, 3-in-a-row Next Meal cards). Magic Plate Camera is centered in a smartphone frame mockup.
- Tested and verified at **375px**, **768px**, and **1440px** widths without horizontal scrolling.

---

## 🛠️ Tech Stack & Architecture

- **Next.js 15+** (App Router, Turbopack, React 19)
- **TypeScript** for end-to-end type safety
- **Tailwind CSS v4** with custom pastel tokens and fluid typography (`clamp()`)
- **Nunito** font via `next/font/google` for a soft, friendly look
- **Framer Motion** for bouncy spring buttons and transitions
- **Canvas-Confetti** for celebratory milestones
- **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`) with full Row-Level Security (RLS) policies
- **Hybrid Data Layer (`lib/data-layer.ts`)**: Automatically connects to Supabase when environment variables are supplied, and falls back to interactive in-memory / `localStorage` mock data when offline.

---

## 🚀 Setup & Getting Started (Using pnpm)

This project strictly uses **`pnpm`** as its package manager. Do not use `npm` or `yarn`.

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase credentials in `.env.local` (or leave them empty to run in Demo Mode):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Initialize Supabase Database
Run the provided SQL script in the Supabase SQL Editor:
- File location: `supabase/schema.sql`
- Creates tables: `profiles`, `goals`, `daily_targets`, `meals`, `user_points`, `partners`, `offers`, `rewards`
- Enables Row Level Security (RLS) on all tables with user-isolated access policies and seeds default partner perks.

### 4. Run the Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

### 5. Build for Production
```bash
pnpm build
pnpm start
```

---

## 🎨 Design System Guide

- **Mint Green** (`#A7F3D0` / `#10B981`): Balanced health, safe ranges, 50% vegetable target.
- **Peach / Coral** (`#FED7AA` / `#FB923C`): Lean proteins, streaks, warm calls-to-action.
- **Butter Yellow** (`#FEF08A` / `#FACC15`): Complex grains, daily tips, caution indicators.
- **Soft Sky Blue** (`#BAE6FD` / `#38BDF8`): Hydration, camera targeting guides, protein benchmarks.
- **Warm Canvas** (`#FFFDF9`): Soft off-white backdrop replacing harsh glare.
- **Geometry**: Cards feature `rounded-[24px]` (24px radius), 2px soft borders, and 44px+ minimum tap targets.

---

## 📄 License
MIT — Built with care for healthy and joyful eating habits!
