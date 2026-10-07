'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Mascot } from '@/components/mascot/Mascot';
import { fireConfetti } from '@/components/effects/Confetti';
import { analyzeMeal, type MealAnalysisResult } from '@/lib/ai/meal-analyzer';
import { DataLayer } from '@/lib/data-layer';
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
} from 'lucide-react';

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

export default function CameraPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // Fallback image source (file upload or sample preset)
  const [selectedImage, setSelectedImage] = useState<string | null>(SAMPLE_DISHES[0].url);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<MealAnalysisResult | null>(null);
  const [isLogged, setIsLogged] = useState<boolean>(false);

  // Initialize camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser.');
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraActive(true);
      setSelectedImage(null);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Could not access camera. Please allow camera permissions or use the upload fallback below.';
      setCameraError(errorMsg);
      setIsCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Handle Scan action
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      let imagePayload = selectedImage;

      // Helper to scale down images for the API
      const scaleDownImage = (source: CanvasImageSource, width: number, height: number) => {
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
    }
  };

  // Handle logging meal
  const handleLogMeal = async () => {
    if (!analysisResult) return;

    await DataLayer.logMeal({
      title: analysisResult.dishName,
      meal_type: 'dinner',
      image_url: selectedImage || SAMPLE_DISHES[0].url,
      portion_score: analysisResult.portionScore,
      calories: analysisResult.calories,
      sodium_mg: analysisResult.sodium_mg,
      carbs_g: analysisResult.carbs_g,
      protein_g: analysisResult.protein_g,
      friendly_note: analysisResult.friendlyFeedback,
    });

    setIsLogged(true);
    fireConfetti();
    setTimeout(() => {
      router.push('/');
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
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
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
              <div className="absolute inset-x-6 top-16 bottom-28 border-4 border-dashed border-white/50 rounded-full pointer-events-none flex items-center justify-center">
                <span className="text-[11px] font-bold text-white/80 bg-stone-900/60 backdrop-blur-xs px-3 py-1 rounded-full uppercase tracking-wider">
                  Align Plate Here
                </span>
              </div>

              {/* OVERLAY: Colored Dotted Zones & Floating Speech Bubbles when Analyzed */}
              {analysisResult && (
                <div className="absolute inset-0 pointer-events-none z-20">
                  {analysisResult.zones.map((zone) => {
                    const borderColors = {
                      mint: 'border-emerald-400 bg-emerald-500/15 text-emerald-950',
                      peach: 'border-orange-400 bg-orange-500/15 text-orange-950',
                      butter: 'border-amber-300 bg-amber-400/20 text-amber-950',
                    };

                    const bubbleColors = {
                      mint: 'bg-emerald-500 text-white border-emerald-300',
                      peach: 'bg-orange-500 text-white border-orange-300',
                      butter: 'bg-amber-400 text-amber-950 border-amber-300',
                    };

                    return (
                      <div
                        key={zone.id}
                        className={`absolute border-2 border-dashed rounded-3xl animate-dash-pulse ${
                          borderColors[zone.color]
                        } transition-all`}
                        style={{
                          top: `${zone.boxCoords.top}%`,
                          left: `${zone.boxCoords.left}%`,
                          width: `${zone.boxCoords.width}%`,
                          height: `${zone.boxCoords.height}%`,
                        }}
                      >
                        {/* Speech Bubble Floating Above / Inside Zone */}
                        <div
                          className={`absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-black px-2.5 py-1 rounded-full shadow-lg border ${
                            bubbleColors[zone.color]
                          } animate-bounce`}
                        >
                          {zone.bubbleMessage}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top Toolbar overlay on screen */}
            <div className="relative z-30 p-4 pt-10 flex items-center justify-between text-white">
              <span className="text-xs font-bold bg-stone-900/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                {isCameraActive ? '🔴 Live Lens' : '📸 Plate Mockup'}
              </span>

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
                          <h4 className="text-xs font-bold text-stone-900">
                            {analysisResult.dishName}
                          </h4>
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
                    setAnalysisResult(null);
                  }}
                  className={`p-1.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    selectedImage === dish.url
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
