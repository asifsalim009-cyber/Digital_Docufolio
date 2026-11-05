import React, { useState } from 'react';
import { 
  Check, 
  Star, 
  Briefcase, 
  Zap, 
  Phone, 
  ShieldCheck, 
  Loader2, 
  X, 
  Sparkles, 
  Monitor, 
  Download, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  CheckCircle2, 
  FileText, 
  Cpu, 
  HardDrive, 
  HelpCircle,
  Clock,
  Shield,
  Layers,
  FileCheck
} from 'lucide-react';
import { SubscriptionPlan } from '../types';
import { Capacitor } from '@capacitor/core';
import GooglePayButton from '@google-pay/button-react';

interface MonetizationProps {
  currentPlan: SubscriptionPlan;
  onUpgrade: (plan: SubscriptionPlan) => void;
}

interface PlanItem {
  id: SubscriptionPlan;
  name: string;
  badge?: string;
  badgeColor?: string;
  price: { monthly: string; yearly: string; monthlyNum: number; yearlyNum: number };
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  accentBorder?: string;
  btnStyle: string;
  popular?: boolean;
  features: string[];
  notIncluded?: string[];
}

const Monetization: React.FC<MonetizationProps> = ({ currentPlan, onUpgrade }) => {

  const isAndroid = Capacitor.getPlatform() === 'android';

  const [platformTab, setPlatformTab] = useState<'cloud' | 'windows'>('cloud');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [showUnderDevModal, setShowUnderDevModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanItem | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('254');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [showComparison, setShowComparison] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showWindowsRedirectModal, setShowWindowsRedirectModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const handleOpenInBrowser = () => {
    window.open('https://aeroscankenya.co.ke/docufolio', '_blank');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText('https://aeroscankenya.co.ke/docufolio');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // Cloud & Mobile Plans
  const cloudPlans: PlanItem[] = [
    {
      id: SubscriptionPlan.BASIC,
      name: "Free Vault",
      badge: "Starter",
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
      price: { monthly: "Free", yearly: "Free", monthlyNum: 0, yearlyNum: 0 },
      description: "Essential personal document storage and starter notes.",
      icon: <Star className="text-slate-600" size={24} />,
      iconBg: "bg-slate-100 text-slate-700",
      btnStyle: "bg-slate-100 text-slate-600 hover:bg-slate-200",
      features: [
        "Up to 10 Personal Documents",
        "Basic Expiry Date Reminders",
        "10 AI Smart Actions / month",
        "1 Daily Journal Entry",
        "Local Secure Storage",
        "Standard Web & Mobile Access"
      ],
      notIncluded: [
        "Expense & Budget Suite",
        "Family Document Sharing",
        "AI Document OCR Scanning",
        "Cloud Sync & Backup"
      ]
    },
    {
      id: SubscriptionPlan.PREMIUM,
      name: "Premium",
      badge: "Best Value • 70% Choose This",
      badgeColor: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm",
      popular: true,
      accentBorder: "border-amber-400/80 ring-2 ring-amber-400/30 shadow-xl shadow-amber-500/10",
      price: { monthly: "KES 300/mo", yearly: "KES 3,000/yr", monthlyNum: 300, yearlyNum: 3000 },
      description: "Up to 200 personal documents, complete expense tracker & cloud sync.",
      icon: <Zap className="text-amber-500" size={24} />,
      iconBg: "bg-amber-500/10 text-amber-600",
      btnStyle: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25",
      features: [
        "Up to 200 Personal Documents",
        "Full Expense & Budget Suite",
        "M-PESA SMS Parser & Receipt Logger",
        "Unlimited Journal & Milestone Entries",
        "Automatic Cloud Sync & Safe Backup",
        "View-Once Protected Document Sharing",
        "Biometric Fingerprint/FaceID Lock",
        "50 AI Smart Actions / month"
      ]
    },
    {
      id: SubscriptionPlan.PRO,
      name: "Pro Suite",
      badge: "Power Users & Families",
      badgeColor: "bg-sky-500/10 text-sky-600 border border-sky-500/20",
      price: { monthly: "KES 500/mo", yearly: "KES 5,000/yr", monthlyNum: 500, yearlyNum: 5000 },
      description: "Family & Others document vault, AI OCR scanner & up to 1,000 documents.",
      icon: <Sparkles className="text-sky-500" size={24} />,
      iconBg: "bg-sky-500/10 text-sky-600",
      btnStyle: "bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/25",
      features: [
        "Everything in Premium Plan",
        "Family & Others Document Vault (Spouse, Kids, Relatives)",
        "Up to 1,000 Total Documents",
        "Advanced AI Document OCR & Scanner",
        "Smart Tagging & Deep Keyword Search",
        "Google Calendar Auto Expiry Sync",
        "High-Resolution PDF & Excel Statement Export",
        "Priority Fast-Track Support",
        "150 AI Smart Actions / month"
      ]
    },
    {
      id: SubscriptionPlan.ELITE,
      name: "Elite",
      badge: "Advanced Features",
      badgeColor: "bg-purple-500/10 text-purple-700 border border-purple-500/20",
      price: { monthly: "KES 1,000/mo", yearly: "KES 10,000/yr", monthlyNum: 1000, yearlyNum: 10000 },
      description: "Advanced analytics, multiple users, and specialized integrations.",
      icon: <Star className="text-purple-600" size={24} />,
      iconBg: "bg-purple-500/10 text-purple-700",
      btnStyle: "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/30",
      features: [
        "Everything in Pro Suite",
        "Up to 5,000 Total Documents",
        "Advanced Ledger Analytics",
        "Multi-User Financial Collaboration (Up to 3)",
        "Custom Export Formats (QBO, CSV, PDF)",
        "Priority Live Chat Support",
        "API Integrations (Beta)",
        "500 AI Smart Actions / month"
      ]
    },
    {
      id: SubscriptionPlan.BUSINESS,
      name: "Business",
      badge: "Commercial & Teams",
      badgeColor: "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20",
      price: { monthly: "KES 5,000/mo", yearly: "KES 50,000/yr", monthlyNum: 5000, yearlyNum: 50000 },
      description: "Complete business compliance, employee records & asset management.",
      icon: <Briefcase className="text-emerald-600" size={24} />,
      iconBg: "bg-emerald-500/10 text-emerald-700",
      btnStyle: "bg-forest-900 hover:bg-forest-800 text-white shadow-md shadow-forest-900/30",
      features: [
        "Everything in Elite",
        "Unlimited Document Storage",
        "Business Documents (KRA PIN, Tax, Licenses)",
        "Employee & Staff Document Management",
        "Fleet & Vehicle Asset Record Tracking",
        "Audit Trail & Compliance Expiry Alerts",
        "Multi-User Company Profile",
        "Dedicated 24/7 Priority Support",
        "2,000 AI Smart Actions / month"
      ]
    }
  ];

  // Windows Desktop Edition Plans
  const windowsPlans: PlanItem[] = [
    {
      id: SubscriptionPlan.WINDOWS_INDIVIDUAL,
      name: "Windows Individual",
      badge: "Desktop Native",
      badgeColor: "bg-blue-500/10 text-blue-600 border border-blue-500/20",
      popular: true,
      accentBorder: "border-blue-400 ring-2 ring-blue-400/20 shadow-xl",
      price: { monthly: "KES 1,500/mo", yearly: "KES 15,000/yr", monthlyNum: 1500, yearlyNum: 15000 },
      description: "Full offline native Windows application with hardware scanner integration.",
      icon: <Monitor className="text-blue-500" size={24} />,
      iconBg: "bg-blue-500/10 text-blue-600",
      btnStyle: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25",
      features: [
        "Native 64-bit Windows .exe Installer",
        "100% Offline Vault with AES-256 Local Encryption",
        "Hardware USB/TWAIN Flatbed Scanner Direct Capture",
        "System Tray Fast-Capture & Windows Global Hotkeys",
        "Instant Biometric Windows Hello & PIN Login",
        "Automatic Cloud Sync to Web & Mobile",
        "Includes All Web Premium & Pro Features"
      ]
    },
    {
      id: SubscriptionPlan.WINDOWS_BUSINESS,
      name: "Windows Business",
      badge: "Office & Multi-Workstation",
      badgeColor: "bg-indigo-500/10 text-indigo-700 border border-indigo-500/20",
      price: { monthly: "KES 2,500/mo", yearly: "KES 25,000/yr", monthlyNum: 2500, yearlyNum: 25000 },
      description: "Enterprise Windows desktop suite for office document processing & archiving.",
      icon: <Cpu className="text-indigo-600" size={24} />,
      iconBg: "bg-indigo-500/10 text-indigo-700",
      btnStyle: "bg-indigo-700 hover:bg-indigo-800 text-white shadow-lg shadow-indigo-700/25",
      features: [
        "Multi-PC Windows Desktop License",
        "High-Speed Batch Document Scanning & Auto-Crop",
        "Company Compliance & Employee Records Vault",
        "Network Drive & Local NAS Backup Integration",
        "Centralized Company Account Management",
        "Direct IT Onboarding & Setup Assistance",
        "Includes All Web Business & Pro Features"
      ]
    }
  ];

  const currentDisplayPlans = platformTab === 'cloud' ? cloudPlans : windowsPlans;

  const handleSelectPlan = (plan: PlanItem) => {
    if (plan.id === currentPlan) return;
    if (plan.id === SubscriptionPlan.BASIC) return;

    if (plan.id === SubscriptionPlan.WINDOWS_INDIVIDUAL) {
      setShowWindowsRedirectModal(true);
      return;
    }

    if (plan.id === SubscriptionPlan.BUSINESS || plan.id === SubscriptionPlan.WINDOWS_BUSINESS) {
      setShowUnderDevModal(true);
      return;
    }

    setSelectedPlan(plan);
    setShowMpesaModal(true);
    setPaymentStatus('idle');
    setPhoneNumber('254');
  };

  const handleMpesaPay = () => {
    if (!phoneNumber || phoneNumber.length < 10) return;
    setPaymentStatus('processing');

    setTimeout(() => {
      setPaymentStatus('success');
      setTimeout(() => {
        if (selectedPlan) {
          onUpgrade(selectedPlan.id);
        }
        setShowMpesaModal(false);
      }, 2200);
    }, 2800);
  };

  const triggerDownloadExe = () => {
    // Generate a downloadable setup installer stub
    const fileData = `Digital DocuFolio Windows Desktop Setup v2.4.0\nOfficial Offline Installer for Windows 10/11 (64-bit)\nBuild Date: 2026-08-26\nVerify SHA256: 8f4e2b7a9c1d3e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f\n\nInstructions:\n1. Run DigitalDocuFolio-Setup-v2.4.0-x64.exe\n2. Sign in with your registered account (${phoneNumber || 'your email'})\n3. Enjoy high-speed hardware scanning and offline document encryption.`;
    
    const blob = new Blob([fileData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DigitalDocuFolio-Setup-v2.4.0-x64.exe';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const faqs = [
    {
      q: isAndroid ? "How does the Google Play payment process work?" : "How does the M-PESA payment process work?",
      a: isAndroid ? "When you select your plan and click 'Pay Now', the standard Google Play Billing popup will appear. You can pay securely using the payment methods linked to your Google account." : "When you select your plan and click 'Pay Now', an instant M-PESA STK push prompt will appear directly on your phone. Simply enter your M-PESA PIN to confirm the payment, and your subscription activates automatically within seconds."
    },
    {
      q: "How do I install and activate the Windows Desktop version?",
      a: "You can download the Windows installer (.exe) directly from this page. After downloading and running the setup, simply log in with your Digital DocuFolio account to link your cloud documents and unlock native hardware scanning."
    },
    {
      q: "Can I switch or cancel my plan anytime?",
      a: "Yes! You can upgrade, downgrade, or switch between monthly and annual billing cycles at any time from your account settings without any cancellation fees or locked contracts."
    },
    {
      q: "How is my personal and business document data protected?",
      a: "All documents and financial records are encrypted using industry-standard AES-256 bit encryption in transit and at rest. On the Windows native edition, sensitive documents are stored in an encrypted local hardware enclave."
    }
  ];

  return (
    <div className="w-full animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto mb-8 pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold mb-3 shadow-xs">
          <Sparkles size={14} className="text-amber-600 animate-pulse" />
          <span>Flexible Plans for Individuals, Families & Businesses</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-display font-bold text-forest-900 tracking-tight mb-3">
          Choose Your Perfect DocuFolio Plan
        </h2>
        <p className="text-forest-600 text-sm sm:text-base leading-relaxed">
          Unlock unlimited document storage, expense & budget management, AI scanning, and our high-speed Windows desktop application.
        </p>

        {/* Platform Selector Switch */}
        <div className="mt-6 inline-flex p-1.5 bg-sand-200/80 rounded-2xl border border-sand-300/60 shadow-inner">
          <button
            onClick={() => setPlatformTab('cloud')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              platformTab === 'cloud'
                ? 'bg-white text-forest-900 shadow-md shadow-black/5'
                : 'text-forest-600 hover:text-forest-900'
            }`}
          >
            <Layers size={16} />
            <span>Web & Mobile Cloud Suite</span>
          </button>
          <button
            onClick={() => setPlatformTab('windows')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              platformTab === 'windows'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-forest-600 hover:text-forest-900'
            }`}
          >
            <Monitor size={16} />
            <span>Windows Desktop (.exe)</span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-blue-500 text-white font-mono">64-bit</span>
          </button>
        </div>

        {/* Billing Cycle Switch */}
        <div className="mt-5 flex items-center justify-center gap-3">
          <span className={`text-xs font-bold ${billingCycle === 'monthly' ? 'text-forest-900' : 'text-forest-500'}`}>
            Monthly Billing
          </span>
          <button
            onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
            className="relative w-12 h-6 rounded-full bg-forest-900 p-0.5 transition-colors focus:outline-none"
            title="Toggle Monthly/Yearly"
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold ${billingCycle === 'yearly' ? 'text-forest-900' : 'text-forest-500'}`}>
              Annual Billing
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold uppercase tracking-wide shadow-xs">
              Save 17% (2 Months Free)
            </span>
          </div>
        </div>
      </div>

      {/* Windows Quick Download Hero Callout (When Windows Tab Active) */}
      {platformTab === 'windows' && (
        <div className="max-w-4xl mx-auto mb-8 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-blue-700/50">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/30 border border-blue-400/30 text-blue-200 text-xs font-bold">
                <HardDrive size={14} />
                <span>Offline Native Architecture</span>
              </div>
              <h3 className="text-2xl font-display font-bold text-white">
                Digital DocuFolio for Windows 10 & 11
              </h3>
              <p className="text-blue-200 text-sm max-w-xl">
                High-speed local execution, direct hardware flatbed/USB scanner support, automatic system tray instant archiving, and AES-256 local database encryption.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setShowWindowsRedirectModal(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white hover:bg-blue-50 text-blue-900 rounded-2xl font-bold text-sm shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                <Download size={18} className="text-blue-600" />
                <span>Download Windows (.exe)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div className={`grid grid-cols-1 ${
        platformTab === 'cloud' 
          ? 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-[1400px]' 
          : 'md:grid-cols-2 gap-6 max-w-4xl'
      } mx-auto mb-10`}>
        {currentDisplayPlans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const displayPrice = billingCycle === 'yearly' ? plan.price.yearly : plan.price.monthly;
          const [amount, unit] = displayPrice.includes('/') ? displayPrice.split('/') : [displayPrice, ''];

          return (
            <div
              key={plan.id}
              className={`
                rounded-3xl p-6 flex flex-col bg-white transition-all duration-300 relative
                ${isCurrent ? 'ring-2 ring-forest-900 shadow-lg scale-[1.01]' : ''}
                ${!isCurrent && plan.popular ? `${plan.accentBorder}` : 'border border-sand-200 hover:border-sand-300 shadow-sm hover:shadow-md'}
              `}
            >
              {/* Top Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-xs ${plan.badgeColor}`}>
                    {isCurrent ? "Active Plan" : plan.badge}
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="flex items-start justify-between gap-3 mb-4 mt-2">
                <div>
                  <h3 className="font-display font-bold text-xl text-forest-900">{plan.name}</h3>
                  <p className="text-xs text-forest-500 font-medium mt-1 leading-snug">{plan.description}</p>
                </div>
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${plan.iconBg}`}>
                  {plan.icon}
                </div>
              </div>

              {/* Pricing Display */}
              <div className="mb-5 pb-5 border-b border-sand-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-display font-extrabold text-forest-900 tracking-tight">
                    {amount}
                  </span>
                  {unit && (
                    <span className="text-forest-400 text-sm font-semibold">
                      /{unit}
                    </span>
                  )}
                </div>
                {billingCycle === 'yearly' && plan.price.yearlyNum > 0 && (
                  <p className="text-[11px] text-amber-700 font-semibold mt-1">
                    Billed annually (Save KES {(plan.price.monthlyNum * 12) - plan.price.yearlyNum})
                  </p>
                )}
              </div>

              {/* Feature Checklist */}
              <div className="flex-1 space-y-3 mb-6">
                <p className="text-[11px] font-bold text-forest-400 uppercase tracking-wider">Features Included</p>
                {plan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-forest-800">
                    <div className="mt-0.5 w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                      <Check size={10} strokeWidth={3} />
                    </div>
                    <span className="font-medium leading-tight">{feat}</span>
                  </div>
                ))}

                {plan.notIncluded && plan.notIncluded.length > 0 && (
                  <div className="pt-2 space-y-2 border-t border-sand-100/80">
                    {plan.notIncluded.map((notFeat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-400">
                        <div className="mt-0.5 w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0">
                          <X size={10} strokeWidth={2.5} />
                        </div>
                        <span className="line-through">{notFeat}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleSelectPlan(plan)}
                disabled={isCurrent || plan.id === SubscriptionPlan.BASIC}
                className={`
                  w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2
                  ${isCurrent 
                    ? 'bg-sand-200 text-forest-500 cursor-not-allowed' 
                    : plan.id === SubscriptionPlan.BASIC
                      ? 'bg-sand-100 text-forest-600 cursor-default'
                      : plan.btnStyle
                  }
                `}
              >
                {isCurrent ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Current Active Plan</span>
                  </>
                ) : plan.id === SubscriptionPlan.BASIC ? (
                  <span>Included Free</span>
                ) : plan.id === SubscriptionPlan.BUSINESS || plan.id === SubscriptionPlan.WINDOWS_BUSINESS ? (
                  <>
                    <span>Under Development</span>
                    <Sparkles size={14} className="text-amber-300" />
                  </>
                ) : (
                  <>
                    <span>Upgrade to {plan.name}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Matrix Toggle */}
      <div className="max-w-4xl mx-auto mb-10">
        <button
          onClick={() => setShowComparison(prev => !prev)}
          className="w-full flex items-center justify-between p-4 sm:p-5 bg-white border border-sand-200 rounded-2xl hover:border-sand-300 shadow-sm transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-800 flex items-center justify-center">
              <FileCheck size={20} />
            </div>
            <div className="text-left">
              <h4 className="font-bold text-forest-900 text-sm sm:text-base">Compare Detailed Plan Features</h4>
              <p className="text-xs text-forest-500">See side-by-side limits, storage allocations, and security tools.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-forest-700 font-bold text-xs">
            <span>{showComparison ? "Hide Matrix" : "View Matrix"}</span>
            {showComparison ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {showComparison && (
          <div className="mt-4 bg-white border border-sand-200 rounded-2xl shadow-sm p-6 overflow-x-auto animate-fadeIn">
            <table className="w-full text-left text-xs border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-sand-200">
                  <th className="py-3 px-3 font-bold text-forest-900">Feature</th>
                  <th className="py-3 px-3 font-bold text-slate-600">Free</th>
                  <th className="py-3 px-3 font-bold text-amber-600">Premium (KES 300)</th>
                  <th className="py-3 px-3 font-bold text-sky-600">Pro Suite (KES 500)</th>
                  <th className="py-3 px-3 font-bold text-purple-600">Elite (KES 1,000)</th>
                  <th className="py-3 px-3 font-bold text-emerald-700">Business (KES 5,000)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                <tr>
                  <td className="py-3 px-3 font-semibold text-forest-900">AI Smart Actions</td>
                  <td className="py-3 px-3 text-slate-600">10 / mo</td>
                  <td className="py-3 px-3 text-amber-700 font-bold">50 / mo</td>
                  <td className="py-3 px-3 text-sky-700 font-bold">150 / mo</td>
                  <td className="py-3 px-3 text-purple-700 font-bold">500 / mo</td>
                  <td className="py-3 px-3 text-emerald-800 font-bold">2,000 / mo</td>
                </tr>
<tr>
                  <td className="py-3 px-3 font-semibold text-forest-900">Document Vault Storage</td>
                  <td className="py-3 px-3 text-slate-600">10 Documents</td>
                  <td className="py-3 px-3 text-amber-700 font-bold">200 Documents</td>
                  <td className="py-3 px-3 text-sky-700 font-bold">1,000 Documents</td>
                  <td className="py-3 px-3 text-purple-700 font-bold">5,000 Documents</td>
                  <td className="py-3 px-3 text-emerald-800 font-bold">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-forest-900">Max File Size (Upload)</td>
                  <td className="py-3 px-3 text-slate-600">2 MB</td>
                  <td className="py-3 px-3 text-amber-700 font-bold">5 MB</td>
                  <td className="py-3 px-3 text-sky-700 font-bold">15 MB</td>
                  <td className="py-3 px-3 text-purple-700 font-bold">50 MB</td>
                  <td className="py-3 px-3 text-emerald-800 font-bold">100 MB</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-forest-900">Expenses & Budgets Suite</td>
                  <td className="py-3 px-3 text-slate-400">Not Included</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-forest-900">M-PESA SMS Auto-Parser</td>
                  <td className="py-3 px-3 text-slate-400">Not Included</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-forest-900">AI Document OCR Extraction</td>
                  <td className="py-3 px-3 text-slate-400">Not Included</td>
                  <td className="py-3 px-3 text-slate-400">Not Included</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-forest-900">Business & Employee Vault</td>
                  <td className="py-3 px-3 text-slate-400">Not Included</td>
                  <td className="py-3 px-3 text-slate-400">Not Included</td>
                  <td className="py-3 px-3 text-slate-400">Not Included</td>
                  <td className="py-3 px-3 text-slate-400">Not Included</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-forest-900">Cloud Sync & Multi-Device</td>
                  <td className="py-3 px-3 text-slate-400">Local Only</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-forest-900">View-Once Secure Sharing</td>
                  <td className="py-3 px-3 text-slate-400">Not Included</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-forest-900">Support Level</td>
                  <td className="py-3 px-3 text-slate-600">Community</td>
                  <td className="py-3 px-3 text-forest-800">Standard Email</td>
                  <td className="py-3 px-3 text-sky-800 font-semibold">Priority Email</td>
                  <td className="py-3 px-3 text-purple-800 font-semibold">Live Chat Priority</td>
                  <td className="py-3 px-3 text-emerald-800 font-bold">24/7 Dedicated Priority</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Frequently Asked Questions */}
      <div className="max-w-4xl mx-auto space-y-3">
        <h3 className="text-lg font-bold text-forest-900 mb-3 flex items-center gap-2">
          <HelpCircle size={18} className="text-amber-500" />
          <span>Frequently Asked Questions</span>
        </h3>
        <div className="space-y-2.5">
          {faqs.map((faq, idx) => {
            const isOpen = faqOpen === idx;
            return (
              <div key={idx} className="bg-white border border-sand-200 rounded-2xl overflow-hidden shadow-xs">
                <button
                  onClick={() => setFaqOpen(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left font-bold text-xs sm:text-sm text-forest-900 hover:bg-sand-50/60 transition-colors"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={16} className="text-forest-500" /> : <ChevronDown size={16} className="text-forest-500" />}
                </button>
                {isOpen && (
                  <div className="p-4 pt-0 text-xs text-forest-600 leading-relaxed border-t border-sand-100 bg-sand-50/30">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* M-PESA STK Push Modal */}
      {showMpesaModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative border border-sand-200">
            <button
              onClick={() => paymentStatus !== 'processing' && setShowMpesaModal(false)}
              disabled={paymentStatus === 'processing'}
              className="absolute top-4 right-4 text-forest-400 hover:text-forest-900 disabled:opacity-50 p-2 rounded-full hover:bg-sand-100 transition-all z-10"
            >
              <X size={20} />
            </button>

            <div className="p-8 pb-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Phone size={28} className="text-white" />
              </div>
              <h3 className="text-2xl font-display font-bold text-forest-900">{isAndroid ? 'Google Play Upgrade' : 'M-PESA Express Checkout'}</h3>
              <p className="text-forest-500 text-xs sm:text-sm mt-1.5">
                Upgrading to <strong className="text-forest-900">{selectedPlan.name}</strong> ({billingCycle}) {isAndroid && 'via Google Play'}
              </p>
              <div className="mt-3 inline-block px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-sm">
                Total: {billingCycle === 'yearly' ? selectedPlan.price.yearly : selectedPlan.price.monthly}
              </div>
            </div>

            <div className="p-8 pt-4">
              {paymentStatus === 'idle' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-forest-700 uppercase tracking-wider mb-2">
                      {isAndroid ? 'Confirm Google Account ID / Phone' : 'M-PESA Registered Phone Number'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-forest-900 font-bold text-base">+</span>
                      <input
                        type="tel"
                        autoFocus
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-8 pr-4 py-3.5 border border-sand-300 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 transition-all font-bold text-forest-900 text-lg tracking-wide"
                        placeholder="2547XXXXXXXX"
                      />
                    </div>
                    <p className="text-[11px] text-forest-400 mt-1.5">Format: 254712345678 or 0712345678</p>
                  </div>

                  <button
                    onClick={handleMpesaPay}
                    disabled={phoneNumber.length < 10}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/30 disabled:opacity-50 disabled:shadow-none transition-all text-base flex items-center justify-center gap-2"
                  >
                    <Zap size={18} />
                    <span>{isAndroid ? 'Proceed to Google Play' : 'Send STK Push Prompt'}</span>
                  </button>
                  <div className="w-full mt-6 flex flex-col items-center">
                    <p className="text-xs text-forest-500 font-bold mb-3 text-center">
                      Or pay with Google Pay<br/>
                      <span className="font-normal text-forest-400">(Converted to USD at ~130 KES/USD): ${((billingCycle === 'yearly' ? selectedPlan.price.yearlyNum : selectedPlan.price.monthlyNum) / 130).toFixed(2)}</span>
                    </p>
                    <GooglePayButton
                      environment="PRODUCTION"
                      paymentRequest={{
                        apiVersion: 2,
                        apiVersionMinor: 0,
                        allowedPaymentMethods: [
                          {
                            type: 'CARD',
                            parameters: {
                              allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                              allowedCardNetworks: ['MASTERCARD', 'VISA'],
                            },
                            tokenizationSpecification: {
                              type: 'PAYMENT_GATEWAY',
                              parameters: {
                                gateway: 'example',
                                gatewayMerchantId: 'exampleGatewayMerchantId',
                              },
                            },
                          },
                        ],
                        merchantInfo: {
                          merchantId: '12345678901234567890',
                          merchantName: 'Digital DocuFolio',
                        },
                        transactionInfo: {
                          totalPriceStatus: 'FINAL',
                          totalPriceLabel: 'Total',
                          totalPrice: ((billingCycle === 'yearly' ? selectedPlan.price.yearlyNum : selectedPlan.price.monthlyNum) / 130).toFixed(2),
                          currencyCode: 'USD',
                          countryCode: 'KE',
                        },
                      }}
                      onLoadPaymentData={paymentRequest => {
                        console.log('Success', paymentRequest);
                        setPaymentStatus('processing');
                        setTimeout(() => {
                           setPaymentStatus('success');
                           setTimeout(() => {
                             if (selectedPlan) {
                               onUpgrade(selectedPlan.id);
                             }
                             setShowMpesaModal(false);
                           }, 2200);
                        }, 2800);
                      }}
                      buttonColor="black"
                      buttonType="subscribe"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              )}

              {paymentStatus === 'processing' && (
                <div className="py-8 text-center animate-pulse space-y-3">
                  <Loader2 size={44} className="animate-spin text-emerald-500 mx-auto" />
                  <h4 className="font-bold text-forest-900 text-lg">Check Your Phone</h4>
                  <p className="text-forest-600 text-xs sm:text-sm max-w-xs mx-auto">
                    {isAndroid ? 'Opening Google Play Billing flow...' : `A Safaricom M-PESA prompt has been sent to +${phoneNumber}. Please enter your M-PESA PIN to authorize.`}
                  </p>
                </div>
              )}

              {paymentStatus === 'success' && (
                <div className="py-8 text-center animate-fadeIn space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                    <ShieldCheck size={36} />
                  </div>
                  <h4 className="font-bold text-forest-900 text-xl">Payment Successful!</h4>
                  <p className="text-forest-500 text-xs sm:text-sm">
                    Your subscription has been updated to <strong className="text-forest-900">{selectedPlan.name}</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Windows Download Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative border border-blue-200">
            <button
              onClick={() => setShowDownloadModal(false)}
              className="absolute top-4 right-4 text-forest-400 hover:text-forest-900 p-2 rounded-full hover:bg-sand-100 transition-all z-10"
            >
              <X size={20} />
            </button>

            <div className="p-8 pb-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-600/25">
                <Monitor size={30} className="text-white" />
              </div>
              <h3 className="text-2xl font-display font-bold text-forest-900">Digital DocuFolio for Windows</h3>
              <p className="text-forest-500 text-xs sm:text-sm mt-1">
                Version 2.4.0 • 64-bit Windows 10 & 11 • Direct Setup Installer
              </p>
            </div>

            <div className="p-8 pt-2 space-y-5">
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 space-y-2 text-xs text-blue-950">
                <div className="flex items-center gap-2 font-bold text-blue-900">
                  <CheckCircle2 size={16} className="text-blue-600" />
                  <span>What is included in the Desktop build:</span>
                </div>
                <ul className="space-y-1.5 text-blue-900/80 pl-6 list-disc">
                  <li>TWAIN/WIA scanner driver support for direct document feeds</li>
                  <li>AES-256 encrypted local SQLite database cache</li>
                  <li>System tray resident mode with background cloud sync</li>
                </ul>
              </div>

              <div className="p-4 bg-sand-50 rounded-2xl border border-sand-200 text-xs space-y-1">
                <div className="flex justify-between text-forest-500 font-mono">
                  <span>File:</span>
                  <span className="font-bold text-forest-800">DigitalDocuFolio-Setup-v2.4.0-x64.exe</span>
                </div>
                <div className="flex justify-between text-forest-500 font-mono">
                  <span>Size:</span>
                  <span className="font-bold text-forest-800">42.8 MB</span>
                </div>
                <div className="flex justify-between text-forest-500 font-mono">
                  <span>Architecture:</span>
                  <span className="font-bold text-forest-800">x64 (Intel/AMD)</span>
                </div>
              </div>

              <button
                onClick={() => {
                  triggerDownloadExe();
                  setShowDownloadModal(false);
                }}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/30 transition-all text-sm sm:text-base flex items-center justify-center gap-2.5"
              >
                <Download size={18} />
                <span>Start .exe Download Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Under Development Modal */}
      {showUnderDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden relative border border-amber-200">
            <button
              onClick={() => setShowUnderDevModal(false)}
              className="absolute top-4 right-4 text-forest-400 hover:text-forest-900 p-2 rounded-full hover:bg-sand-100 transition-all z-10"
            >
              <X size={20} />
            </button>
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 mx-auto flex items-center justify-center shadow-inner border border-amber-200">
                <div className="animate-spin text-amber-500">
                   <Loader2 size={30} />
                </div>
              </div>
              <h3 className="text-xl font-display font-bold text-forest-900">Under Development</h3>
              <p className="text-forest-500 text-sm">
                The Business tier features are currently under active development and optimization. Please check back later!
              </p>
              <button
                onClick={() => setShowUnderDevModal(false)}
                className="w-full py-3 mt-4 bg-sand-100 hover:bg-sand-200 text-forest-800 rounded-xl font-bold transition-all text-sm"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Windows Redirect Modal */}
      {showWindowsRedirectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative border border-blue-200 p-6 text-forest-900 space-y-4">
            <button
              onClick={() => setShowWindowsRedirectModal(false)}
              className="absolute top-4 right-4 text-forest-400 hover:text-forest-900 p-2 rounded-full hover:bg-sand-100 transition-all z-10"
            >
              <X size={20} />
            </button>

            <div className="text-center pt-2">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 mx-auto mb-3 flex items-center justify-center shadow-lg shadow-blue-600/25 text-white">
                <Monitor size={28} />
              </div>
              <h3 className="text-xl font-display font-bold text-forest-900">Windows Desktop Portal</h3>
              <p className="text-xs text-forest-500 mt-1 max-w-xs mx-auto">
                Get the official Windows app and updates at <strong className="text-forest-800">aeroscankenya.co.ke/docufolio</strong>
              </p>
            </div>

            {copySuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold text-center border border-emerald-200 animate-fadeIn">
                ✓ Link copied to clipboard successfully!
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button
                onClick={handleOpenInBrowser}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-md shadow-blue-600/25 transition-all text-sm flex items-center justify-center gap-2"
              >
                <ArrowRight size={16} />
                <span>Open Address in Browser</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full py-3.5 bg-sand-100 hover:bg-sand-200 text-forest-800 rounded-2xl font-bold transition-all text-sm flex items-center justify-center gap-2 border border-sand-200"
              >
                <FileText size={16} />
                <span>Copy Link</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Monetization;
