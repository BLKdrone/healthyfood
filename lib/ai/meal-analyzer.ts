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
              top: {
                type: Type.NUMBER,
                description: 'Percent from the top edge of the full input image, 0-100',
                minimum: 0,
                maximum: 100,
              },
              left: {
                type: Type.NUMBER,
                description: 'Percent from the left edge of the full input image, 0-100',
                minimum: 0,
                maximum: 100,
              },
              width: {
                type: Type.NUMBER,
                description: 'Bounding-box width as a percent of the full input image, 0-100',
                minimum: 0,
                maximum: 100,
              },
              height: {
                type: Type.NUMBER,
                description: 'Bounding-box height as a percent of the full input image, 0-100',
                minimum: 0,
                maximum: 100,
              },
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
                text: 'Analyze the food visible in this meal image and return valid JSON matching the schema. Estimate calories, macros, and sodium. Return at least one zone for the visible food; include a separate zone for each visible vegetable, protein, or carbohydrate region. Never return an empty zones array. For every boxCoords value, use a percentage from 0 to 100 relative to the full input image, not the plate or screen. The origin is the image top-left; top and left locate the box top-left, while width and height are its size. Keep each box within the image boundaries. Give a portion score from 0 to 10 and friendly feedback.',
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
      if (!(error instanceof ApiError) || error.status !== 503) throw error;
      console.warn('Gemini 3.1 Flash-Lite returned 503; retrying with Gemini 3.5 Flash-Lite.');
      return generateContent('gemini-3.5-flash-lite');
    });

    let responseText = response.text || '';
    // Gemini sometimes wraps JSON in markdown blocks even with responseMimeType set
    responseText = responseText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    const result = JSON.parse(responseText) as MealAnalysisResult;
    if (!Array.isArray(result.zones) || result.zones.length === 0) {
      throw new Error('Gemini returned no plate zones. Please try another meal image.');
    }
    return result;
  } catch (error: unknown) {
    // Avoid logging the whole error object because it may contain the image payload.
    const message = error instanceof Error ? error.message.slice(0, 300) : 'Unknown error occurred.';
    console.error('Gemini API Error:', message);
    throw new Error(`Gemini meal analysis failed: ${message}`);
  }
}
