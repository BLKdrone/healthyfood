'use server';

import { GoogleGenAI, Type, Schema } from '@google/genai';

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

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    dishName: { type: Type.STRING },
    portionScore: { type: Type.NUMBER, description: 'Score out of 10' },
    calories: { type: Type.NUMBER },
    sodium_mg: { type: Type.NUMBER },
    carbs_g: { type: Type.NUMBER },
    protein_g: { type: Type.NUMBER },
    zones: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          category: {
            type: Type.STRING,
            enum: ['veggies', 'protein', 'carbs'],
          },
          targetRatio: { type: Type.NUMBER },
          actualRatio: { type: Type.NUMBER },
          status: {
            type: Type.STRING,
            enum: ['optimal', 'increase', 'decrease'],
          },
          color: { type: Type.STRING, enum: ['mint', 'peach', 'butter'] },
          bubbleMessage: { type: Type.STRING },
          boxCoords: {
            type: Type.OBJECT,
            properties: {
              top: { type: Type.NUMBER, description: 'percentage from top 0-100' },
              left: { type: Type.NUMBER, description: 'percentage from left 0-100' },
              width: { type: Type.NUMBER },
              height: { type: Type.NUMBER },
            },
            required: ['top', 'left', 'width', 'height'],
          },
        },
        required: [
          'id',
          'name',
          'category',
          'targetRatio',
          'actualRatio',
          'status',
          'color',
          'bubbleMessage',
          'boxCoords',
        ],
      },
    },
    friendlyFeedback: { type: Type.STRING },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    'dishName',
    'portionScore',
    'calories',
    'sodium_mg',
    'carbs_g',
    'protein_g',
    'zones',
    'friendlyFeedback',
    'recommendations',
  ],
};

const FALLBACK_MOCK_RESULT: MealAnalysisResult = {
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

/**
 * Swappable Meal Analysis Function.
 * Uses real Gemini API if GEMINI_API_KEY is configured, else falls back to mock logic.
 */
export async function analyzeMeal(
  imageSource: string | File
): Promise<MealAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || typeof imageSource !== 'string' || !imageSource.startsWith('data:')) {
    // Realistic processing delay for smooth UI transition
    await new Promise((resolve) => setTimeout(resolve, 800));
    return FALLBACK_MOCK_RESULT;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const [mimePrefix, base64Data] = imageSource.split(',');
    const mimeType = mimePrefix.match(/:(.*?);/)?.[1] || 'image/jpeg';

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: 'Analyze this meal. Identify the food, estimate calories, macros, sodium. Identify bounding boxes for vegetables, protein, and carbs and provide percentages from 0-100 for top, left, width, and height. Give it a portion score (0-10) and friendly feedback.',
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    let responseText = response.text || '';
    // Gemini sometimes wraps JSON in markdown blocks even with responseMimeType set
    responseText = responseText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    return JSON.parse(responseText) as MealAnalysisResult;
  } catch (error: any) {
    // Check if the error object has a concise message, otherwise log a generic one
    // We avoid logging the whole `error` object here because it contains the giant base64 image string!
    console.error('Gemini API Error:', error?.message?.substring(0, 300) || 'Unknown error occurred.');
    console.warn('Falling back to mock meal analysis due to API error.');
    return FALLBACK_MOCK_RESULT;
  }
}
