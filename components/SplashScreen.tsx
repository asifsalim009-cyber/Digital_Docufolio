import React, { useState, useEffect, useRef } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SPLASH_1_SRC = '/splash_logo.png';
const SPLASH_1_FALLBACK = 'https://lh3.googleusercontent.com/d/1P5lYaVSTowpvW3Ys5zO1GfwG06l1AJkV';

// Primary local asset, secondary Google Usercontent fallback, tertiary Google Drive direct stream
const SPLASH_2_SRC = '/splash_animation.gif';
const SPLASH_2_FALLBACK = 'https://lh3.googleusercontent.com/d/1RVi9waFax7hdxOYKjcM4Is-OPQ9mBf5z';
const SPLASH_2_DRIVE = 'https://drive.google.com/uc?export=view&id=1RVi9waFax7hdxOYKjcM4Is-OPQ9mBf5z';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [phase, setPhase] = useState<1 | 2>(1);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [img1Src, setImg1Src] = useState(SPLASH_1_SRC);
  const [img2Src, setImg2Src] = useState(SPLASH_2_SRC);
  const [isGifLoaded, setIsGifLoaded] = useState(false);
  const hasFinishedRef = useRef(false);

  const handleComplete = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setIsFadingOut(true);
    setTimeout(() => {
      onFinish();
    }, 350);
  };

  useEffect(() => {
    // Hide native Capacitor static launch screen so user immediately sees animated splash screen
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      import('@capacitor/splash-screen').then(({ SplashScreen: CapSplash }) => {
        CapSplash.hide().catch(() => {});
      }).catch(() => {});
    }

    // Preload Phase 1 Logo
    const img1 = new Image();
    img1.src = SPLASH_1_SRC;
    img1.onerror = () => setImg1Src(SPLASH_1_FALLBACK);

    // Preload Phase 2 GIF with fallback retry chain
    const img2 = new Image();
    img2.src = SPLASH_2_SRC;
    img2.onload = () => {
      setIsGifLoaded(true);
    };
    img2.onerror = () => {
      console.warn('Local GIF failed, falling back to network CDN');
      const fallbackImg = new Image();
      fallbackImg.src = SPLASH_2_FALLBACK;
      fallbackImg.onload = () => {
        setImg2Src(SPLASH_2_FALLBACK);
        setIsGifLoaded(true);
      };
      fallbackImg.onerror = () => {
        setImg2Src(SPLASH_2_DRIVE);
        setIsGifLoaded(true);
      };
    };

    // Phase 1 (Logo): 2.5 seconds -> Phase 2 (Animated GIF): 4 seconds -> Finish
    const phaseTimer = setTimeout(() => {
      setPhase(2);
    }, 2500);

    const completeTimer = setTimeout(() => {
      handleComplete();
    }, 6500);

    return () => {
      clearTimeout(phaseTimer);
      clearTimeout(completeTimer);
    };
  }, []);

  return (
    <div
      id="app-splash-screen"
      onClick={handleComplete}
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-black cursor-pointer select-none transition-opacity duration-300 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Phase 1: Logo */}
      <div className={`flex items-center justify-center w-full h-full p-4 transition-opacity duration-500 ${phase === 1 ? 'opacity-100' : 'opacity-0 hidden'}`}>
        <img
          src={img1Src}
          alt="Digital DocuFolio Logo"
          onError={() => setImg1Src(SPLASH_1_FALLBACK)}
          className="max-h-[85vh] max-w-[90vw] object-contain drop-shadow-[0_10px_35px_rgba(0,112,243,0.35)] animate-fadeIn"
        />
      </div>

      {/* Phase 2: Animated GIF (Pre-mounted and rendered as soon as active) */}
      <div className={`flex items-center justify-center w-full h-full p-4 transition-opacity duration-500 ${phase === 2 ? 'opacity-100 animate-fadeIn' : 'opacity-0 hidden'}`}>
        <img
          src={img2Src}
          alt="Digital DocuFolio Animation"
          onLoad={() => setIsGifLoaded(true)}
          onError={() => {
            if (img2Src === SPLASH_2_SRC) {
              setImg2Src(SPLASH_2_FALLBACK);
            } else if (img2Src === SPLASH_2_FALLBACK) {
              setImg2Src(SPLASH_2_DRIVE);
            }
          }}
          className="max-h-[85vh] max-w-[90vw] object-contain"
        />
      </div>

      {/* Subtle Skip button in bottom corner */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleComplete();
        }}
        className="absolute bottom-6 right-6 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white text-xs tracking-wider transition-all backdrop-blur-md"
      >
        SKIP
      </button>
    </div>
  );
};

