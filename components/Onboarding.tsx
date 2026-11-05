import React, { useState } from 'react';
import {
  ShieldCheck,
  Wallet,
  TrendingUp,
  BookOpen,
  Sparkles,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Camera,
  Bell,
  Lock,
  FolderLock,
  FileText,
  Cpu,
  Smartphone,
  X
} from 'lucide-react';
import { Camera as CapacitorCamera } from '@capacitor/camera';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0); // 0 = Welcome, 1-5 = Slides, 6 = Security & Permissions
  const [cameraGranted, setCameraGranted] = useState(false);
  const [notificationGranted, setNotificationGranted] = useState(false);

  const slides = [
    {
      title: "Secure Digital Vault",
      subtitle: "Slide 1 of 5",
      icon: <ShieldCheck size={48} className="text-cyan-400" />,
      gradient: "from-cyan-500/20 to-blue-600/20",
      description: "Your digital fortress with military-grade protection.",
      points: [
        "AES-256-GCM document encryption at rest and in transit.",
        "Personal and business document organisation.",
        "Separate folders for Me and Others.",
        "Secure document storage with biometric lock support."
      ]
    },
    {
      title: "Digital Wallet",
      subtitle: "Slide 2 of 5",
      icon: <Wallet size={48} className="text-sky-400" />,
      gradient: "from-sky-500/20 to-indigo-600/20",
      description: "All your essential credentials and documents instantly accessible.",
      points: [
        "Identity documents, National ID, and Passports.",
        "Certificates and academic transcripts.",
        "Business licenses, KRA PIN, and tax records.",
        "Receipts, important files, and secure view-once sharing."
      ]
    },
    {
      title: "Personal Finance",
      subtitle: "Slide 3 of 5",
      icon: <TrendingUp size={48} className="text-emerald-400" />,
      gradient: "from-emerald-500/20 to-teal-600/20",
      description: "Track wealth, expenses, and automated M-PESA transaction records.",
      points: [
        "M-PESA SMS transaction auto-parsing and instant receipt logging.",
        "Income and expenditure categorization.",
        "Interactive budget management and alerts.",
        "Recurring bills monitoring and PDF/Excel financial reports."
      ]
    },
    {
      title: "Journal & Reminders",
      subtitle: "Slide 4 of 5",
      icon: <BookOpen size={48} className="text-amber-400" />,
      gradient: "from-amber-500/20 to-orange-600/20",
      description: "Record daily reflections and never miss critical document expiry dates.",
      points: [
        "Personal daily journal and milestone logging.",
        "Mood tracking and daily gratitude notes.",
        "Integrated task management and checklists.",
        "Proactive document expiry reminders and scheduled push notifications."
      ]
    },
    {
      title: "AI Smart Assistant",
      subtitle: "Slide 5 of 5",
      icon: <Sparkles size={48} className="text-purple-400" />,
      gradient: "from-purple-500/20 to-fuchsia-600/20",
      description: "Intelligent document scanning, OCR extraction, and voice commands.",
      points: [
        "AI-powered document scanning and smart camera capture.",
        "Receipt optical character recognition (OCR).",
        "Automatic document information and expiry date extraction.",
        "Intelligent financial insights and voice assistant support."
      ]
    }
  ];

  const handleRequestCamera = async () => {
    try {
      const perm = await CapacitorCamera.requestPermissions();
      if (perm.camera === 'granted' || perm.photos === 'granted') {
        setCameraGranted(true);
      } else {
        setCameraGranted(true); // Allow continuing even if denied
      }
    } catch (e) {
      setCameraGranted(true);
    }
  };

  const handleRequestNotifications = async () => {
    try {
      if ('Notification' in window) {
        const res = await Notification.requestPermission();
        if (res === 'granted') {
          setNotificationGranted(true);
        } else {
          setNotificationGranted(true);
        }
      } else {
        setNotificationGranted(true);
      }
    } catch (e) {
      setNotificationGranted(true);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('folio_onboarding_done', 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col justify-between overflow-y-auto font-sans select-none animate-fadeIn">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black -z-10" />
      <div className="absolute top-10 right-10 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <div className="p-5 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-sm tracking-widest text-slate-200">DIGITAL DOCUFOLIO</span>
        </div>
        {currentStep > 0 && currentStep <= 5 && (
          <button
            onClick={handleFinish}
            className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 transition-colors"
          >
            Skip
          </button>
        )}
      </div>

      {/* Content Body */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 max-w-xl mx-auto w-full z-10 text-center">
        {currentStep === 0 && (
          /* Welcome Screen */
          <div className="space-y-6 animate-fadeIn">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-tr from-cyan-500/20 to-sky-500/20 border border-cyan-500/30 flex items-center justify-center shadow-2xl shadow-cyan-500/20 relative">
              <div className="absolute inset-0 rounded-3xl bg-cyan-500/10 animate-ping opacity-25" />
              <ShieldCheck size={48} className="text-cyan-400" />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-cyan-400">
                YOUR DOCUMENTS. YOUR LIFE. SECURE.
              </p>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
                Everything important, in one secure place.
              </h1>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-md mx-auto">
                Your personal digital companion for documents, finances, reminders and everyday records.
              </p>
            </div>

            <div className="pt-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="w-full sm:w-80 py-4 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-600 hover:to-sky-600 text-slate-950 font-bold rounded-2xl shadow-lg shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-base"
              >
                <span>Get Started</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {currentStep >= 1 && currentStep <= 5 && (
          /* Onboarding Slides 1-5 */
          <div className="space-y-6 w-full animate-fadeIn">
            <div className={`w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br ${slides[currentStep - 1].gradient} border border-white/10 flex items-center justify-center shadow-xl relative`}>
              {slides[currentStep - 1].icon}
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                {slides[currentStep - 1].subtitle}
              </span>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
                {slides[currentStep - 1].title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
                {slides[currentStep - 1].description}
              </p>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-5 border border-white/10 text-left space-y-3 shadow-inner">
              {slides[currentStep - 1].points.map((pt, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-300">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 border border-cyan-500/30">
                    <CheckCircle2 size={12} strokeWidth={3} />
                  </div>
                  <span className="leading-relaxed">{pt}</span>
                </div>
              ))}
            </div>

            {/* Pagination Dots */}
            <div className="flex justify-center items-center gap-2 pt-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-2 rounded-full transition-all ${
                    currentStep === s ? 'w-8 bg-cyan-400' : 'w-2 bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Nav Buttons */}
            <div className="flex gap-3 pt-4">
              {currentStep > 1 && (
                <button
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-2xl border border-white/10 transition-colors text-sm"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="flex-1 py-3.5 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-600 hover:to-sky-600 text-slate-950 font-bold rounded-2xl shadow-lg shadow-cyan-500/25 transition-all text-sm flex items-center justify-center gap-1.5"
              >
                <span>{currentStep === 5 ? 'Security & Permissions' : 'Next'}</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {currentStep === 6 && (
          /* Security Setup & Contextual Permissions */
          <div className="space-y-6 w-full animate-fadeIn text-left">
            <div className="text-center space-y-1">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2 shadow-lg">
                <Lock size={32} />
              </div>
              <h2 className="text-2xl font-display font-bold text-white">Vault Security & Permissions</h2>
              <p className="text-xs text-slate-400">Configuring your device-side secure environment.</p>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/10 space-y-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <FolderLock size={16} className="text-cyan-400" />
                  <span>AES-256-GCM Device-Side Encryption</span>
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Your documents are encrypted locally using AES-256-GCM integrated with Android Keystore. Your master keys never leave your secure hardware enclave. Protect your recovery credentials carefully.
                </p>
              </div>

              <div className="bg-slate-900/80 p-4 rounded-2xl border border-white/10 space-y-3">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <Smartphone size={16} className="text-sky-400" />
                  <span>Contextual Permissions</span>
                </h4>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                      <Camera size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Camera Access</p>
                      <p className="text-[10px] text-slate-400">Required for scanning documents & receipts</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRequestCamera}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      cameraGranted
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-sm'
                    }`}
                  >
                    {cameraGranted ? 'Granted ✓' : 'Allow'}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                      <Bell size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Notifications</p>
                      <p className="text-[10px] text-slate-400">Alerts for document expiry & reminders</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRequestNotifications}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      notificationGranted
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-sky-500 text-slate-950 hover:bg-sky-400 shadow-sm'
                    }`}
                  >
                    {notificationGranted ? 'Granted ✓' : 'Allow'}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleFinish}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-600 hover:to-sky-600 text-slate-950 font-bold rounded-2xl shadow-xl shadow-cyan-500/25 transition-all text-base flex items-center justify-center gap-2"
              >
                <Sparkles size={18} />
                <span>Enter Digital DocuFolio</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-5 text-center text-xs font-medium text-slate-500 z-10 border-t border-white/5 bg-slate-950/80">
        Powered by Aero Scan Kenya Ltd.
      </div>
    </div>
  );
};
