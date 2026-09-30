export interface PlateZone {
  id: string;
  name: string;
  category: 'veggies' | 'protein' | 'carbs';
  targetRatio: number; // e.g. 50%
  actualRatio: number; // e.g. 35%
  status: 'optimal' | 'increase' | 'decrease';
  color: 'mint' | 'peach' | 'butter';
  bubbleMessage: string;
  boxCoords: {
    top: number; // percentage from top 0-100
    left: number; // percentage from left 0-100
    width: number;
    height: number;
  };
}

export interface MealAnalysisResult {
  dishName: string;
  portionScore: number;
  calories: number;
  sodium_mg: number;
  carbs_g: number;
  protein_g: number;
  zones: PlateZone[];
  friendlyFeedback: string;
  recommendations: string[];
}

/**
 * Swappable Meal Analysis Function.
 * Currently uses high-fidelity domain logic with deterministic variations.
 * Can be effortlessly swapped with a real multimodal Vision API (e.g. Gemini 1.5 Flash / Omni Vision).
 */
export async function analyzeMeal(
  _imageSource: string | File
): Promise<MealAnalysisResult> {
  // Realistic processing delay for smooth UI transition
  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    dishName: 'Colorful Harvest Plate',
    portionScore: 9.3,
    calories: 510,
    sodium_mg: 380,
    carbs_g: 48,
    protein_g: 34,
    zones: [
      {
        id: 'zone-veggies',
        name: 'Garden Greens & Veggies',
        category: 'veggies',
        targetRatio: 50,
        actualRatio: 45,
        status: 'optimal',
        color: 'mint',
        bubbleMessage: 'Eat more vegetables 🥦 (Aim for 50% of your plate)',
        boxCoords: {
          top: 15,
          left: 12,
          width: 42,
          height: 68,
        },
      },
      {
        id: 'zone-protein',
        name: 'Lean Protein',
        category: 'protein',
        targetRatio: 25,
        actualRatio: 25,
        status: 'optimal',
        color: 'peach',
        bubbleMessage: 'Keep this portion 🍳 (Spot-on palm size)',
        boxCoords: {
          top: 18,
          left: 56,
          width: 36,
          height: 34,
        },
      },
      {
        id: 'zone-carbs',
        name: 'Carbohydrates & Grains',
        category: 'carbs',
        targetRatio: 25,
        actualRatio: 30,
        status: 'decrease',
        color: 'butter',
        bubbleMessage: 'Eat ¾ of rice 🍚 (Slightly generous portion)',
        boxCoords: {
          top: 54,
          left: 56,
          width: 36,
          height: 32,
        },
      },
    ],
    friendlyFeedback:
      'Super balanced plate! Your veggies take up almost half the plate, and protein is right on target. Trimming just 2 tablespoons of rice will keep your glucose completely flat.',
    recommendations: [
      'Fill remaining 5% of plate with leafy greens',
      'Excellent low-sodium preparation',
      'Good fiber balance to cushion digestion',
    ],
  };
}
