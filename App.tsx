import React, { useState, useEffect } from 'react';
import { AppView, UserProfile, StoredDocument, JournalEntry, Task, AppNotification, DocumentType, SubscriptionPlan, Expenditure, Budget, RecurringExpense, RelationType } from './types';
import { INITIAL_PROFILE } from './constants';
import TabNav from './components/TabNav';
import Profile from './components/Profile';
import BusinessProfile from './components/BusinessProfile';
import Wallet from './components/Wallet';
import Journal from './components/Journal';
import Reminders from './components/Reminders';
import Monetization from './components/Monetization';
import Settings from './components/Settings';
import Expenditures from './components/Expenditures';
import { Bell, LogIn, Mail, Sparkles, X, CheckCircle2, ShieldAlert, Fingerprint, ChevronRight, ScanFace, Lock, Delete, LogOut, Maximize, Minimize, Settings as SettingsIcon, User as UserIcon } from 'lucide-react';
import { AuthScreen } from './components/AuthScreen';
import { SplashScreen } from './components/SplashScreen';
import { Onboarding } from './components/Onboarding';
import { initDB, getOfflineDocuments, saveOfflineDocument, deleteOfflineDocument, queueSyncAction, processSyncQueue } from './idbSync';
import { ViewOnceViewer } from './components/ViewOnceViewer';
import { BiometricLock } from './components/BiometricLock';
import { auth, db } from './firebase';
import { onAuthStateChanged, type User, signOut } from 'firebase/auth';
import { doc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import { Joyride, Step, EventData, STATUS } from 'react-joyride';
import { scheduleDocumentExpiryNotifications, scheduleTaskNotifications, initNotificationClickListener } from './notificationService';
const cleanForFirestore = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

const App: React.FC = () => {
  // View State
  const [currentView, setCurrentView] = useState<AppView>(AppView.PROFILE);
  useEffect(() => {
    sessionStorage.setItem('modernFolio_view', currentView);
  }, [currentView]);
    const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.error(err));
      } else {
        document.exitFullscreen().catch(err => console.error(err));
      }
    } catch(err) {
       console.error("Fullscreen API not supported/allowed in this context.", err);
    }
  };
  const [shareToken, setShareToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('shareToken') || urlParams.get('token') || urlParams.get('viewOnce') || null;
  });
  const [showSplash, setShowSplash] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    return localStorage.getItem('folio_onboarding_done') === 'true';
  });
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  // App State
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  // UI State
  const [showNotifications, setShowNotifications] = useState(false);
  const [runTutorial, setRunTutorial] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && profile?.biometricEnabled) {
        setIsLocked(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [profile?.biometricEnabled]);
  useEffect(() => {
    if (user && profile?.biometricEnabled) {
      setIsLocked(true);
    }
  }, [user, profile?.biometricEnabled]);
  useEffect(() => {
    if (user && localStorage.getItem('folio_tutorial_done') !== 'true') {
      setRunTutorial(true);
    }
  }, [user]);
  const tutorialSteps: Step[] = [
    {
      target: '.nav-item-Profile',
      content: 'Your Account: Manage your personal details, subscription plan, and digital identity.',
      skipBeacon: true,
    },
    {
      target: '.nav-item-Wallet',
      content: 'Document Wallet: Securely store and organize all your important IDs, contracts, and certificates.',
    },
    {
      target: '.nav-item-Journal',
      content: 'Journal & Tasks: Keep personal notes, daily logs, and track your ongoing tasks.',
    },
    {
      target: '.nav-item-Reminders',
      content: 'Alerts: Never miss an expiry date. Your document and task alarms appear here.',
    },
    {
      target: '.nav-item-Expenses',
      content: 'Finance Tracker: Track your spending, manage budgets, and monitor recurring expenses.',
    },
    {
      target: '.tutorial-settings-btn',
      content: 'Settings: Adjust app preferences and manage your subscription plan here.',
    },
    {
      target: '.tutorial-notifications-btn',
      content: 'Notifications: Important alerts, like expiring documents, will show up here.',
    }
  ];
  const handleJoyrideCallback = (data: EventData) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem('folio_tutorial_done', 'true');
      setRunTutorial(false);
    }
  };
  // --- Persistence Logic ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      (window as any).currentUserUid = currentUser ? currentUser.uid : null;
      if (currentUser) processSyncQueue(currentUser.uid);
      if (!currentUser) {
        setProfile(INITIAL_PROFILE);
        setDocuments([]);
        setJournalEntries([]);
        setTasks([]);
        setNotifications([]);
        setExpenditures([]);
        setBudgets([]);
        setRecurringExpenses([]);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);
  useEffect(() => {
    if (user) {
      setCurrentView(AppView.PROFILE);
    }
  }, [user]);
  useEffect(() => {
    if (!user) return;
    const profileUnsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile({
          ...INITIAL_PROFILE,
          ...data,
        });
      }
    });
    // IDB offline-first sync logic for documents
    getOfflineDocuments().then(docs => {
      if (docs && docs.length > 0) {
        setDocuments(docs);
      }
    });

    const docsUnsub = onSnapshot(collection(db, 'users', user.uid, 'documents'), { includeMetadataChanges: true }, (snap) => {
      // Only sync down from server if we are not pending local writes to avoid overwriting optimistic UI
      if (!snap.metadata.hasPendingWrites) {
         const serverDocs = snap.docs.map(d => d.data() as StoredDocument);
         setDocuments(serverDocs);
         serverDocs.forEach(doc => saveOfflineDocument(doc));
      }
    });
    const journalUnsub = onSnapshot(collection(db, 'users', user.uid, 'journal'), (snap) => {
      setJournalEntries(snap.docs.map(d => d.data() as JournalEntry));
    });
    const tasksUnsub = onSnapshot(collection(db, 'users', user.uid, 'tasks'), (snap) => {
      setTasks(snap.docs.map(d => d.data() as Task));
    });
    const expendituresUnsub = onSnapshot(collection(db, 'users', user.uid, 'expenditures'), (snap) => {
      setExpenditures(snap.docs.map(d => d.data() as Expenditure));
    });
    const budgetsUnsub = onSnapshot(collection(db, 'users', user.uid, 'budgets'), (snap) => {
      setBudgets(snap.docs.map(d => d.data() as Budget));
    });
    const recurringUnsub = onSnapshot(collection(db, 'users', user.uid, 'recurring'), (snap) => {
      setRecurringExpenses(snap.docs.map(d => d.data() as RecurringExpense));
    });
    return () => {
      profileUnsub();
      docsUnsub();
      journalUnsub();
      tasksUnsub();
      expendituresUnsub();
      budgetsUnsub();
      recurringUnsub();
    };
  }, [user]);
  // Handlers
  const handleUpdateProfile = async (updated: UserProfile) => {
    // If plan changed, reset credits based on plan
    let newProfile = { ...updated };
    if (profile?.plan !== updated.plan || updated.aiCreditsTotal === undefined) {
      let credits = 10; // Basic
      if (updated.plan === SubscriptionPlan.PREMIUM) credits = 50;
      if (updated.plan === SubscriptionPlan.PRO) credits = 150;
      if (updated.plan === SubscriptionPlan.ELITE) credits = 500;
      if (updated.plan === SubscriptionPlan.BUSINESS) credits = 2000;
      newProfile.aiCreditsTotal = credits;
      // Only reset remaining if it's undefined or they changed plans
      if (profile?.plan !== updated.plan || updated.aiCreditsRemaining === undefined) {
         newProfile.aiCreditsRemaining = credits;
      }
    }
    setProfile(newProfile); // optimistic update
    if (user) await setDoc(doc(db, 'users', user.uid), cleanForFirestore(newProfile), { merge: true });
  };
  const handleUseAiCredit = (amount: number = 1): boolean => {
    if (!profile) return false;
    // Strictly require an active paid subscription
    const isPaidActive = Boolean(profile.plan && profile.plan !== SubscriptionPlan.BASIC && profile.subscriptionStatus === 'active');
    if (!isPaidActive) return false;

    const defaultTotal = profile.plan === SubscriptionPlan.BUSINESS ? 2000 : profile.plan === SubscriptionPlan.ELITE ? 500 : profile.plan === SubscriptionPlan.PRO ? 150 : profile.plan === SubscriptionPlan.PREMIUM ? 50 : 0;
    const remaining = profile.aiCreditsRemaining !== undefined ? profile.aiCreditsRemaining : defaultTotal;
    const total = profile.aiCreditsTotal !== undefined ? profile.aiCreditsTotal : defaultTotal;
    if (remaining >= amount) {
      const newProfile = {
        ...profile,
        aiCreditsRemaining: remaining - amount,
        aiCreditsTotal: total
      };
      setProfile(newProfile);
      if (user) setDoc(doc(db, 'users', user.uid), cleanForFirestore(newProfile), { merge: true });
      return true;
    }
    return false;
  };
  const handleAddDocument = async (docObj: StoredDocument) => {
    setDocuments(prev => [...prev, docObj]);
    await saveOfflineDocument(docObj);
    if (navigator.onLine) {
      if (user) await setDoc(doc(db, 'users', user.uid, 'documents', docObj.id), cleanForFirestore(docObj));
    } else {
      await queueSyncAction('ADD', docObj);
    }
  };
  const handleUpdateDocument = async (updatedDoc: StoredDocument) => {
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    await saveOfflineDocument(updatedDoc);
    if (navigator.onLine) {
      if (user) await setDoc(doc(db, 'users', user.uid, 'documents', updatedDoc.id), cleanForFirestore(updatedDoc));
    } else {
      await queueSyncAction('UPDATE', updatedDoc);
    }
  };
  const handleDeleteDocument = async (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    await deleteOfflineDocument(id);
    if (navigator.onLine) {
      if (user) await deleteDoc(doc(db, 'users', user.uid, 'documents', id));
    } else {
      await queueSyncAction('DELETE', id);
    }
  };
  const handleAddEntry = async (entry: JournalEntry) => {
    setJournalEntries(prev => {
      const filtered = prev.filter(e => e.id !== entry.id && e.date !== entry.date);
      return [...filtered, entry];
    });
    if (user) await setDoc(doc(db, 'users', user.uid, 'journal', entry.id), cleanForFirestore(entry));
  };
  const handleAddTask = async (task: Task) => {
    setTasks(prev => [...prev, task]);
    if (user) await setDoc(doc(db, 'users', user.uid, 'tasks', task.id), cleanForFirestore(task));
  };
  const handleUpdateTask = async (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    if (user) await setDoc(doc(db, 'users', user.uid, 'tasks', updatedTask.id), cleanForFirestore(updatedTask));
  };
  const handleDeleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (user) await deleteDoc(doc(db, 'users', user.uid, 'tasks', id));
  };
  const handleAddExpenditure = async (exp: Omit<Expenditure, 'id' | 'createdAt'>) => {
    const newExp: Expenditure = {
      ...exp,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    setExpenditures(prev => [...prev, newExp]);
    if (user) await setDoc(doc(db, 'users', user.uid, 'expenditures', newExp.id), cleanForFirestore(newExp));
  };
  const handleDeleteExpenditure = async (id: string) => {
    setExpenditures(prev => prev.filter(e => e.id !== id));
    if (user) await deleteDoc(doc(db, 'users', user.uid, 'expenditures', id));
  };
  const handleUpdateBudget = async (budget: Budget) => {
    setBudgets(prev => {
      const idx = prev.findIndex(b => b.id === budget.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = budget;
        return next;
      }
      return [...prev, budget];
    });
    if (user) await setDoc(doc(db, 'users', user.uid, 'budgets', budget.id), cleanForFirestore(budget));
  };
  const handleDeleteBudget = async (id: string) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
    if (user) await deleteDoc(doc(db, 'users', user.uid, 'budgets', id));
  };
  const handleAddRecurring = async (recurring: Omit<RecurringExpense, 'id' | 'createdAt'>) => {
    const next: RecurringExpense = {
      ...recurring,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    setRecurringExpenses(prev => [...prev, next]);
    if (user) await setDoc(doc(db, 'users', user.uid, 'recurring', next.id), cleanForFirestore(next));
  };
  const handleDeleteRecurring = async (id: string) => {
    setRecurringExpenses(prev => prev.filter(r => r.id !== id));
    if (user) await deleteDoc(doc(db, 'users', user.uid, 'recurring', id));
  };
  // --- Notification & Android System Alarm Logic ---
  useEffect(() => {
    initNotificationClickListener(() => {
      setCurrentView(AppView.REMINDERS);
    });
  }, []);

  useEffect(() => {
    scheduleDocumentExpiryNotifications(documents);
  }, [documents]);

  useEffect(() => {
    scheduleTaskNotifications(tasks);
  }, [tasks]);

  useEffect(() => {
    const checkExpiries = () => {
      const today = new Date();
      const newNotifications: AppNotification[] = [];
      documents.forEach(doc => {
        if (doc.expiryDate) {
          const expiry = new Date(doc.expiryDate);
          const diffTime = expiry.getTime() - today.getTime();
          const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const isBusiness = doc.relation === RelationType.BUSINESS || (doc.relation as string) === 'BUSINESS';
          const prefix = isBusiness ? '🏢 [Business] ' : '';
          if (days <= 30 && days >= 0) {
            newNotifications.push({
              id: `expiry-${doc.id}-${days}`,
              title: days === 0 ? `${prefix}Document Expires Today` : `${prefix}Document Expiring Soon`,
              message: `${doc.customName || doc.type} (${doc.ownerName}) expires in ${days} days.`,
              type: 'expiry',
              date: new Date().toISOString(),
              read: false
            });
          } else if (days < 0) {
             newNotifications.push({
              id: `expired-${doc.id}`,
              title: `${prefix}Document Expired`,
              message: `${doc.customName || doc.type} (${doc.ownerName}) has expired.`,
              type: 'expiry',
              date: new Date().toISOString(),
              read: false
            });
          }
        }
      });
      // Avoid duplicates based on ID
      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const uniqueNew = newNotifications.filter(n => !existingIds.has(n.id));
        // Trigger Phone/Browser Notification for new items
        if (uniqueNew.length > 0 && canNotify && NotificationAPI.permission === 'granted') {
             uniqueNew.forEach(n => {
                 try { new NotificationAPI(n.title, { body: n.message, icon: './favicon.ico' }); } catch (_) {}
             });
        }
        return [...uniqueNew, ...prev];
      });
    };
    // Browser notifications are not available in all Android WebViews.
    // Never touch Notification unless the API actually exists.
    const NotificationAPI = (globalThis as any).Notification;
    const canNotify = typeof NotificationAPI === 'function';
    if (canNotify && NotificationAPI.permission !== 'granted' && NotificationAPI.permission !== 'denied') {
        NotificationAPI.requestPermission().catch(() => {});
    }
    checkExpiries();
    const interval = setInterval(checkExpiries, 1000 * 60 * 60); // Check every hour
    return () => clearInterval(interval);
  }, [documents]);
  const markAsRead = (id: string) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };
  const handleNotificationItemClick = (notif: AppNotification) => {
      markAsRead(notif.id);
      setShowNotifications(false);
      setCurrentView(AppView.REMINDERS);
  };
  const clearNotifications = () => {
      setNotifications([]);
      setShowNotifications(false);
  };
    const unreadCount = notifications.filter(n => !n.read).length;

  const isUnpaid = profile?.subscriptionStatus === 'unpaid' || profile?.subscriptionStatus === 'past_due';

  React.useEffect(() => {
    if (isUnpaid && currentView !== AppView.PLANS && currentView !== AppView.SETTINGS) {
      setCurrentView(AppView.PLANS);
    }
  }, [isUnpaid, currentView]);

  if (shareToken) {
    return (
      <ViewOnceViewer
        token={shareToken}
        onExit={() => {
          window.history.replaceState({}, document.title, window.location.pathname);
          setShareToken(null);
        }}
      />
    );
  }
  if (!hasCompletedOnboarding) {
    return <Onboarding onComplete={() => setHasCompletedOnboarding(true)} />;
  }
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }
  if (authLoading) return <div className="h-[100dvh] flex items-center justify-center bg-[#f4f1eb]"><div className="w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <AuthScreen />;
  // --- View: Main Application ---



  
  
  const handleNavChange = (view: AppView) => {
    const isPaidActive = Boolean(profile?.plan && profile.plan !== SubscriptionPlan.BASIC && profile?.subscriptionStatus === 'active');
    if (view === AppView.EXPENDITURES && !isPaidActive) {
      alert("The Expense & Budget Tracker is a paid subscription feature (Starting at KES 300/mo for Premium). Please upgrade your plan to access it.");
      setCurrentView(AppView.PLANS);
      return;
    }
    if (isUnpaid) {
      alert('Please renew your subscription to access this feature.');
      setCurrentView(AppView.PLANS);
      return;
    }
    setCurrentView(view);
  };

  return (
    <>
      {isLocked && (
        <BiometricLock
          onUnlock={() => setIsLocked(false)}
          credentialId={profile?.biometricCredentialId}
        />
      )}
      <div className="h-[100dvh] w-full bg-slate-950 flex relative overflow-hidden font-sans text-slate-900 animate-fadeIn">
        {/* @ts-ignore */}
        <Joyride
        steps={tutorialSteps}
        run={runTutorial}
        continuous={true}
        showSkipButton={true}
        showProgress={true}
        styles={{
          buttonPrimary: {
            backgroundColor: '#0284c7',
          },
          tooltip: {
            zIndex: 1000,
          }
        }}
        callback={handleJoyrideCallback}
      />
      {/* Dynamic Digital Vault Ambient Mesh Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black -z-10" />
      <div className="absolute top-0 right-1/4 w-[700px] h-[700px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[130px] pointer-events-none translate-y-1/3" />
      {/* Main Layout */}
      <div className="relative z-10 w-full h-full flex flex-col md:flex-row ">
        {/* Navigation Sidebar */}
        <TabNav currentView={currentView} onChangeView={handleNavChange} profile={profile} />
        {/* Content Area */}
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col p-3 sm:p-5 lg:p-6 bg-slate-900/30">
          {/* Top Header Bar */}
          <div className="flex justify-between items-center mb-4 px-2">
            <div className="flex items-center gap-3">
                {profile.profileImage ? (
                  <img
                    src={profile.profileImage}
                    alt="Profile"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-sky-400/30 shadow-md"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-sky-400 flex items-center justify-center ring-2 ring-sky-400/20 shadow-sm">
                    <UserIcon size={20} />
                  </div>
                )}
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight flex items-center gap-2">
                    <span>{profile.fullName || 'Guest'}</span>
                  </h2>
                  <p className="text-slate-400 text-xs font-medium">Digital DocuFolio Vault</p>
                </div>
            </div>
            <div className="flex items-center gap-3 ml-auto">
                {/* Settings Toggle */}
                <button
                    onClick={() => setCurrentView(AppView.SETTINGS)}
                    className={`tutorial-settings-btn p-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-slate-300 hover:text-sky-300 hover:border-sky-400/40 shadow-sm transition-all backdrop-blur-md ${currentView === AppView.SETTINGS ? 'text-sky-300 border-sky-400 ring-2 ring-sky-400/30 bg-sky-500/20' : ''}`}
                    title="Settings"
                >
                    <SettingsIcon size={18} />
                </button>
                {/* Notifications */}
                <div className="relative tutorial-notifications-btn">
                    <button 
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="relative p-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-slate-300 hover:text-sky-300 hover:border-sky-400/40 shadow-sm transition-all backdrop-blur-md"
                    >
                       <Bell size={18} />
                       {unreadCount > 0 && (
                           <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 border-2 border-slate-900 rounded-full animate-pulse flex items-center justify-center text-[8px] font-bold text-white" />
                       )}
                    </button>
                    {/* Notification Dropdown */}
                    {showNotifications && (
                        <div className="absolute right-0 top-full mt-3 w-80 bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/15 z-50 overflow-hidden animate-fadeIn text-white">
                            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <h3 className="font-bold text-white text-sm">Notifications</h3>
                                {notifications.length > 0 && (
                                    <button onClick={clearNotifications} className="text-xs text-sky-400 hover:text-sky-300 underline">Clear All</button>
                                )}
                            </div>
                            <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400">
                                        <Bell size={32} className="mx-auto mb-2 opacity-30 text-sky-400" />
                                        <p className="text-xs">No new notifications</p>
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <div 
                                          key={notif.id} 
                                          onClick={() => handleNotificationItemClick(notif)}
                                          className={`p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${!notif.read ? 'bg-sky-500/10' : ''}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`mt-0.5 p-1.5 rounded-full ${notif.type === 'expiry' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                                                   {notif.type === 'expiry' ? <ShieldAlert size={14} /> : <CheckCircle2 size={14} />}
                                                </div>
                                                <div>
                                                    <p className={`text-sm ${!notif.read ? 'font-bold text-white' : 'font-medium text-slate-300'}`}>{notif.title}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{notif.message}</p>
                                                    <p className="text-[10px] text-slate-500 mt-2">{new Date(notif.date).toLocaleTimeString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </div>
          {/* Main Workspace Surface */}
          <div className="flex-1 w-full max-w-7xl mx-auto bg-slate-50 rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col relative overflow-hidden ring-1 ring-black/5">
             <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 sm:p-7 md:p-9 bg-slate-50/90">
               {currentView === AppView.PROFILE && profile.plan === SubscriptionPlan.BUSINESS && (
                 <BusinessProfile
                 profile={profile}
                 onUseAiCredit={handleUseAiCredit}
                  onUpdateProfile={handleUpdateProfile}
                  onReplaySplash={() => setShowSplash(true)} />
               )}
               {currentView === AppView.PROFILE && profile.plan !== SubscriptionPlan.BUSINESS && (
                 <Profile
                 profile={profile}
                 onUseAiCredit={handleUseAiCredit}
                  onUpdateProfile={handleUpdateProfile} />
               )}
               {currentView === AppView.WALLET && (
                 <Wallet
                   profile={profile}
                   onUseAiCredit={handleUseAiCredit}
                   documents={documents} 
                   currentPlan={profile.plan || SubscriptionPlan.BASIC}
                   onNavigateToPlans={() => setCurrentView(AppView.PLANS)}
                   onAddDocument={handleAddDocument} 
                   onUpdateDocument={handleUpdateDocument}
                   onDeleteDocument={handleDeleteDocument}
                 />
               )}
               {currentView === AppView.JOURNAL && (
                 <Journal
                   profile={profile}
                   onUseAiCredit={handleUseAiCredit}
                   entries={journalEntries}
                   tasks={tasks}
                   currentPlan={profile.plan || SubscriptionPlan.BASIC}
                   onNavigateToPlans={() => setCurrentView(AppView.PLANS)}
                   onAddEntry={handleAddEntry}
                   onAddTask={handleAddTask}
                   onUpdateTask={handleUpdateTask}
                   onDeleteTask={handleDeleteTask}
                 />
               )}
               {currentView === AppView.REMINDERS && (
                 <Reminders 
                   documents={documents}
                   tasks={tasks}
                   onUpdateDocument={handleUpdateDocument}
                   onUpdateTask={handleUpdateTask}
                 />
               )}
               {(currentView === AppView.SETTINGS || currentView === AppView.PLANS) && (
                 <Settings key={currentView} initialTab={currentView === AppView.PLANS ? 'plan' : 'account'} 
                   profile={profile}
                   documents={documents}
                   journalEntries={journalEntries}
                   tasks={tasks}
                   isFullscreen={isFullscreen}
                   onToggleFullscreen={toggleFullscreen}
                   onUpgrade={(plan) => {
                     handleUpdateProfile({ ...profile, plan, subscriptionStatus: "active", lastPaymentDate: new Date().toISOString() });
                     setTimeout(() => {
                       window.location.reload();
                     }, 800);
                   }}
                   onUpdateProfile={handleUpdateProfile}
                   onReplayTutorial={() => setRunTutorial(true)}
                   onRevisitOnboarding={() => setHasCompletedOnboarding(false)}
                 />
               )}
               {currentView === AppView.EXPENDITURES && (
                 <Expenditures
                   profile={profile}
                   onUseAiCredit={handleUseAiCredit}
                   expenditures={expenditures}
                   budgets={budgets}
                   recurringExpenses={recurringExpenses}
                   onAddExpenditure={handleAddExpenditure}
                   onDeleteExpenditure={handleDeleteExpenditure}
                   onUpdateBudget={handleUpdateBudget}
                   onDeleteBudget={handleDeleteBudget}
                   onAddRecurring={handleAddRecurring}
                   onDeleteRecurring={handleDeleteRecurring}
                   onNavigateToPlans={() => setCurrentView(AppView.PLANS)}
                 />
               )}
            </div>
          </div>
        </main>
      </div>
    </div>
    </>
  );
};
export default App;