import React, { useState } from 'react';
import { UserProfile, StoredDocument, JournalEntry, Task, SubscriptionPlan } from '../types';
import { 
  LogOut, 
  Shield, 
  Bell, 
  Moon, 
  Smartphone, 
  HelpCircle,
  Info, 
  Maximize, 
  Minimize, 
  Cloud, 
  Loader2, 
  CheckCircle2, 
  Gem, 
  Calendar, 
  Play, 
  Mail, 
  Fingerprint, 
  Lock, 
  Sparkles,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Download,
  Video
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import Monetization from './Monetization';
import TutorialGuide from './TutorialGuide';

import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { checkAiBackendHealth, getApiBaseUrl } from '../api';

interface SettingsProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  profile: UserProfile;
  documents?: StoredDocument[];
  journalEntries?: JournalEntry[];
  tasks?: Task[];
  onUpgrade?: (plan: SubscriptionPlan) => void;
  onUpdateProfile?: (profile: UserProfile) => void;
  onReplaySplash?: () => void;
  onReplayTutorial?: () => void;
  initialTab?: 'account' | 'plan' | 'notifications' | 'security' | 'support';
}

const Settings: React.FC<SettingsProps> = ({ 
  profile, 
  isFullscreen, 
  onToggleFullscreen, 
  documents = [], 
  journalEntries = [], 
  tasks = [], 
  onUpgrade, 
  onUpdateProfile, 
  onReplaySplash, 
  onReplayTutorial,
  initialTab = 'account'
}) => {
  const [activeTab, setActiveTab] = useState<'account' | 'plan' | 'notifications' | 'security' | 'support' | 'about'>(initialTab);
  React.useEffect(() => { setActiveTab(initialTab); }, [initialTab]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const [logoError, setLogoError] = useState(false);
  const [aiTestStatus, setAiTestStatus] = useState<{ testing: boolean; result?: string; success?: boolean }>({ testing: false });

  const handleTestAiConnection = async () => {
    setAiTestStatus({ testing: true });
    try {
      const res = await checkAiBackendHealth();
      if (res.ok) {
        setAiTestStatus({ testing: false, success: true, result: `Connected! AI Backend engine is responsive (${res.url}).` });
      } else {
        setAiTestStatus({ testing: false, success: false, result: `Server issue: ${res.error}` });
      }
    } catch (e: any) {
      setAiTestStatus({ testing: false, success: false, result: `Failed: ${e.message}` });
    }
  };

  const isUnpaid = profile.subscriptionStatus === 'unpaid' || profile.subscriptionStatus === 'past_due';
  const getMonthsUnpaid = () => {
    if (!profile.lastPaymentDate || profile.subscriptionStatus === 'active') return 0;
    const lastPayment = new Date(profile.lastPaymentDate);
    const now = new Date();
    return (now.getFullYear() - lastPayment.getFullYear()) * 12 + now.getMonth() - lastPayment.getMonth();
  };
  const monthsUnpaid = getMonthsUnpaid();


  const handleSignOut = () => {
    signOut(auth).catch((error) => {
      console.error("Error signing out: ", error);
    });
  };

  const bufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const handleToggleBiometric = async () => {
    if (!onUpdateProfile) return;

    if (profile.biometricEnabled) {
      onUpdateProfile({ ...profile, biometricEnabled: false, biometricCredentialId: undefined });
      return;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await NativeBiometric.isAvailable();
        if (!result.isAvailable) {
          alert("Biometrics not available or not configured on this device.");
          return;
        }
        
        await NativeBiometric.verifyIdentity({
          reason: "Authenticate to enable Biometric Lock",
          title: "Enable Biometric Lock",
          subtitle: "Digital DocuFolio",
          description: "Verify your identity to lock the app."
        });
        
        onUpdateProfile({ 
          ...profile, 
          biometricEnabled: true, 
          biometricCredentialId: "native_capacitor" 
        });
        return;
      } catch (err: any) {
        alert(err.message || "Failed to setup native biometric lock. Please try again.");
        return;
      }
    }

    if (!window.PublicKeyCredential) {
      alert("Biometrics not supported on this browser/device.");
      return;
    }

    try {
      const challenge = window.crypto.getRandomValues(new Uint8Array(32));
      const userId = window.crypto.getRandomValues(new Uint8Array(16));

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Digital DocuFolio", id: window.location.hostname },
          user: {
            id: userId,
            name: profile.email || "user@example.com",
            displayName: profile.fullName || "User"
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          },
          timeout: 60000
        }
      }) as PublicKeyCredential;

      if (credential && credential.rawId) {
        onUpdateProfile({ 
          ...profile, 
          biometricEnabled: true, 
          biometricCredentialId: bufferToBase64(credential.rawId) 
        });
      }
    } catch (err: any) {
      if (err.message && err.message.includes("publickey-credentials-create")) {
        alert("Your browser restricts Biometric features inside the preview window. Please click the 'Open in New Tab' icon at the top right of the preview to enable Biometric Lock.");
      } else {
        alert(err.message || "Failed to setup biometric lock. Please try again.");
      }
    }
  };

  const handleConnectGoogleCalendar = () => {
    try {
      const google = (window as any).google;
      if (!google) throw new Error('Google Identity Services not loaded');

      const client = google.accounts.oauth2.initTokenClient({
        client_id: '393681011941-m5r8dpkm1cu82gs34kdvigbofmtet92e.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/calendar.events',
        callback: (response: any) => {
          if (response.error !== undefined) {
             console.error("Auth error", response);
             return;
          }
          if (onUpdateProfile) {
            onUpdateProfile({ ...profile, googleCalendarConnected: true });
          }
        },
      });
      client.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisconnectGoogleCalendar = () => {
    if (onUpdateProfile) {
      onUpdateProfile({ ...profile, googleCalendarConnected: false });
    }
  };

  const handleDriveBackup = () => {
    setIsBackingUp(true);
    setBackupMessage('Initializing Backup...');
    
    try {
      const google = (window as any).google;
      if (!google) {
        throw new Error('Google Identity Services not loaded');
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: '393681011941-m5r8dpkm1cu82gs34kdvigbofmtet92e.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: async (response: any) => {
          if (response.error !== undefined) {
             console.error("Auth error", response);
             setBackupMessage('Error: Authentication failed.');
             setIsBackingUp(false);
             return;
          }
          
          setBackupMessage('Uploading to Google Drive...');
          const token = response.access_token;
          
          // Prepare data
          const exportData = {
            profile,
            documents,
            journalEntries,
            tasks,
            exportDate: new Date().toISOString()
          };
          
          const fileContent = JSON.stringify(exportData, null, 2);
          const file = new Blob([fileContent], { type: 'application/json' });
          
          const metadata = {
            name: `Digital_Docufolio_Backup_${new Date().toISOString().split('T')[0]}.json`,
            mimeType: 'application/json'
          };
          
          const form = new FormData();
          form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
          form.append('file', file);
          
          try {
            const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`
              },
              body: form
            });
            
            if (res.ok) {
              setBackupMessage('Backup successful!');
            } else {
              const err = await res.json();
              console.error(err);
              setBackupMessage('Error: Failed to upload file.');
            }
          } catch(e) {
            console.error(e);
            setBackupMessage('Error: Upload request failed.');
          } finally {
            setIsBackingUp(false);
            setTimeout(() => setBackupMessage(''), 5000);
          }
        },
      });
      client.requestAccessToken();
    } catch(err) {
      console.error(err);
      setBackupMessage('Error: Could not start backup.');
      setIsBackingUp(false);
      setTimeout(() => setBackupMessage(''), 5000);
    }
  };

  const getPlanBadge = (plan?: SubscriptionPlan) => {
    switch (plan) {
      case SubscriptionPlan.PREMIUM:
        return { label: 'PREMIUM', bg: 'bg-amber-500 text-white' };
      case SubscriptionPlan.PRO:
        return { label: 'PRO', bg: 'bg-sky-500 text-white' };
      case SubscriptionPlan.ELITE:
        return { label: 'ELITE', bg: 'bg-purple-600 text-white' };
      case SubscriptionPlan.BUSINESS:
        return { label: 'BUSINESS', bg: 'bg-emerald-600 text-white' };
      case SubscriptionPlan.WINDOWS_INDIVIDUAL:
        return { label: 'WINDOWS INDIVIDUAL', bg: 'bg-blue-600 text-white' };
      case SubscriptionPlan.WINDOWS_BUSINESS:
        return { label: 'WINDOWS BUSINESS', bg: 'bg-indigo-600 text-white' };
      default:
        return { label: 'FREE BASIC', bg: 'bg-slate-100 text-slate-700 border border-slate-300' };
    }
  };

  const getPlanPrice = (plan?: SubscriptionPlan) => {
    switch (plan) {
      case SubscriptionPlan.PREMIUM:
        return 'KES 300/mo';
      case SubscriptionPlan.PRO:
        return 'KES 1,000/mo';
      case SubscriptionPlan.ELITE:
        return 'KES 2,000/mo';
      case SubscriptionPlan.BUSINESS:
        return 'KES 7,000/mo';
      case SubscriptionPlan.WINDOWS_INDIVIDUAL:
        return 'KES 1,500/mo';
      case SubscriptionPlan.WINDOWS_BUSINESS:
        return 'KES 2,500/mo';
      default:
        return 'Free';
    }
  };

  const planBadge = getPlanBadge(profile.plan);

  return (
    <div className="w-full animate-fadeIn pb-24 md:pb-8">
      
      {isUnpaid && (
        <div className={`max-w-5xl mx-auto mb-6 p-4 rounded-2xl border ${monthsUnpaid >= 3 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl ${monthsUnpaid >= 3 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
              <Shield size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                {monthsUnpaid >= 3 ? "CRITICAL: Account Scheduled for Deletion" : "Subscription Past Due"}
              </h3>
              <p className="text-sm mt-1">
                {monthsUnpaid >= 3 
                  ? "Your subscription has been unpaid for over 3 months. Your files are temporarily hidden, and your data is scheduled for auto-deletion. Please pay immediately to recover your data." 
                  : "Your subscription is past due. Your files have been temporarily hidden. Once paid, they can be instantly recovered."}
              </p>
              {activeTab !== 'plan' && (
                <button 
                  onClick={() => setActiveTab('plan')}
                  className={`mt-3 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${monthsUnpaid >= 3 ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
                >
                  View Plans & Renew
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Header Card with Brand Logo */}
      <div className="bg-white rounded-3xl border border-sand-200 shadow-sm p-6 mb-8 max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-forest-900">
                Digital DocuFolio
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${planBadge.bg}`}>
                {planBadge.label}
              </span>
            </div>
            <p className="text-forest-500 text-xs sm:text-sm mt-0.5">
              Secure Document Vault, Expense Tracking & Personal Journal • v2.4.0
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
              activeTab === 'plan'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                : 'bg-sand-100 hover:bg-sand-200 text-forest-800'
            }`}
          >
            <Gem size={16} />
            <span>Manage Plans</span>
          </button>
        </div>
      </div>

      {/* When Subscription Plan Tab is active, render full-width Monetization view */}
      {activeTab === 'plan' ? (
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setActiveTab('account')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-sand-50 border border-sand-200 rounded-xl text-forest-700 font-bold text-xs shadow-xs transition-all"
            >
              <ArrowLeft size={14} />
              <span>Back to Account Settings</span>
            </button>
          </div>
          
          <Monetization 
            currentPlan={profile.plan || SubscriptionPlan.BASIC}
            onUpgrade={onUpgrade || (() => {})}
          />
        </div>
      ) : (
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Navigation/Categories */}
          <div className="md:col-span-1 space-y-2">
            <button 
              onClick={() => setActiveTab('account')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-left transition-colors ${activeTab === 'account' ? 'bg-white border border-sand-200 shadow-sm text-forest-900 font-bold' : 'hover:bg-sand-50 text-forest-600'}`}
            >
              <Shield size={18} className={activeTab === 'account' ? 'text-amber-600' : ''} />
              <span>Account & Security</span>
            </button>
            <button 
              onClick={() => setActiveTab('plan')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-left transition-colors ${(activeTab as string) === 'plan' ? 'bg-white border border-sand-200 shadow-sm text-forest-900 font-bold' : 'hover:bg-sand-50 text-forest-600'}`}
            >
              <Gem size={18} className={(activeTab as string) === 'plan' ? 'text-amber-600' : ''} />
              <span>Subscription Plans</span>
            </button>
            <button 
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-left transition-colors ${activeTab === 'notifications' ? 'bg-white border border-sand-200 shadow-sm text-forest-900 font-bold' : 'hover:bg-sand-50 text-forest-600'}`}
            >
              <Bell size={18} className={activeTab === 'notifications' ? 'text-amber-600' : ''} />
              <span>Notifications</span>
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-left transition-colors ${activeTab === 'security' ? 'bg-white border border-sand-200 shadow-sm text-forest-900 font-bold' : 'hover:bg-sand-50 text-forest-600'}`}
            >
              <Fingerprint size={18} className={activeTab === 'security' ? 'text-amber-600' : ''} />
              <span>Biometrics & PIN</span>
            </button>
            <button 
              onClick={() => setActiveTab('support')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-left transition-colors ${activeTab === 'support' ? 'bg-white border border-sand-200 shadow-sm text-forest-900 font-bold' : 'hover:bg-sand-50 text-forest-600'}`}
            >
              <HelpCircle size={18} className={activeTab === 'support' ? 'text-amber-600' : ''} />
              <span>Help & Support</span>
            </button>
            <button 
              onClick={() => setActiveTab('about')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-left transition-colors ${activeTab === 'about' ? 'bg-white border border-sand-200 shadow-sm text-forest-900 font-bold' : 'hover:bg-sand-50 text-forest-600'}`}
            >
              <Info size={18} className={activeTab === 'about' ? 'text-amber-600' : ''} />
              <span>About</span>
            </button>
          </div>

          {/* Right Column: Settings Content */}
          <div className="md:col-span-2 space-y-6">
            {activeTab === 'account' && (
              <>
                {/* Account Details */}
                <div className="bg-white rounded-2xl border border-sand-200 shadow-sm p-6">
                  <h3 className="text-lg font-bold text-forest-900 mb-4">Account Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-forest-500 uppercase tracking-wider block mb-1">Email Address</label>
                      <p className="text-forest-900 font-medium">{profile.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-forest-500 uppercase tracking-wider block mb-1">Active Plan & Rate</label>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-forest-900 font-bold">{profile.plan || 'BASIC'}</p>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${planBadge.bg}`}>
                            {planBadge.label}
                          </span>
                          <span className="text-xs font-bold text-forest-700 bg-sand-100 px-2.5 py-0.5 rounded-md border border-sand-200">
                            {getPlanPrice(profile.plan)}
                          </span>
                        </div>
                        <button 
                          onClick={() => setActiveTab('plan')} 
                          className="text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1"
                        >
                          <span>Change Plan</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Appearance & Display */}
                <div className="bg-white rounded-2xl border border-sand-200 shadow-sm p-6 space-y-4">
                  <h3 className="text-lg font-bold text-forest-900 mb-2">Display Options</h3>
                  <div className="flex items-center justify-between pb-3 border-b border-sand-100">
                    <div>
                      <h4 className="font-bold text-forest-900 text-sm">Full Screen Mode</h4>
                      <p className="text-xs text-forest-500 mt-1">Expand the application to fill your entire screen.</p>
                    </div>
                    <button 
                      onClick={onToggleFullscreen}
                      className="p-2.5 bg-sand-50 border border-sand-200 rounded-xl text-forest-600 hover:text-amber-600 hover:border-amber-300 shadow-sm transition-all"
                      title="Toggle Full Screen"
                    >
                      {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>
                  </div>
                  {onReplaySplash && (
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <h4 className="font-bold text-forest-900 text-sm">Splash Intro Screen</h4>
                        <p className="text-xs text-forest-500 mt-1">Replay the brand logo and animation.</p>
                      </div>
                      <button 
                        onClick={onReplaySplash}
                        className="px-3.5 py-2 bg-sand-50 hover:bg-amber-50 border border-sand-200 hover:border-amber-300 rounded-xl text-forest-700 hover:text-amber-700 shadow-sm transition-all text-xs font-bold flex items-center gap-1.5"
                      >
                        <Play size={14} className="fill-current" />
                        <span>Replay Intro</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Data & Backup */}
                <div className="bg-white rounded-2xl border border-sand-200 shadow-sm p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-forest-900 mb-4">Data & Backup</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-forest-900 text-sm">Backup to Google Drive</h4>
                        <p className="text-xs text-forest-500 mt-1">Export a copy of your documents, journal, and tasks to your Google Drive.</p>
                        {backupMessage && (
                          <div className={`mt-2 text-xs flex items-center gap-1 ${backupMessage.includes('Error') ? 'text-red-600' : backupMessage.includes('successful') ? 'text-emerald-600' : 'text-forest-500'}`}>
                            {backupMessage.includes('successful') && <CheckCircle2 size={12} />}
                            {backupMessage}
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={handleDriveBackup}
                        disabled={isBackingUp}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-forest-900 hover:bg-forest-800 text-white rounded-xl font-bold transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
                      >
                        {isBackingUp ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} />}
                        {isBackingUp ? 'Backing Up...' : 'Save to Drive'}
                      </button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-sand-100">
                    <h3 className="text-lg font-bold text-forest-900 mb-4">Integrations</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-forest-900 text-sm">Google Calendar</h4>
                        <p className="text-xs text-forest-500 mt-1">Sync document expiry dates and appointments to your calendar with automatic reminders.</p>
                      </div>
                      {profile.googleCalendarConnected ? (
                        <button 
                          onClick={handleDisconnectGoogleCalendar}
                          className="flex items-center justify-center gap-2 px-4 py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl font-bold transition-colors text-sm whitespace-nowrap"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button 
                          onClick={handleConnectGoogleCalendar}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors text-sm whitespace-nowrap shadow-sm"
                        >
                          <Calendar size={16} />
                          <span>Connect Calendar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                  <h3 className="text-lg font-bold text-red-600 mb-2">Danger Zone</h3>
                  <p className="text-sm text-forest-600 mb-6">
                    Irreversible actions related to your account.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={handleSignOut}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition-colors text-sm"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-white rounded-2xl border border-sand-200 shadow-sm p-6 animate-fadeIn">
                <h3 className="text-lg font-bold text-forest-900 mb-4">Notification Preferences</h3>
                <p className="text-forest-500 text-sm mb-6">Manage how and when you receive alerts.</p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-sand-100">
                    <div>
                      <p className="font-bold text-forest-900 text-sm">Email Alerts</p>
                      <p className="text-xs text-forest-500">Receive summary reports via email.</p>
                    </div>
                    <div className="w-10 h-5 bg-amber-500 rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-sand-100">
                    <div>
                      <p className="font-bold text-forest-900 text-sm">Document Expiry</p>
                      <p className="text-xs text-forest-500">Get notified 30 days before documents expire.</p>
                    </div>
                    <div className="w-10 h-5 bg-amber-500 rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-bold text-forest-900 text-sm">Task Reminders</p>
                      <p className="text-xs text-forest-500">Daily digest of upcoming tasks.</p>
                    </div>
                    <div className="w-10 h-5 bg-sand-200 rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="bg-white rounded-2xl border border-sand-200 shadow-sm p-6 animate-fadeIn space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-forest-900 mb-2 flex items-center gap-2">
                    <Fingerprint size={20} className="text-sky-500" />
                    <span>Biometric Authentication</span>
                  </h3>
                  <p className="text-forest-500 text-sm mb-6">
                    Require FaceID or Fingerprint authentication when the application launches or returns from background.
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-sand-200 rounded-xl bg-sand-50/50">
                    <div>
                      <h4 className="font-bold text-forest-900 text-sm">Enable Biometric Lock</h4>
                      <p className="text-xs text-forest-500 mt-1">Use your device's built-in authenticator.</p>
                    </div>
                    <button
                      onClick={handleToggleBiometric}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
                        profile.biometricEnabled ? 'bg-sky-500' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          profile.biometricEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'support' && (
              <div className="bg-white rounded-2xl border border-sand-200 shadow-sm p-6 animate-fadeIn space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-forest-900 mb-2">App Tutorial</h3>
                  <p className="text-forest-500 text-sm mb-4">Need a refresher? Replay the welcome tour to learn about all the features.</p>
                  {onReplayTutorial && (
                    <button
                      onClick={onReplayTutorial}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold transition-colors text-sm"
                    >
                      <Play size={16} className="fill-current" />
                      <span>Replay Tutorial</span>
                    </button>
                  )}
                </div>

                <div className="pt-6 border-t border-sand-100">
                  <TutorialGuide />
                </div>

                <div className="pt-6 border-t border-sand-100">
                  <h3 className="text-lg font-bold text-forest-900 mb-2">Contact Support</h3>
                  <p className="text-forest-500 text-sm mb-6">Send a message to our support team at <span className="font-semibold text-forest-700">Support@aerscankenya.co.ke</span>.</p>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const subject = encodeURIComponent(formData.get('subject') as string);
                      const body = encodeURIComponent(formData.get('message') as string);
                      window.open(`mailto:Support@aerscankenya.co.ke?subject=${subject}&body=${body}`);
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-bold text-forest-700 mb-1.5 uppercase tracking-wider">Subject</label>
                      <input name="subject" required type="text" className="w-full px-4 py-2.5 rounded-xl border border-sand-200 bg-sand-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm outline-none" placeholder="How can we help?" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-forest-700 mb-1.5 uppercase tracking-wider">Message</label>
                      <textarea name="message" required rows={4} className="w-full px-4 py-2.5 rounded-xl border border-sand-200 bg-sand-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm outline-none resize-none" placeholder="Describe your issue or question..."></textarea>
                    </div>
                    <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-forest-900 hover:bg-forest-800 text-white rounded-xl font-bold transition-all shadow-sm">
                      <Mail size={16} />
                      <span>Send Message</span>
                    </button>
                  </form>
                </div>
              </div>
            )}
            {activeTab === 'about' && (
              <div className="bg-white rounded-2xl border border-sand-200 shadow-sm p-6 animate-fadeIn flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="w-32 h-32 md:w-48 md:h-48 mb-6 relative">
                  <img 
                     src="/splash_logo.png" 
                     alt="Digital DocuFolio Logo" 
                     onError={(e) => { e.currentTarget.src = 'https://lh3.googleusercontent.com/d/1P5lYaVSTowpvW3Ys5zO1GfwG06l1AJkV'; }}
                     className="w-full h-full object-contain drop-shadow-[0_10px_25px_rgba(0,112,243,0.2)]"
                  />
                </div>
                <h3 className="text-2xl font-bold text-forest-900 mb-1">Digital DocuFolio</h3>
                <p className="text-forest-500 text-sm mb-5 max-w-sm">
                  Your secure, offline-first digital portfolio. Managing your documents, finances, and journal securely.
                </p>

                <div className="w-full max-w-md bg-sand-50/80 rounded-2xl p-4 border border-sand-200 text-left space-y-3 mb-6">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-forest-600">Runtime Platform:</span>
                    <span className="font-bold text-forest-900 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {Capacitor.isNativePlatform() ? 'Android Native APK' : 'Web / PWA Application'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-forest-600">Package ID:</span>
                    <span className="font-mono text-forest-800 font-bold">com.docufolio.app</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-forest-600">AI Engine Endpoint:</span>
                    <span className="font-mono text-[10px] text-forest-700 truncate max-w-[200px]" title={getApiBaseUrl() || 'Relative /api'}>
                      {getApiBaseUrl() || 'Auto (Cloud Run Server)'}
                    </span>
                  </div>
                  
                  <div className="pt-2 border-t border-sand-200/60 flex flex-col gap-2">
                    <button
                      onClick={handleTestAiConnection}
                      disabled={aiTestStatus.testing}
                      className="w-full py-2 px-3 bg-forest-900 hover:bg-forest-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      {aiTestStatus.testing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-amber-400" />}
                      <span>{aiTestStatus.testing ? 'Checking Connection...' : 'Test AI Backend Connectivity'}</span>
                    </button>
                    {aiTestStatus.result && (
                      <p className={`text-[11px] font-semibold text-center ${aiTestStatus.success ? 'text-emerald-700' : 'text-red-600'}`}>
                        {aiTestStatus.result}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-xs font-medium text-forest-400 bg-sand-50 px-4 py-2 rounded-full border border-sand-200">
                  Version 2.4.0 • Android Studio Ready
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
