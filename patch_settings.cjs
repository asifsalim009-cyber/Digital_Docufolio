const fs = require('fs');
let code = fs.readFileSync('components/Settings.tsx', 'utf8');

// Update imports for lucide-react if needed
code = code.replace(
  /import \{ LogOut, Shield, Bell, Moon, Smartphone, HelpCircle \} from 'lucide-react';/,
  "import { LogOut, Shield, Bell, Moon, Smartphone, HelpCircle, Maximize, Minimize } from 'lucide-react';"
);

// Update interface
code = code.replace(
  /interface SettingsProps \{/,
  "interface SettingsProps {\n  isFullscreen?: boolean;\n  onToggleFullscreen?: () => void;"
);

// Update component props
code = code.replace(
  /const Settings: React\.FC<SettingsProps> = \(\{ profile \}\) => \{/,
  "const Settings: React.FC<SettingsProps> = ({ profile, isFullscreen, onToggleFullscreen }) => {"
);

// Add Appearance Section before Danger Zone
const dangerZonePos = code.indexOf('{/* Danger Zone */}');
code = code.slice(0, dangerZonePos) + 
`{/* Appearance & Display */}
          <div className="bg-white rounded-2xl border border-sand-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-forest-900 mb-4">Display Options</h3>
            <div className="flex items-center justify-between">
               <div>
                  <h4 className="font-bold text-forest-900 text-sm">Full Screen Mode</h4>
                  <p className="text-xs text-forest-500 mt-1">Expand the application to fill your entire screen.</p>
               </div>
               <button 
                  onClick={onToggleFullscreen}
                  className="p-2.5 bg-sand-50 border border-sand-200 rounded-xl text-forest-600 hover:text-gold-600 hover:border-gold-300 shadow-sm transition-all"
                >
                  {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
               </button>
            </div>
          </div>

          ` + code.slice(dangerZonePos);

fs.writeFileSync('components/Settings.tsx', code);
