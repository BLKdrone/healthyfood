'use server';

import { ApiError, GoogleGenAI, Type, Schema } from '@google/genai';

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
  // Outline of the food region as 5-8 points (percent of the full image, 0-100).
  polygon: { x: number; y: number }[];
  // AI Verification & Nutrition Attributes
  confidence?: 'high' | 'medium' | 'low';
  alternatives?: string[];
  estimatedGrams?: number;
  calories?: number;
  sodium_mg?: number;
  carbs_g?: number;
  protein_g?: number;
  isUserEdited?: boolean;
  userConfirmedName?: string;
}

// Bounding box of the bowl/plate itself, in percent of the full image (0-100).
export interface PlateArea {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface MealAnalysisResult {
  plate?: PlateArea;
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
    plate: {
      type: Type.OBJECT,
      description:
        'Bounding box of the whole bowl or plate that holds the food (its outer rim), on a 0-1000 scale relative to the full input image: 0 is the top/left edge, 1000 the bottom/right edge.',
      properties: {
        ymin: { type: Type.NUMBER, minimum: 0, maximum: 1000 },
        xmin: { type: Type.NUMBER, minimum: 0, maximum: 1000 },
        ymax: { type: Type.NUMBER, minimum: 0, maximum: 1000 },
        xmax: { type: Type.NUMBER, minimum: 0, maximum: 1000 },
      },
      propertyOrdering: ['ymin', 'xmin', 'ymax', 'xmax'],
      required: ['ymin', 'xmin', 'ymax', 'xmax'],
    },
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
          confidence: {
            type: Type.STRING,
            enum: ['high', 'medium', 'low'],
            description: 'AI confidence for this food item identification',
          },
          alternatives: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '2 to 4 selectable food alternatives if uncertain or ambiguous, e.g. Tonkatsu Pork, Tonkatsu Chicken, Fried Fish',
          },
          estimatedGrams: { type: Type.NUMBER, description: 'Estimated portion in grams' },
          calories: { type: Type.NUMBER, description: 'Estimated calories for this component' },
          sodium_mg: { type: Type.NUMBER, description: 'Estimated sodium in mg for this component' },
          carbs_g: { type: Type.NUMBER, description: 'Estimated carbs in g for this component' },
          protein_g: { type: Type.NUMBER, description: 'Estimated protein in g for this component' },
          bubbleMessage: {
            type: Type.STRING,
            description: 'Very short speech-bubble tip, max 28 characters, with one emoji. Example: "Eat more veggies 🥦"',
          },
          polygon: {
            type: Type.ARRAY,
            description:
              'Tight outline of ONLY this food region (not the plate, bowl or background), 6 to 10 points in clockwise order, hugging the real edge of the food with angled corners. Each point is {y, x} on a 0-1000 scale relative to the full input image: y=0 is the top edge, y=1000 the bottom edge, x=0 the left edge, x=1000 the right edge.',
            minItems: '6',
            maxItems: '10',
            items: {
              type: Type.OBJECT,
              properties: {
                y: { type: Type.NUMBER, description: 'Vertical position, 0 (top) to 1000 (bottom)', minimum: 0, maximum: 1000 },
                x: { type: Type.NUMBER, description: 'Horizontal position, 0 (left) to 1000 (right)', minimum: 0, maximum: 1000 },
              },
              propertyOrdering: ['y', 'x'],
              required: ['y', 'x'],
            },
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
          'polygon',
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
    'plate',
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

/**
 * Analyzes a meal with Gemini. Configuration and API errors are surfaced to the caller.
 */
export async function analyzeMeal(
  imageSource: string | File
): Promise<MealAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing. Add it to .env.local and restart the dev server.');
  }
  if (typeof imageSource !== 'string' || !imageSource.startsWith('data:')) {
    throw new Error('Meal image must be provided as a data URL.');
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        retryOptions: { attempts: 1 },
      },
    });
    const [mimePrefix, base64Data] = imageSource.split(',', 2);
    const mimeType = mimePrefix?.match(/:(.*?);/)?.[1] || 'image/jpeg';
    if (!base64Data) throw new Error('Meal image data is empty or invalid.');

    const generateContent = (model: string) =>
      ai.models.generateContent({
        model,
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
                text: 'Analyze the food visible in this meal image and return valid JSON matching the schema. Estimate total dish and per-zone calories, macros (carbs_g, protein_g), and sodium_mg. Return at least one zone for the visible food; include a separate zone for each visible vegetable, protein, or carbohydrate region. Never return an empty zones array. First return plate: the bounding box of the whole bowl or plate (its outer rim) as ymin, xmin, ymax, xmax on a 0-1000 scale. For each zone, return a polygon of 6 to 10 {y, x} points on a 0-1000 scale (y=0 top, y=1000 bottom, x=0 left, x=1000 right, relative to the full input image) that tightly traces only that food, staying on the food and strictly inside the plate or bowl rim, never on the table or background. For each zone set confidence ("high", "medium", or "low"). If confidence is medium or low, or if the food could easily be another dish (e.g. pork vs chicken cutlet, fried fish, tofu), list 2 to 4 likely alternatives. For each zone set actualRatio to the percent of the food on the plate that this zone covers (all zones together should add up to about 100), and targetRatio to the ideal percent for a balanced plate (veggies 50, protein 25, carbs 25). Keep each bubbleMessage under 28 characters. Give a portion score from 0 to 10 and friendly feedback.',
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
        },
      });

    const response = await generateContent('gemini-3.1-flash-lite').catch((error: unknown) => {
      if (!(error instanceof ApiError) || (error as { status?: number }).status !== 503) throw error;
      console.warn('Gemini 3.1 Flash-Lite returned 503; retrying with Gemini 3.5 Flash-Lite.');
      return generateContent('gemini-3.5-flash-lite');
    });

    let responseText = response.text || '';
    // Gemini sometimes wraps JSON in markdown blocks even with responseMimeType set
    responseText = responseText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    const raw = JSON.parse(responseText) as Omit<MealAnalysisResult, 'zones' | 'plate'> & {
      plate?: { ymin: number; xmin: number; ymax: number; xmax: number };
      zones: Array<Omit<PlateZone, 'boxCoords' | 'polygon'> & { polygon?: { x: number; y: number }[] }>;
    };

    const defaultAlternatives: Record<string, string[]> = {
      veggies: ['Steamed Garden Vegetables', 'Crispy Fresh Greens', 'Roasted Zucchini & Carrots', 'Kale & Spinach Medley'],
      protein: ['Herb Grilled Chicken', 'Pan-Seared Salmon', 'Crispy Pork Tonkatsu', 'Golden Fried Fish', 'Glazed Tofu Steak'],
      carbs: ['Steamed Jasmine Rice', 'Whole Grain Brown Rice', 'Roasted Baby Potatoes', 'Quinoa & Barley Bowl'],
    };

    const clamp = (n: number) => Math.min(100, Math.max(0, n));
    const zones: PlateZone[] = (Array.isArray(raw.zones) ? raw.zones : []).flatMap((zone) => {
      // Gemini returns 0-1000 coordinates; convert to percent of the full image.
      const polygon = (zone.polygon ?? [])
        .filter((pt) => Number.isFinite(pt?.x) && Number.isFinite(pt?.y))
        .map((pt) => ({ x: clamp(pt.x / 10), y: clamp(pt.y / 10) }));
      if (polygon.length < 3) return [];

      const xs = polygon.map((pt) => pt.x);
      const ys = polygon.map((pt) => pt.y);
      const left = Math.min(...xs);
      const top = Math.min(...ys);

      const isAmbiguous = /cutlet|fry|fried|katsu|patty|nugget|curry|stew|fillet|pork|beef|fish/i.test(zone.name);
      const confidence: 'high' | 'medium' | 'low' =
        zone.confidence === 'high' || zone.confidence === 'medium' || zone.confidence === 'low'
          ? zone.confidence
          : isAmbiguous
          ? 'medium'
          : 'high';

      const alternatives = (Array.isArray(zone.alternatives) && zone.alternatives.length > 0)
        ? Array.from(new Set([zone.name, ...zone.alternatives]))
        : Array.from(new Set([zone.name, ...(defaultAlternatives[zone.category] || [])]));

      const ratioFrac = (zone.actualRatio || 30) / 100;
      const zCalories = zone.calories && zone.calories > 0 ? zone.calories : Math.round((raw.calories || 500) * ratioFrac);
      const zSodium = zone.sodium_mg && zone.sodium_mg > 0 ? zone.sodium_mg : Math.round((raw.sodium_mg || 400) * ratioFrac);
      const zCarbs = zone.carbs_g !== undefined ? zone.carbs_g : Math.round((raw.carbs_g || 45) * ratioFrac);
      const zProtein = zone.protein_g !== undefined ? zone.protein_g : Math.round((raw.protein_g || 25) * ratioFrac);

      return [
        {
          ...zone,
          confidence,
          alternatives,
          calories: zCalories,
          sodium_mg: zSodium,
          carbs_g: zCarbs,
          protein_g: zProtein,
          estimatedGrams: zone.estimatedGrams || Math.round(ratioFrac * 350),
          polygon,
          boxCoords: { top, left, width: Math.max(...xs) - left, height: Math.max(...ys) - top },
        },
      ];
    });

    if (zones.length === 0) {
      throw new Error('Gemini returned no plate zones. Please try another meal image.');
    }

    let plate: PlateArea | undefined;
    const pl = raw.plate;
    if (pl && [pl.ymin, pl.xmin, pl.ymax, pl.xmax].every(Number.isFinite)) {
      const top = clamp(Math.min(pl.ymin, pl.ymax) / 10);
      const left = clamp(Math.min(pl.xmin, pl.xmax) / 10);
      const bottom = clamp(Math.max(pl.ymin, pl.ymax) / 10);
      const right = clamp(Math.max(pl.xmin, pl.xmax) / 10);
      if (bottom - top > 5 && right - left > 5) {
        plate = { top, left, width: right - left, height: bottom - top };
      }
    }

    return { ...raw, plate, zones };
  } catch (error: unknown) {
    // Avoid logging the whole error object because it may contain the image payload.
    const message = error instanceof Error ? error.message.slice(0, 300) : 'Unknown error occurred.';
    console.error('Gemini API Error:', message);
    throw new Error(`Gemini meal analysis failed: ${message}`);
  }
}