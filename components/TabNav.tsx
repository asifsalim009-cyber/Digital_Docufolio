import React, { useState } from 'react';
import { AppView, UserProfile } from '../types';
import { Bot } from 'lucide-react';
import { User, Wallet, BookOpen, BellRing, Receipt, ShieldCheck, Sparkles } from 'lucide-react';

interface TabNavProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  profile?: UserProfile | null;
}

const TabNav: React.FC<TabNavProps> = ({ currentView, onChangeView, profile }) => {
  const [imgError, setImgError] = useState(false);

  const navItems = [
    { view: AppView.PROFILE, icon: User, label: "Profile", badgeColor: "text-sky-400 group-hover:text-sky-300", activeBg: "bg-sky-500/20 text-white border-sky-400/40" },
    { view: AppView.WALLET, icon: Wallet, label: "Wallet", badgeColor: "text-blue-400 group-hover:text-blue-300", activeBg: "bg-blue-600/30 text-white border-blue-400/40" },
    { view: AppView.JOURNAL, icon: BookOpen, label: "Journal", badgeColor: "text-cyan-400 group-hover:text-cyan-300", activeBg: "bg-cyan-600/20 text-white border-cyan-400/40" },
    { view: AppView.REMINDERS, icon: BellRing, label: "Reminders", badgeColor: "text-rose-400 group-hover:text-rose-300", activeBg: "bg-rose-500/20 text-white border-rose-400/40" },
    { view: AppView.EXPENDITURES, icon: Receipt, label: "Expenses", badgeColor: "text-emerald-400 group-hover:text-emerald-300", activeBg: "bg-emerald-500/20 text-white border-emerald-400/40" },
  ];

  return (
    <nav className="md:w-72 md:h-full flex-shrink-0 flex md:flex-col justify-between md:justify-start glass-panel-dark md:border-r border-t md:border-t-0 border-white/10 order-2 md:order-1 relative z-20 pb-4 pt-2 md:pb-0 md:pt-0">
      
      {/* Logo Area */}
      <div className="hidden md:flex flex-col items-start px-6 py-8 border-b border-white/5">
        <div className="flex items-center gap-3 w-full">
          {!imgError ? (
            <img 
              src="/logo.png" 
              alt="Digital Docufolio Logo" 
              onError={() => setImgError(true)}
              className="w-11 h-11 object-contain rounded-xl drop-shadow-md bg-white/5 p-1 border border-white/10"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-sky-500/30 border border-white/20">
              <ShieldCheck size={24} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl text-white font-bold tracking-tight truncate flex items-center gap-1.5">
              <span>Digital DocuFolio</span>
            </h1>
            <p className="text-sky-300/80 text-xs font-medium truncate">Your Digital Documents</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex-1 flex md:flex-col justify-around md:justify-start md:px-3 md:pt-4 md:gap-1.5">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onChangeView(item.view)}
              className={`
                nav-item-${item.label.replace(/\s+/g, '-')} flex flex-col md:flex-row items-center md:gap-3.5 p-2 md:px-4 md:py-3 rounded-xl transition-all duration-200 group flex-1 md:flex-none md:w-full border
                ${isActive 
                  ? `${item.activeBg} shadow-lg shadow-black/20 ring-1 ring-white/10 font-semibold` 
                  : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-white'}
              `}
            >
              <item.icon 
                size={20} 
                className={`transition-all duration-200 ${isActive ? 'text-sky-400 scale-110' : item.badgeColor}`} 
              />
              <span className={`text-xs md:text-sm tracking-wide ${isActive ? 'text-white' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="hidden md:block ml-auto w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
              )}
            </button>
          );
        })}
      </div>

      
      {/* AI Credits Area */}
      {profile && (
         <div className="hidden md:flex mx-4 mb-4 mt-auto">
            <div className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 flex items-center justify-between shadow-sm">
               <div className="flex items-center gap-2">
                  <div className="bg-sky-500/20 p-1.5 rounded-lg text-sky-400">
                     <Bot size={16} />
                  </div>
                  <div>
                     <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">AI Credits</p>
                     <p className="text-sm font-bold text-white flex items-baseline gap-1">
                        {profile.aiCreditsRemaining !== undefined ? profile.aiCreditsRemaining : 10} 
                        <span className="text-xs text-slate-500 font-medium">/ {profile.aiCreditsTotal || 10}</span>
                     </p>
                  </div>
               </div>
            </div>
         </div>
      )}
      
      {/* Ecosystem Badges Footer */}
      <div className="hidden md:block px-5 py-6 text-slate-400 text-xs border-t border-white/5">
        <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold tracking-wider uppercase text-sky-400/90">
          <Sparkles size={13} />
          <span>Cloud & Multi-Device Sync</span>
        </div>
        <p className="text-[11px] text-slate-400/80 leading-relaxed">Always With You. Android &amp; Windows ready.</p>
      </div>
    </nav>
  );
};

export default TabNav;
