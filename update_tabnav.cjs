const fs = require('fs');
let code = fs.readFileSync('components/TabNav.tsx', 'utf8');

code = code.replace(
  `import { AppView } from '../types';`,
  `import { AppView, UserProfile } from '../types';\nimport { Bot } from 'lucide-react';`
);

code = code.replace(
  `interface TabNavProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
}`,
  `interface TabNavProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  profile?: UserProfile | null;
}`
);

code = code.replace(
  `const TabNav: React.FC<TabNavProps> = ({ currentView, onChangeView }) => {`,
  `const TabNav: React.FC<TabNavProps> = ({ currentView, onChangeView, profile }) => {`
);

const creditDisplayStr = `
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
      
      {/* Ecosystem Badges Footer */}`;

code = code.replace(
  `{/* Ecosystem Badges Footer */}`,
  creditDisplayStr
);

fs.writeFileSync('components/TabNav.tsx', code);
