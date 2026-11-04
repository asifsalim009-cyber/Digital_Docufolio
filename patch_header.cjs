const fs = require('fs');

// 1. App.tsx changes
let appCode = fs.readFileSync('App.tsx', 'utf8');

// Replace imports to include Settings as SettingsIcon
appCode = appCode.replace(
  /import \{ Bell, LogIn, Mail, Sparkles, X, CheckCircle2, ShieldAlert, Fingerprint, ChevronRight, ScanFace, Lock, Delete, LogOut, Maximize, Minimize \} from 'lucide-react';/,
  "import { Bell, LogIn, Mail, Sparkles, X, CheckCircle2, ShieldAlert, Fingerprint, ChevronRight, ScanFace, Lock, Delete, LogOut, Maximize, Minimize, Settings as SettingsIcon } from 'lucide-react';"
);

// Add settings button next to fullscreen and notifications
const searchStr = `{/* Notifications */}`;
const replaceStr = `{/* Settings Toggle */}
                <button
                    onClick={() => setCurrentView(AppView.SETTINGS)}
                    className={\`p-2.5 bg-white border border-sand-200 rounded-full text-forest-600 hover:text-gold-600 hover:border-gold-300 shadow-sm transition-all \${currentView === AppView.SETTINGS ? 'text-gold-600 border-gold-300 ring-2 ring-gold-500/20' : ''}\`}
                    title="Settings"
                >
                    <SettingsIcon size={20} />
                </button>
                
                {/* Notifications */}`;

appCode = appCode.replace(searchStr, replaceStr);
fs.writeFileSync('App.tsx', appCode);

// 2. TabNav.tsx changes
let navCode = fs.readFileSync('components/TabNav.tsx', 'utf8');
navCode = navCode.replace(/    \{ view: AppView\.SETTINGS, icon: Settings, label: "Settings" \},\n/, '');
// also remove Settings from import just to be clean
navCode = navCode.replace(/, Settings \} from 'lucide-react';/, "} from 'lucide-react';");
fs.writeFileSync('components/TabNav.tsx', navCode);

