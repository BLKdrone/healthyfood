'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Mascot } from '@/components/mascot/Mascot';
import { fireConfetti } from '@/components/effects/Confetti';
import { analyzeMeal, type MealAnalysisResult, type PlateArea, type PlateZone } from '@/lib/ai/meal-analyzer';
import { DataLayer } from '@/lib/data-layer';
import { formatDateKey } from '@/components/calendar/MealPlannerCalendar';
import type { Meal, FoodComponent } from '@/lib/mock-data';
import { requestNotificationPermission } from '@/lib/notifications';
import {
  Camera as CameraIcon,
  RefreshCw,
  Upload,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Star,
  Flame,
  ArrowRight,
  Calendar as CalendarIcon,
  Edit3,
  Sliders,
  Check,
  Plus,
  HelpCircle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

const MEAL_TYPES: { id: Meal['meal_type']; label: string; icon: string }[] = [
  { id: 'breakfast', label: 'Breakfast', icon: '🍳' },
  { id: 'lunch', label: 'Lunch', icon: '🥗' },
  { id: 'dinner', label: 'Dinner', icon: '🍽️' },
  { id: 'snack', label: 'Snack', icon: '🍎' },
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getDefaultMealType(): Meal['meal_type'] {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 18) return 'snack';
  return 'dinner';
}

const SAMPLE_DISHES = [
  {
    name: 'Grilled Salmon & Veggie Plate',
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=700&auto=format&fit=crop&q=80',
    type: 'lunch' as const,
  },
  {
    name: 'Avocado Egg Toast Bowl',
    url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=700&auto=format&fit=crop&q=80',
    type: 'breakfast' as const,
  },
  {
    name: 'Warm Chickpea Harvest Salad',
    url: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=700&auto=format&fit=crop&q=80',
    type: 'dinner' as const,
  },
];

const SCANNER_ASPECT_RATIO = 9 / 16;

type Point = { x: number; y: number };

// Map a point (percent of the full image) into the cropped "object-cover" frame.
function mapPointToCoverFrame(
  point: Point,
  sourceAspectRatio: number | null,
  frameAspect: number = SCANNER_ASPECT_RATIO
): Point {
  const imageAspectRatio = sourceAspectRatio ?? frameAspect;
  const visibleWidth = Math.min(1, frameAspect / imageAspectRatio);
  const visibleHeight = Math.min(1, imageAspectRatio / frameAspect);
  const cropLeft = (1 - visibleWidth) / 2;
  const cropTop = (1 - visibleHeight) / 2;
  return {
    x: ((point.x / 100 - cropLeft) / visibleWidth) * 100,
    y: ((point.y / 100 - cropTop) / visibleHeight) * 100,
  };
}

// Used when the AI does not return a polygon: a box with its corners cut off (octagon).
function boxToPolygon(box: { top: number; left: number; width: number; height: number }): Point[] {
  const cut = Math.min(box.width, box.height) * 0.25;
  const l = box.left;
  const t = box.top;
  const r = box.left + box.width;
  const b = box.top + box.height;
  return [
    { x: l + cut, y: t },
    { x: r - cut, y: t },
    { x: r, y: t + cut },
    { x: r, y: b - cut },
    { x: r - cut, y: b },
    { x: l + cut, y: b },
    { x: l, y: b - cut },
    { x: l, y: t + cut },
  ];
}

function isValidPolygon(polygon: unknown): polygon is Point[] {
  return (
    Array.isArray(polygon) &&
    polygon.length >= 3 &&
    polygon.every((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y))
  );
}

// Bowl/plate as an ellipse in screen percentages (slightly inset so outlines stay visible at the rim).
function mapPlateToEllipse(
  plate: PlateArea | undefined,
  sourceAspectRatio: number | null,
  frameAspect: number = SCANNER_ASPECT_RATIO
): { cx: number; cy: number; rx: number; ry: number } | null {
  if (!plate) return null;
  const a = mapPointToCoverFrame({ x: plate.left, y: plate.top }, sourceAspectRatio, frameAspect);
  const b = mapPointToCoverFrame(
    { x: plate.left + plate.width, y: plate.top + plate.height },
    sourceAspectRatio,
    frameAspect
  );
  const inset = 0.94;
  return {
    cx: (a.x + b.x) / 2,
    cy: (a.y + b.y) / 2,
    rx: (Math.abs(b.x - a.x) / 2) * inset,
    ry: (Math.abs(b.y - a.y) / 2) * inset,
  };
}

const FRACTIONS: { value: number; label: string }[] = [
  { value: 1 / 4, label: '¼' },
  { value: 1 / 3, label: '⅓' },
  { value: 1 / 2, label: '½' },
  { value: 2 / 3, label: '⅔' },
  { value: 3 / 4, label: '¾' },
];

const CATEGORY_LABELS: Record<PlateZone['category'], string> = {
  veggies: 'veggies 🥦',
  protein: 'protein 🍗',
  carbs: 'carbs 🍚',
};

// Turns target vs actual share of the plate into a simple fraction tip, e.g. "Eat ½ of the carbs 🍚".
function portionAdvice(zone: PlateZone): string {
  const { targetRatio, actualRatio } = zone;
  if (!Number.isFinite(targetRatio) || !Number.isFinite(actualRatio) || actualRatio <= 0 || targetRatio <= 0) {
    return zone.bubbleMessage;
  }

  const label = CATEGORY_LABELS[zone.category] ?? 'this part';
  const ratio = targetRatio / actualRatio; // <1 = too much on the plate, >1 = too little

  if (ratio >= 0.88 && ratio <= 1.12) return `Perfect portion ✓ ${label}`;

  if (ratio < 1) {
    const nearest = FRACTIONS.reduce((best, f) =>
      Math.abs(f.value - ratio) < Math.abs(best.value - ratio) ? f : best
    );
    return `Eat ${nearest.label} of the ${label}`;
  }

  const extra = ratio - 1; // how much more, as a share of what is already there
  if (extra >= 0.9) return `Double the ${label}`;
  const quarters = Math.min(3, Math.max(1, Math.round(extra * 4)));
  return `Add ${['', '¼', '½', '¾'][quarters]} more ${label}`;
}
// Returns the polygon in screen percentages plus its bubble anchor, or null if it is off-screen.
function mapZoneToCoverFrame(
  zone: PlateZone,
  sourceAspectRatio: number | null,
  frameAspect: number = SCANNER_ASPECT_RATIO
): { points: Point[]; anchorX: number; anchorY: number } | null {
  const source = isValidPolygon(zone.polygon) ? zone.polygon : boxToPolygon(zone.boxCoords);
  const mapped = source.map((p) => mapPointToCoverFrame(p, sourceAspectRatio, frameAspect));

  const xs = mapped.map((p) => p.x);
  const ys = mapped.map((p) => p.y);
  if (Math.max(...xs) <= 0 || Math.min(...xs) >= 100 || Math.max(...ys) <= 0 || Math.min(...ys) >= 100) {
    return null;
  }

  const clamp = (n: number) => Math.min(100, Math.max(0, n));
  const points = mapped.map((p) => ({ x: clamp(p.x), y: clamp(p.y) }));
  const clampedXs = points.map((p) => p.x);
  const clampedYs = points.map((p) => p.y);

  return {
    points,
    anchorX: (Math.min(...clampedXs) + Math.max(...clampedXs)) / 2,
    anchorY: Math.min(...clampedYs),
  };
}

function CameraContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');

  const targetDate = useMemo(() => {
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const [y, m, d] = dateParam.split('-').map(Number);
      const dObj = new Date(y, m - 1, d);
      if (!isNaN(dObj.getTime())) return dObj;
    }
    return new Date();
  }, [dateParam]);

  const isToday = formatDateKey(targetDate) === formatDateKey(new Date());
  const dateBadgeLabel = isToday
    ? 'Today'
    : `${MONTH_NAMES[targetDate.getMonth()]} ${targetDate.getDate()}`;

  const [mealType, setMealType] = useState<Meal['meal_type']>(getDefaultMealType);
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const [frameAspect, setFrameAspect] = useState<number>(SCANNER_ASPECT_RATIO);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCaptured, setIsCaptured] = useState<boolean>(false); // true when selectedImage is a photo taken with the camera
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // Fallback image source (file upload or sample preset)
  const [selectedImage, setSelectedImage] = useState<string | null>(SAMPLE_DISHES[0].url);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<MealAnalysisResult | null>(null);
  const [verifiedZones, setVerifiedZones] = useState<PlateZone[]>([]);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [customFoodInputs, setCustomFoodInputs] = useState<Record<string, string>>({});
  const [isOtherActive, setIsOtherActive] = useState<Record<string, boolean>>({});
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisImageAspectRatio, setAnalysisImageAspectRatio] = useState<number | null>(null);
  const [isLogged, setIsLogged] = useState<boolean>(false);

  // Dynamic recalculation of totals based on user's verified foods and portions
  const calculatedTotals = useMemo(() => {
    if (!verifiedZones || verifiedZones.length === 0) {
      return {
        calories: analysisResult?.calories || 0,
        sodium_mg: analysisResult?.sodium_mg || 0,
        carbs_g: analysisResult?.carbs_g || 0,
        protein_g: analysisResult?.protein_g || 0,
        portionScore: analysisResult?.portionScore || 8.5,
      };
    }
    const calories = Math.round(verifiedZones.reduce((sum, z) => sum + (z.calories || 0), 0));
    const sodium_mg = Math.round(verifiedZones.reduce((sum, z) => sum + (z.sodium_mg || 0), 0));
    const carbs_g = Math.round(verifiedZones.reduce((sum, z) => sum + (z.carbs_g || 0), 0));
    const protein_g = Math.round(verifiedZones.reduce((sum, z) => sum + (z.protein_g || 0), 0));

    // Dynamic Portion Score based on vegetable ratio vs target
    const totalRatio = verifiedZones.reduce((sum, z) => sum + z.actualRatio, 0) || 100;
    const veggieRatio =
      (verifiedZones.filter((z) => z.category === 'veggies').reduce((sum, z) => sum + z.actualRatio, 0) /
        totalRatio) *
      100;
    let portionScore = 7.0;
    if (veggieRatio >= 45 && veggieRatio <= 55) portionScore = 9.8;
    else if (veggieRatio >= 40) portionScore = 9.3;
    else if (veggieRatio >= 30) portionScore = 8.6;
    else if (veggieRatio >= 20) portionScore = 7.9;
    else portionScore = 6.8;

    return {
      calories: Math.max(calories, 1),
      sodium_mg: Math.max(sodium_mg, 1),
      carbs_g: Math.max(carbs_g, 0),
      protein_g: Math.max(protein_g, 0),
      portionScore: Math.round(portionScore * 10) / 10,
    };
  }, [verifiedZones, analysisResult]);

  // Handler for selecting food alternatives
  const handleSelectAlternative = (zoneId: string, newFoodName: string) => {
    setVerifiedZones((prev) =>
      prev.map((z) => {
        if (z.id !== zoneId) return z;
        let calFactor = 1.0;
        let naFactor = 1.0;
        let cFactor = 1.0;
        let pFactor = 1.0;
        const lower = newFoodName.toLowerCase();
        if (lower.includes('chicken') || lower.includes('turkey')) {
          calFactor = 0.88;
          naFactor = 0.82;
          pFactor = 1.15;
        } else if (lower.includes('fish') || lower.includes('salmon')) {
          calFactor = 0.82;
          naFactor = 0.75;
          pFactor = 1.08;
        } else if (lower.includes('tofu') || lower.includes('plant')) {
          calFactor = 0.65;
          naFactor = 0.55;
          pFactor = 0.85;
        } else if (lower.includes('pork') || lower.includes('tonkatsu') || lower.includes('beef')) {
          calFactor = 1.18;
          naFactor = 1.25;
        } else if (lower.includes('brown') || lower.includes('quinoa')) {
          calFactor = 0.94;
          cFactor = 0.88;
        }

        const baseCals = z.calories || 150;
        const baseNa = z.sodium_mg || 120;
        const baseCarbs = z.carbs_g || 15;
        const baseProtein = z.protein_g || 10;

        return {
          ...z,
          name: newFoodName,
          userConfirmedName: newFoodName,
          isUserEdited: true,
          confidence: 'high', // Confirmed by user
          calories: Math.max(1, Math.round(baseCals * calFactor)),
          sodium_mg: Math.max(1, Math.round(baseNa * naFactor)),
          carbs_g: Math.max(0, Math.round(baseCarbs * cFactor)),
          protein_g: Math.max(0, Math.round(baseProtein * pFactor)),
        };
      })
    );
    setIsOtherActive((prev) => ({ ...prev, [zoneId]: false }));
  };

  // Handler for portion editing (no confirmation required by default)
  const handlePortionChange = (zoneId: string, newRatio: number) => {
    setVerifiedZones((prev) =>
      prev.map((z) => {
        if (z.id !== zoneId) return z;
        const oldRatio = z.actualRatio || 1;
        const scale = newRatio / oldRatio;
        return {
          ...z,
          actualRatio: newRatio,
          isUserEdited: true,
          estimatedGrams: Math.round(newRatio * 3.5),
          calories: Math.max(1, Math.round((z.calories || 100) * scale)),
          sodium_mg: Math.max(1, Math.round((z.sodium_mg || 100) * scale)),
          carbs_g: Math.max(0, Math.round((z.carbs_g || 15) * scale)),
          protein_g: Math.max(0, Math.round((z.protein_g || 10) * scale)),
        };
      })
    );
  };

  // Keep the zone/bubble overlay in sync with the real shape of the camera screen.
  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const update = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) setFrameAspect(el.clientWidth / el.clientHeight);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Connect stream to video element whenever stream and isCameraActive change
  useEffect(() => {
    const video = videoRef.current;
    if (isCameraActive && video && stream) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      video.play().catch((err) => {
        console.warn('Video auto-play was prevented:', err);
      });
    }
  }, [stream, isCameraActive]);

  // Initialize camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setAnalysisError(null);
    try {
      if (typeof window !== 'undefined' && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
        if (!window.isSecureContext) {
          throw new Error(
            'Camera access requires a secure connection (HTTPS or http://localhost). Browsers block camera access over plain HTTP on local network IPs.'
          );
        }
        throw new Error('Camera API is not supported or is blocked in this browser.');
      }

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        // Fallback for laptops/webcams where facingMode constraint causes rejection
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsCameraActive(true);
      setIsCaptured(false);
      setSelectedImage(null);
    } catch (err: unknown) {
      console.error('Camera initialization error:', err);
      let errorMsg = 'Could not access camera. Please allow camera permissions or use the upload fallback below.';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMsg = 'Camera permission was denied. Please allow camera access in your browser address bar settings.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMsg = 'No camera device found on this system.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMsg = 'Camera is already in use by another application or tab.';
        } else if (err.message) {
          errorMsg = err.message;
        }
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }
      setCameraError(errorMsg);
      setIsCameraActive(false);
    }
  }, []);

  // Stable function (no dependency on `stream`) so the unmount cleanup below never fires by accident.
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Cleanup stream on unmount only
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  // Freeze the current camera frame into a saved photo, then stop the camera so the user can move freely.
  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError('Camera is still starting. Wait a second for the picture to appear, then tap Capture.');
      return;
    }
    const MAX_SIZE = 1280;
    const ratio = Math.min(1, MAX_SIZE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * ratio);
    canvas.height = Math.round(video.videoHeight * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCameraError('Could not capture the photo. Please try again or use Upload File.');
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    setCameraError(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setIsLogged(false);
    setSelectedImage(dataUrl);
    setIsCaptured(true);
    stopCamera();
  };

  const retakePhoto = () => {
    setIsCaptured(false);
    setSelectedImage(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    startCamera();
  };

  // Handle Scan action
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError(null);
    setAnalysisImageAspectRatio(null);
    try {
      let imagePayload = selectedImage;

      // Helper to scale down images for the API
      const scaleDownImage = (source: CanvasImageSource, width: number, height: number) => {
        if (width > 0 && height > 0) setAnalysisImageAspectRatio(width / height);
        const MAX_SIZE = 1024;
        let newWidth = width;
        let newHeight = height;

        if (width > height && width > MAX_SIZE) {
          newHeight = Math.round((height * MAX_SIZE) / width);
          newWidth = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          newWidth = Math.round((width * MAX_SIZE) / height);
          newHeight = MAX_SIZE;
        }

        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(source, 0, 0, newWidth, newHeight);
          return canvas.toDataURL('image/jpeg', 0.8);
        }
        return null;
      };

      if (isCameraActive && videoRef.current) {
        const video = videoRef.current;
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          throw new Error('Camera is still initializing. Please wait a second for the feed to start and try again.');
        }
        const scaled = scaleDownImage(video, video.videoWidth, video.videoHeight);
        if (scaled) imagePayload = scaled;
      } else if (selectedImage && (selectedImage.startsWith('blob:') || selectedImage.startsWith('data:'))) {
        // Convert blob URL to Image, then scale down
        imagePayload = await new Promise((resolve, reject) => {
          const img = new window.Image();
          img.onload = () => {
            const scaled = scaleDownImage(img, img.width, img.height);
            resolve(scaled as string);
          };
          img.onerror = reject;
          img.src = selectedImage;
        });
      } else if (selectedImage && selectedImage.startsWith('http')) {
        // Unsplash images can be huge too! Let's scale them down by loading them into an Image
        imagePayload = await new Promise((resolve, reject) => {
          const img = new window.Image();
          img.crossOrigin = 'anonymous'; // required for Unsplash to allow canvas read
          img.onload = () => {
            const scaled = scaleDownImage(img, img.width, img.height);
            resolve(scaled as string);
          };
          img.onerror = reject;
          img.src = selectedImage;
        });
      }

      if (!imagePayload) throw new Error("No image available to analyze");

      let result: MealAnalysisResult;
      try {
        result = await analyzeMeal(imagePayload);
      } catch (apiError) {
        console.warn("External AI API failed or unavailable, using mock food analysis:", apiError);
        // Fallback mock analysis with uncertain items and alternatives to satisfy mock data requirement
        result = {
          dishName: 'Crispy Cutlet & Veggie Harvest Plate',
          portionScore: 8.8,
          calories: 580,
          sodium_mg: 510,
          carbs_g: 54,
          protein_g: 34,
          friendlyFeedback: 'Great vegetable portion! To lower sodium, choose lean chicken or grilled fish.',
          recommendations: ['Consider Tonkatsu Chicken or Tofu for lower saturated fat', 'Drink water 15m before lunch'],
          plate: { top: 12, left: 10, width: 80, height: 76 },
          zones: [
            {
              id: 'z-cutlet',
              name: 'Breaded Cutlet (Tonkatsu)',
              category: 'protein',
              confidence: 'medium', // Uncertain item!
              alternatives: ['Tonkatsu Pork', 'Tonkatsu Chicken', 'Fried Fish Fillet', 'Crispy Tofu Steak'],
              targetRatio: 25,
              actualRatio: 30,
              status: 'decrease',
              color: 'peach',
              bubbleMessage: 'Eat ½ of the protein 🍗',
              calories: 270,
              sodium_mg: 330,
              carbs_g: 12,
              protein_g: 26,
              polygon: [
                { x: 30, y: 35 }, { x: 55, y: 32 }, { x: 62, y: 48 }, { x: 52, y: 60 }, { x: 32, y: 55 }
              ],
              boxCoords: { top: 32, left: 30, width: 32, height: 28 },
            },
            {
              id: 'z-greens',
              name: 'Steamed Garden Greens & Slaw',
              category: 'veggies',
              confidence: 'high', // Confident item!
              alternatives: ['Steamed Garden Greens & Slaw', 'Crispy Cucumber & Edamame', 'Roasted Zucchini'],
              targetRatio: 50,
              actualRatio: 45,
              status: 'optimal',
              color: 'mint',
              bubbleMessage: 'Perfect veggies! 🥦',
              calories: 90,
              sodium_mg: 60,
              carbs_g: 12,
              protein_g: 4,
              polygon: [
                { x: 18, y: 25 }, { x: 40, y: 20 }, { x: 42, y: 38 }, { x: 22, y: 45 }
              ],
              boxCoords: { top: 20, left: 18, width: 24, height: 25 },
            },
            {
              id: 'z-rice',
              name: 'Steamed Jasmine Rice',
              category: 'carbs',
              confidence: 'high', // Confident item!
              alternatives: ['Steamed Jasmine Rice', 'Whole Grain Brown Rice', 'Quinoa Grain Medley'],
              targetRatio: 25,
              actualRatio: 25,
              status: 'optimal',
              color: 'butter',
              bubbleMessage: 'Optimal carbs portion 🍚',
              calories: 220,
              sodium_mg: 120,
              carbs_g: 42,
              protein_g: 4,
              polygon: [
                { x: 58, y: 45 }, { x: 80, y: 48 }, { x: 76, y: 72 }, { x: 52, y: 68 }
              ],
              boxCoords: { top: 45, left: 52, width: 28, height: 27 },
            },
          ],
        };
      }

      setAnalysisResult(result);
      setVerifiedZones(result.zones.map((z) => ({ ...z })));
    } catch (error) {
      console.error("Analysis error:", error);
      setAnalysisError(
        error instanceof Error ? error.message : 'Meal analysis failed. Please try again.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      stopCamera();
      setIsCaptured(false);
      const objectUrl = URL.createObjectURL(file);
      setSelectedImage(objectUrl);
      setAnalysisResult(null);
      setVerifiedZones([]);
      setAnalysisError(null);
    }
  };

  // Handle logging meal
  const handleLogMeal = async () => {
    if (!analysisResult) return;

    setIsLogged(true); // Disable button immediately while uploading

    let finalImageUrl = selectedImage || SAMPLE_DISHES[0].url;

    // If it's a local object URL or data URL, upload it to Supabase first
    if (finalImageUrl.startsWith('blob:') || finalImageUrl.startsWith('data:')) {
      try {
        const response = await fetch(finalImageUrl);
        const blob = await response.blob();
        const ext = blob.type.split('/')[1] || 'jpg';

        const uploadedUrl = await DataLayer.uploadMealImage(blob, ext);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        }
      } catch (err) {
        console.error("Failed to upload image to Supabase", err);
      }
    }

    const now = new Date();
    const logDate = new Date(targetDate);
    logDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    const targetDateTimestamp = logDate.toISOString();
    const timeLabel = logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Map verified zones to FoodComponents with Magic Plate recommended intake %
    const components: FoodComponent[] = (verifiedZones.length > 0 ? verifiedZones : analysisResult.zones).map((z) => {
      const recPercent =
        z.actualRatio > z.targetRatio && z.actualRatio > 0
          ? Math.min(100, Math.max(25, Math.round((z.targetRatio / z.actualRatio) * 100)))
          : 100;

      return {
        id: z.id,
        name: z.userConfirmedName || z.name,
        category: z.category,
        confidence: z.confidence || 'high',
        alternatives: z.alternatives,
        isUserEdited: Boolean(z.isUserEdited),
        userConfirmedName: z.userConfirmedName,
        detectedRatio: z.actualRatio,
        recommendedIntakePercent: recPercent,
        actualIntakePercent: undefined, // Pending until recorded on Home screen!
        calories: z.calories || Math.round((z.actualRatio / 100) * calculatedTotals.calories),
        sodium_mg: z.sodium_mg || Math.round((z.actualRatio / 100) * calculatedTotals.sodium_mg),
        carbs_g: z.carbs_g || Math.round((z.actualRatio / 100) * calculatedTotals.carbs_g),
        protein_g: z.protein_g || Math.round((z.actualRatio / 100) * calculatedTotals.protein_g),
      };
    });

    await DataLayer.logMeal({
      title: analysisResult.dishName,
      meal_type: mealType,
      image_url: finalImageUrl,
      portion_score: calculatedTotals.portionScore,
      calories: calculatedTotals.calories,
      sodium_mg: calculatedTotals.sodium_mg,
      carbs_g: calculatedTotals.carbs_g,
      protein_g: calculatedTotals.protein_g,
      friendly_note: analysisResult.friendlyFeedback,
      logged_at: targetDateTimestamp,
      time_label: timeLabel,
      status: 'pending_intake',
      reminder_scheduled_at: targetDateTimestamp,
      components,
      estimated_calories: calculatedTotals.calories,
      estimated_sodium_mg: calculatedTotals.sodium_mg,
      estimated_carbs_g: calculatedTotals.carbs_g,
      estimated_protein_g: calculatedTotals.protein_g,
    });

    // Request notification permission for the 30-min reminder
    requestNotificationPermission().catch(() => {});

    fireConfetti();
    setTimeout(() => {
      router.push(`/?date=${formatDateKey(targetDate)}&celebrate=true`);
    }, 1200);
  };

  // Round upload button that sits next to the shutter (like the gallery button in a camera app).
  const uploadButton = (
    <label className="flex flex-col items-center gap-1 cursor-pointer select-none">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/60 bg-white/15 text-white backdrop-blur-md active:scale-90 transition-transform">
        <Upload className="w-5 h-5" />
      </span>
      <span className="text-[11px] font-bold text-white">Upload</span>
      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
    </label>
  );

  return (
    // Phone: fills the screen between the top and the bottom navbar. sm and up: normal page with a phone frame.
    <div className="fixed inset-x-0 top-0 bottom-[var(--nav)] z-30 overflow-y-auto overscroll-contain bg-[#FFFDF9] animate-fadeIn [--nav:calc(4rem_+_max(1rem,env(safe-area-inset-bottom,0px))_+_2px)] sm:static sm:z-auto sm:overflow-visible sm:bg-transparent">
      {/* Main Container: On Desktop, centered inside a phone-shaped frame */}
      <div className="sm:mx-auto sm:max-w-md">
        {/* Phone Shaped Outer Frame on Desktop */}
        {/* On phones: no frame. From the sm breakpoint up: bezel, padding and notch appear. */}
        <div className="relative overflow-hidden bg-stone-950 sm:mx-auto sm:w-fit sm:rounded-[44px] sm:border-[10px] sm:border-stone-800 sm:p-3 sm:shadow-2xl">
          {/* Phone Speaker Notch / Island (desktop/tablet only) */}
          <div className="hidden sm:flex absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-stone-900 rounded-full z-30 items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-stone-950 mr-2" />
            <div className="w-10 h-1 bg-stone-800 rounded-full" />
          </div>

          {/* Screen Content Viewport */}
          <div ref={screenRef} className="relative h-[calc(100dvh_-_var(--nav))] w-full overflow-hidden bg-stone-900 flex flex-col justify-between sm:[--h:min(calc(100dvh_-_7rem),46rem)] sm:h-[var(--h)] sm:w-[calc(var(--h)*9/16)] sm:rounded-[36px]">
            {/* Camera Video or Image View */}
            <div className="absolute inset-0">
              {isCameraActive ? (
                <video
                  ref={(el) => {
                    (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
                    if (el && stream && el.srcObject !== stream) {
                      el.srcObject = stream;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={(e) => {
                    e.currentTarget.play().catch(() => {});
                  }}
                  className="w-full h-full object-cover"
                />
              ) : selectedImage ? (
                <Image
                  src={selectedImage}
                  alt="Meal to analyze"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 400px"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-stone-900 text-stone-300">
                  <CameraIcon className="w-12 h-12 text-stone-500 mb-3" />
                  <p className="text-xs">Camera feed unavailable or stopped.</p>
                </div>
              )}

              {/* Tinted Dimming Overlay during analysis */}
              <div className="absolute inset-0 bg-stone-950/20 pointer-events-none" />

              {/* Circular Plate Targeting Reticle */}
              <div
                className={`absolute left-1/2 top-1/2 aspect-square w-[78%] -translate-x-1/2 -translate-y-1/2 border-4 border-dashed rounded-full pointer-events-none flex items-center justify-center transition-opacity ${analysisResult ? 'opacity-0' : 'border-white/50'
                  }`}
              >
                <span className="text-[11px] font-bold text-white/80 bg-stone-900/60 backdrop-blur-xs px-3 py-1 rounded-full uppercase tracking-wider">
                  Align Plate Here
                </span>
              </div>

              {/* OVERLAY: Colored Dotted Zones & Floating Speech Bubbles when Analyzed */}
              {analysisResult && (
                <div className="absolute inset-0 pointer-events-none z-20">
                  {(() => {
                    const plateEllipse = mapPlateToEllipse(analysisResult.plate, analysisImageAspectRatio, frameAspect);
                    const shapes = analysisResult.zones.flatMap((zone) => {
                      const shape = mapZoneToCoverFrame(zone, analysisImageAspectRatio, frameAspect);
                      return shape ? [{ zone, shape }] : [];
                    });

                    // Place each bubble at its polygon's top; push it down if it would sit on a previous bubble.
                    const placed: { x: number; y: number }[] = [];
                    const bubbles = shapes.map(({ shape }) => {
                      let x = Math.min(74, Math.max(26, shape.anchorX));
                      let y = Math.max(shape.anchorY, 14);
                      if (plateEllipse) {
                        // keep the bubble over the bowl, not the table
                        x = Math.min(plateEllipse.cx + plateEllipse.rx * 0.5, Math.max(plateEllipse.cx - plateEllipse.rx * 0.5, x));
                        y = Math.min(plateEllipse.cy + plateEllipse.ry * 0.6, Math.max(plateEllipse.cy - plateEllipse.ry * 0.6, y));
                      }
                      while (placed.some((q) => Math.abs(q.x - x) < 50 && Math.abs(q.y - y) < 11) && y < 80) {
                        y += 11;
                      }
                      placed.push({ x, y });
                      return { x, y };
                    });

                    const shapeColors = {
                      mint: 'stroke-emerald-400 fill-emerald-500/10',
                      peach: 'stroke-orange-400 fill-orange-500/10',
                      butter: 'stroke-amber-300 fill-amber-400/10',
                    };
                    const bubbleColors = {
                      mint: 'bg-emerald-500 text-white border-emerald-300',
                      peach: 'bg-orange-500 text-white border-orange-300',
                      butter: 'bg-amber-400 text-amber-950 border-amber-300',
                    };

                    return shapes.map(({ zone, shape }, i) => (
                      <React.Fragment key={zone.id}>
                        {/* Angled polygon outline that follows the food */}
                        <svg
                          className="absolute inset-0 h-full w-full"
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          aria-hidden="true"
                        >
                          {plateEllipse && (
                            <defs>
                              <clipPath id={`bowl-clip-${i}`}>
                                <ellipse
                                  cx={plateEllipse.cx}
                                  cy={plateEllipse.cy}
                                  rx={plateEllipse.rx}
                                  ry={plateEllipse.ry}
                                />
                              </clipPath>
                            </defs>
                          )}
                          <g clipPath={plateEllipse ? `url(#bowl-clip-${i})` : undefined}>
                            <polygon
                              points={shape.points.map((p) => `${p.x},${p.y}`).join(' ')}
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                              className={`stroke-2 animate-dash-pulse ${shapeColors[zone.color]}`}
                            />
                          </g>
                        </svg>

                        {/* Short speech bubble: wraps, never wider than the screen */}
                        <div
                          className="absolute w-max max-w-[58%] -translate-x-1/2 -translate-y-full"
                          style={{ left: `${bubbles[i].x}%`, top: `${bubbles[i].y}%` }}
                        >
                          <div
                            className={`line-clamp-2 break-words text-center text-[11px] leading-tight font-black px-2.5 py-1 rounded-2xl shadow-lg border ${bubbleColors[zone.color]}`}
                          >
                            {portionAdvice(zone)}
                          </div>
                        </div>
                      </React.Fragment>
                    ));
                  })()}
                </div>
              )}
            </div>

            {/* Top Toolbar overlay on screen */}
            <div className="relative z-30 p-3 sm:pt-10 flex flex-col gap-2 text-white">
              {/* Row 1: status, date, camera on/off */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold bg-stone-900/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 whitespace-nowrap">
                  {isCameraActive ? '🔴 Live Lens' : isCaptured ? '🖼️ Your Photo' : '📸 Plate Mockup'}
                </span>

                <div
                  suppressHydrationWarning
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-900/80 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold shadow-md whitespace-nowrap"
                >
                  <CalendarIcon className="w-3 h-3 text-emerald-400" />
                  <span suppressHydrationWarning>{dateBadgeLabel}</span>
                </div>

                {isCameraActive ? (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="p-2 rounded-full bg-stone-900/70 hover:bg-stone-800 text-white border border-white/20 transition-colors cursor-pointer"
                    title="Stop Camera"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex items-center gap-1 text-[11px] font-bold bg-emerald-500 hover:bg-emerald-600 px-2.5 py-1 rounded-full text-white shadow-md transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <CameraIcon className="w-3.5 h-3.5" /> Start Camera
                  </button>
                )}
              </div>

              {/* Row 2: meal type */}
              <div className="flex items-center gap-1 rounded-2xl bg-stone-900/70 backdrop-blur-md border border-white/20 p-1">
                {MEAL_TYPES.map((type) => {
                  const isSelected = mealType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setMealType(type.id)}
                      className={`flex-1 min-w-0 flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        isSelected ? 'bg-emerald-500 text-white shadow-sm' : 'text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <span>{type.icon}</span>
                      <span className="truncate">{type.label}</span>
                    </button>
                  );
                })}
              </div>

              {cameraError && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Camera Access Notice</p>
                    <p className="text-amber-800/90 mt-0.5">{cameraError}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Overlay on screen */}
            <div className="relative z-30 p-4 pb-6 bg-gradient-to-t from-stone-950/95 via-stone-950/70 to-transparent">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <Mascot expression="thinking" size="sm" />
                  <p className="text-xs font-bold text-white mt-2 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    Pal is analyzing your portions...
                  </p>
                </div>
              ) : analysisError ? (
                <div className="space-y-2 rounded-2xl bg-white/95 p-3 text-stone-900 shadow-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p role="alert" className="break-words text-xs font-semibold">
                      {analysisError}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 py-2 text-xs font-bold text-white hover:bg-emerald-600"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Try Again
                  </button>
                </div>
              ) : analysisResult ? (
                <div className="space-y-3">
                  {/* Analysis Result Banner */}
                  <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 border-2 border-emerald-300 text-stone-900 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center font-black text-emerald-800 text-xs">
                          ⭐
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-stone-900">
                              {analysisResult.dishName}
                            </h4>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800">
                              {MEAL_TYPES.find((t) => t.id === mealType)?.icon}{' '}
                              {MEAL_TYPES.find((t) => t.id === mealType)?.label}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-emerald-700">
                            Portion Score: {calculatedTotals.portionScore} / 10
                          </span>
                        </div>
                      </div>

                      <div className="text-right text-xs">
                        <span className="font-extrabold text-orange-600 flex items-center gap-0.5 justify-end">
                          <Flame className="w-3 h-3" /> {calculatedTotals.calories} kcal
                        </span>
                        <span className="text-[10px] text-stone-500">
                          Na: {calculatedTotals.sodium_mg}mg
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions inside viewfinder */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAnalysisResult(null);
                        setVerifiedZones([]);
                      }}
                      className="px-3 py-2.5 rounded-full bg-stone-800 text-stone-300 text-xs font-bold hover:bg-stone-700 transition-colors cursor-pointer"
                    >
                      Rescan
                    </button>
                    <button
                      type="button"
                      onClick={handleLogMeal}
                      disabled={isLogged}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs sm:text-sm shadow-md transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isLogged ? (
                        <>
                          <CheckCircle className="w-4 h-4" /> Logged! Redirecting...
                        </>
                      ) : (
                        <>
                          Log This Meal <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Shutter row: Upload (left) - round main button (centre) - Retake (right) */
                <div className="grid grid-cols-3 items-start">
                  <div className="flex justify-start pl-2">{uploadButton}</div>

                  <div className="flex flex-col items-center gap-2">
                    {isCameraActive ? (
                      <>
                        <button
                          type="button"
                          onClick={capturePhoto}
                          aria-label="Take photo"
                          className="w-16 h-16 rounded-full border-4 border-white bg-white/20 p-1 shadow-lg active:scale-90 transition-transform cursor-pointer"
                        >
                          <span className="block w-full h-full rounded-full bg-white" />
                        </button>
                        <span className="text-xs font-bold text-white whitespace-nowrap">Tap to take photo</span>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleAnalyze}
                          aria-label="Scan and analyze plate"
                          className="w-16 h-16 rounded-full border-4 border-white bg-gradient-to-tr from-emerald-500 to-sky-500 text-white flex items-center justify-center shadow-lg hover:brightness-105 active:scale-90 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-7 h-7" />
                        </button>
                        <span className="text-xs font-bold text-white whitespace-nowrap">Tap to scan plate</span>
                      </>
                    )}
                  </div>

                  <div className="flex justify-end pr-2">
                    {isCaptured && !isCameraActive && (
                      <button
                        type="button"
                        onClick={retakePhoto}
                        aria-label="Retake photo"
                        className="flex flex-col items-center gap-1 cursor-pointer select-none"
                      >
                        <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/60 bg-white/15 text-white backdrop-blur-md active:scale-90 transition-transform">
                          <RotateCcw className="w-5 h-5" />
                        </span>
                        <span className="text-[11px] font-bold text-white">Retake</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Food Verification & Portion Adjustment Card (Requirement 1) */}
        {analysisResult && verifiedZones.length > 0 && (
          <div className="mt-6 px-4 pb-6 sm:px-0 sm:pb-0">
            <Card variant="white" className="p-4 sm:p-5 border-2 border-emerald-300 shadow-md space-y-4 animate-fadeIn">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-stone-200/80 pb-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> AI Food Verification
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                    Verify & Adjust Detected Foods
                  </h3>
                  <p className="text-xs text-stone-600">
                    Confirm ingredients or pick alternatives. Portion edits update nutrition automatically.
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-orange-600 flex items-center justify-end gap-1">
                    <Flame className="w-3.5 h-3.5" /> {calculatedTotals.calories} kcal
                  </span>
                  <span className="text-[10px] text-stone-500 block">
                    Score: {calculatedTotals.portionScore}/10
                  </span>
                </div>
              </div>

              {/* List of detected items */}
              <div className="space-y-3.5">
                {verifiedZones.map((zone) => {
                  const isUncertain = zone.confidence !== 'high';
                  const isEditing = editingZoneId === zone.id;
                  const currentName = zone.userConfirmedName || zone.name;
                  const isOtherMode = isOtherActive[zone.id];

                  const categoryBadges = {
                    veggies: { label: 'Veggies 🥦', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                    protein: { label: 'Protein 🍗', bg: 'bg-orange-50 text-orange-800 border-orange-200' },
                    carbs: { label: 'Carbs 🍚', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
                  };

                  return (
                    <div
                      key={zone.id}
                      className={`rounded-2xl border-2 p-3 sm:p-3.5 transition-all ${
                        isUncertain
                          ? 'bg-amber-50/50 border-amber-300/90 shadow-2xs'
                          : 'bg-stone-50/80 border-stone-200 hover:border-emerald-200'
                      }`}
                    >
                      {/* Top row: Name, Category Pill, Confidence Badge, Edit button */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${categoryBadges[zone.category].bg}`}>
                            {categoryBadges[zone.category].label}
                          </span>
                          <span className="text-sm font-black text-stone-900">
                            {currentName}
                          </span>
                          {zone.isUserEdited && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded-md">
                              Edited ✓
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isUncertain ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                              <ShieldAlert className="w-3 h-3 text-amber-600" /> Uncertain Match
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/60 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Confident
                            </span>
                          )}

                          {/* Edit Button for confident items */}
                          {!isUncertain && (
                            <button
                              type="button"
                              onClick={() => setEditingZoneId(isEditing ? null : zone.id)}
                              className="p-1 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition-colors cursor-pointer"
                              title="Change food item"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* If Uncertain OR User clicked Edit: Show selectable alternatives & custom other input */}
                      {(isUncertain || isEditing) && (
                        <div className="mt-2.5 pt-2 border-t border-stone-200/60 space-y-2">
                          <p className="text-[11px] font-bold text-stone-600">
                            {isUncertain
                              ? 'AI is uncertain about this item. Please select the correct food:'
                              : 'Select alternative or enter custom name:'}
                          </p>

                          {/* Alternative Pills */}
                          <div className="flex flex-wrap gap-1.5">
                            {(zone.alternatives || [zone.name]).map((alt) => {
                              const isSelected = currentName.toLowerCase() === alt.toLowerCase();
                              return (
                                <button
                                  key={alt}
                                  type="button"
                                  onClick={() => {
                                    handleSelectAlternative(zone.id, alt);
                                    setEditingZoneId(null);
                                  }}
                                  className={`text-xs px-2.5 py-1 rounded-xl font-bold border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-102'
                                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                                  }`}
                                >
                                  {isSelected ? '✓ ' : ''}{alt}
                                </button>
                              );
                            })}

                            {/* "+ Other" pill */}
                            <button
                              type="button"
                              onClick={() => setIsOtherActive((prev) => ({ ...prev, [zone.id]: !prev[zone.id] }))}
                              className={`text-xs px-2.5 py-1 rounded-xl font-bold border transition-all cursor-pointer ${
                                isOtherMode
                                  ? 'bg-sky-600 text-white border-sky-600'
                                  : 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100'
                              }`}
                            >
                              + Other (Custom)
                            </button>
                          </div>

                          {/* Custom food name text field if + Other is active */}
                          {isOtherMode && (
                            <div className="flex items-center gap-2 pt-1 animate-fadeIn">
                              <input
                                type="text"
                                placeholder="Type custom food name (e.g. Fried Fish, Tofu Katsu)..."
                                value={customFoodInputs[zone.id] || ''}
                                onChange={(e) =>
                                  setCustomFoodInputs((prev) => ({ ...prev, [zone.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && customFoodInputs[zone.id]?.trim()) {
                                    handleSelectAlternative(zone.id, customFoodInputs[zone.id].trim());
                                    setEditingZoneId(null);
                                  }
                                }}
                                className="flex-1 text-xs bg-white border-2 border-sky-300 rounded-xl px-3 py-1.5 focus:outline-emerald-500 text-stone-900"
                              />
                              <button
                                type="button"
                                disabled={!customFoodInputs[zone.id]?.trim()}
                                onClick={() => {
                                  if (customFoodInputs[zone.id]?.trim()) {
                                    handleSelectAlternative(zone.id, customFoodInputs[zone.id].trim());
                                    setEditingZoneId(null);
                                  }
                                }}
                                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white transition-colors disabled:opacity-40 cursor-pointer"
                              >
                                Apply
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Estimated Portion Slider (No confirmation required by default) */}
                      <div className="mt-3 pt-2.5 border-t border-stone-200/60">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-stone-700 flex items-center gap-1">
                            <Sliders className="w-3 h-3 text-stone-500" /> Estimated Portion:
                          </span>
                          <span className="font-extrabold text-stone-900 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                            {zone.actualRatio}% of plate (~{zone.estimatedGrams || Math.round(zone.actualRatio * 3.5)}g)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-stone-400 font-bold">10%</span>
                          <input
                            type="range"
                            min="10"
                            max="80"
                            step="5"
                            value={zone.actualRatio}
                            onChange={(e) => handlePortionChange(zone.id, Number(e.target.value))}
                            className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-stone-200 rounded-lg"
                            aria-label={`Adjust estimated portion for ${currentName}`}
                          />
                          <span className="text-[10px] text-stone-400 font-bold">80%</span>
                        </div>

                        <div className="flex items-center justify-between mt-1 text-[11px] text-stone-500">
                          <span>~{zone.calories} kcal • Na {zone.sodium_mg}mg</span>
                          <span className="text-emerald-700 font-semibold">Updates nutrition instantly ✓</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Primary Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleLogMeal}
                  disabled={isLogged}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLogged ? (
                    <>
                      <CheckCircle className="w-4 h-4" /> Logging & Redirecting...
                    </>
                  ) : (
                    <>
                      Confirm Foods & Log Meal ({calculatedTotals.calories} kcal) <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="text-center text-[11px] text-stone-500 mt-1.5">
                  Meal will be logged with pending intake confirmation so you can track what you actually eat.
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CameraPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-sm font-semibold text-stone-500">Loading Magic Plate Vision...</p>
        </div>
      }
    >
      <CameraContent />
    </Suspense>
  );
}