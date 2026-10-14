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
import type { Meal } from '@/lib/mock-data';
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
function mapPointToCoverFrame(point: Point, sourceAspectRatio: number | null): Point {
  const imageAspectRatio = sourceAspectRatio ?? SCANNER_ASPECT_RATIO;
  const visibleWidth = Math.min(1, SCANNER_ASPECT_RATIO / imageAspectRatio);
  const visibleHeight = Math.min(1, imageAspectRatio / SCANNER_ASPECT_RATIO);
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
  sourceAspectRatio: number | null
): { cx: number; cy: number; rx: number; ry: number } | null {
  if (!plate) return null;
  const a = mapPointToCoverFrame({ x: plate.left, y: plate.top }, sourceAspectRatio);
  const b = mapPointToCoverFrame(
    { x: plate.left + plate.width, y: plate.top + plate.height },
    sourceAspectRatio
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
  sourceAspectRatio: number | null
): { points: Point[]; anchorX: number; anchorY: number } | null {
  const source = isValidPolygon(zone.polygon) ? zone.polygon : boxToPolygon(zone.boxCoords);
  const mapped = source.map((p) => mapPointToCoverFrame(p, sourceAspectRatio));

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
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // Fallback image source (file upload or sample preset)
  const [selectedImage, setSelectedImage] = useState<string | null>(SAMPLE_DISHES[0].url);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<MealAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisImageAspectRatio, setAnalysisImageAspectRatio] = useState<number | null>(null);
  const [isLogged, setIsLogged] = useState<boolean>(false);

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
      } else if (selectedImage && selectedImage.startsWith('blob:')) {
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

      const result = await analyzeMeal(imagePayload);
      setAnalysisResult(result);
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
      const objectUrl = URL.createObjectURL(file);
      setSelectedImage(objectUrl);
      setAnalysisResult(null);
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

    await DataLayer.logMeal({
      title: analysisResult.dishName,
      meal_type: mealType,
      image_url: finalImageUrl,
      portion_score: analysisResult.portionScore,
      calories: analysisResult.calories,
      sodium_mg: analysisResult.sodium_mg,
      carbs_g: analysisResult.carbs_g,
      protein_g: analysisResult.protein_g,
      friendly_note: analysisResult.friendlyFeedback,
      logged_at: targetDateTimestamp,
      time_label: timeLabel,
    });

    fireConfetti();
    setTimeout(() => {
      router.push(`/?date=${formatDateKey(targetDate)}&celebrate=true`);
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Title Header */}
      <div className="text-center max-w-lg mx-auto">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-100/70 px-3 py-1 rounded-full border border-sky-200 mb-2">
          <Sparkles className="w-3.5 h-3.5" /> Magic Plate Vision
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          Magic Plate Scanner
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Hold your plate in the guide or select a meal to see smart portion zones and speech bubbles!
        </p>
      </div>

      {/* Interactive Meal Type Selector */}
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl border-2 border-stone-200/90 p-1.5 shadow-xs flex items-center justify-between gap-1">
          {MEAL_TYPES.map((type) => {
            const isSelected = mealType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setMealType(type.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 sm:px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500 text-white shadow-sm scale-[1.02]'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container: On Desktop, centered inside a phone-shaped frame */}
      <div className="max-w-md mx-auto">
        {/* Phone Shaped Outer Frame on Desktop */}
        <div className="relative rounded-[36px] sm:rounded-[44px] border-[6px] sm:border-[10px] border-stone-800 bg-stone-950 p-2 sm:p-3 shadow-2xl overflow-hidden">
          {/* Phone Speaker Notch / Island */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-stone-900 rounded-full z-30 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-stone-950 mr-2" />
            <div className="w-10 h-1 bg-stone-800 rounded-full" />
          </div>

          {/* Screen Content Viewport */}
          <div className="relative aspect-[9/16] w-full rounded-[28px] sm:rounded-[36px] overflow-hidden bg-stone-900 flex flex-col justify-between">
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
                className={`absolute inset-x-6 top-16 bottom-28 border-4 border-dashed rounded-full pointer-events-none flex items-center justify-center transition-opacity ${analysisResult ? 'opacity-0' : 'border-white/50'
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
                    const plateEllipse = mapPlateToEllipse(analysisResult.plate, analysisImageAspectRatio);
                    const shapes = analysisResult.zones.flatMap((zone) => {
                      const shape = mapZoneToCoverFrame(zone, analysisImageAspectRatio);
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
            <div className="relative z-30 p-4 pt-10 flex items-center justify-between text-white">
              <span className="text-xs font-bold bg-stone-900/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                {isCameraActive ? '🔴 Live Lens' : '📸 Plate Mockup'}
              </span>

              {/* Viewfinder Date & Meal Badge */}
              <div
                suppressHydrationWarning
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900/80 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold shadow-md"
              >
                <CalendarIcon className="w-3 h-3 text-emerald-400" />
                <span suppressHydrationWarning>{dateBadgeLabel}</span>
                <span className="text-white/40">•</span>
                <span>
                  {MEAL_TYPES.find((t) => t.id === mealType)?.icon}{' '}
                  {MEAL_TYPES.find((t) => t.id === mealType)?.label}
                </span>
              </div>

              <div className="flex items-center gap-2">
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
                    className="flex items-center gap-1 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 px-3 py-1 rounded-full text-white shadow-md transition-colors cursor-pointer"
                  >
                    <CameraIcon className="w-3.5 h-3.5" /> Start Camera
                  </button>
                )}
              </div>
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
                            Portion Score: {analysisResult.portionScore} / 10
                          </span>
                        </div>
                      </div>

                      <div className="text-right text-xs">
                        <span className="font-extrabold text-orange-600 flex items-center gap-0.5 justify-end">
                          <Flame className="w-3 h-3" /> {analysisResult.calories} kcal
                        </span>
                        <span className="text-[10px] text-stone-500">
                          Na: {analysisResult.sodium_mg}mg
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAnalysisResult(null)}
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
                /* Primary Scan Button */
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 text-white font-black text-sm shadow-lg hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" /> Scan & Analyze Plate
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fallback Upload & Preset Picker */}
        <div className="mt-6 space-y-4">
          {cameraError && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Camera Access Notice</p>
                <p className="text-amber-800/90 mt-0.5">{cameraError}</p>
              </div>
            </div>
          )}

          <Card variant="white" className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Test With Sample Dishes or Upload
              </h4>
              <label className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 px-3 py-1 rounded-full cursor-pointer hover:bg-sky-100 transition-colors">
                <Upload className="w-3.5 h-3.5" /> Upload File
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Preset Thumbnail Pills */}
            <div className="grid grid-cols-3 gap-2">
              {SAMPLE_DISHES.map((dish) => (
                <button
                  key={dish.name}
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setSelectedImage(dish.url);
                    setMealType(dish.type);
                    setAnalysisResult(null);
                    setAnalysisError(null);
                  }}
                  className={`p-1.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${selectedImage === dish.url
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-sm'
                    : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                    }`}
                >
                  <div className="relative w-full h-16 rounded-xl overflow-hidden mb-1.5 bg-stone-200">
                    <Image
                      src={dish.url}
                      alt={dish.name}
                      fill
                      className="object-cover"
                      sizes="120px"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-stone-800 line-clamp-1 block">
                    {dish.name}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>
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