const fs = require('fs');
let code = fs.readFileSync('components/Settings.tsx', 'utf8');

// 1. Add Info to lucide imports
if (!code.includes('Info,')) {
    code = code.replace('HelpCircle,', 'HelpCircle,\n  Info,');
}

// 2. Add 'about' to activeTab state
const stateTarget = `const [activeTab, setActiveTab] = useState<'account' | 'plan' | 'notifications' | 'security' | 'support'>`;
if (code.includes(stateTarget)) {
    code = code.replace(stateTarget, `const [activeTab, setActiveTab] = useState<'account' | 'plan' | 'notifications' | 'security' | 'support' | 'about'>`);
}

// 3. Add the button in the sidebar
const supportButtonStr = `<button 
              onClick={() => setActiveTab('support')}
              className={\`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-left transition-colors \${activeTab === 'support' ? 'bg-white border border-sand-200 shadow-sm text-forest-900 font-bold' : 'hover:bg-sand-50 text-forest-600'}\`}
            >
              <HelpCircle size={18} className={activeTab === 'support' ? 'text-amber-600' : ''} />
              <span>Help & Support</span>
            </button>`;

const aboutButtonStr = `<button 
              onClick={() => setActiveTab('about')}
              className={\`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-left transition-colors \${activeTab === 'about' ? 'bg-white border border-sand-200 shadow-sm text-forest-900 font-bold' : 'hover:bg-sand-50 text-forest-600'}\`}
            >
              <Info size={18} className={activeTab === 'about' ? 'text-amber-600' : ''} />
              <span>About</span>
            </button>`;

if (code.includes(supportButtonStr) && !code.includes('setActiveTab(\'about\')')) {
    code = code.replace(supportButtonStr, supportButtonStr + '\n            ' + aboutButtonStr);
}

// 4. Add the about section rendering
const aboutSectionStr = `
            {activeTab === 'about' && (
              <div className="bg-white rounded-2xl border border-sand-200 shadow-sm p-8 text-center animate-fadeIn space-y-6">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-sky-600 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-6">
                    <Sparkles size={40} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-forest-900 mb-1">Digital DocuFolio</h2>
                  <p className="text-forest-500 text-sm font-medium">Version 2.4.0</p>
                </div>
                
                <div className="max-w-md mx-auto space-y-4 text-forest-600 text-sm">
                  <p>
                    Digital DocuFolio is your premium, offline-first personal document vault. 
                    Built with military-grade encryption and a beautiful interface, it helps you manage your sensitive 
                    documents, keep track of daily journals, and monitor expenses securely.
                  </p>
                  <p>
                    Developed with a focus on speed, privacy, and intuitive design, all your 
                    data remains fully within your control.
                  </p>
                </div>

                <div className="pt-6 border-t border-sand-100 flex flex-col items-center gap-2">
                  <p className="text-xs text-forest-400">&copy; 2026 Digital DocuFolio Inc. All rights reserved.</p>
                  <div className="flex gap-4 mt-2">
                    <a href="#" className="text-xs text-sky-600 hover:underline">Privacy Policy</a>
                    <a href="#" className="text-xs text-sky-600 hover:underline">Terms of Service</a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
`;

const endOfFileStr = `            )}
          </div>
        </div>
      )}
    </div>
  );
};`;

if (code.includes(endOfFileStr) && !code.includes('activeTab === \'about\'')) {
    code = code.replace(endOfFileStr, aboutSectionStr);
}

fs.writeFileSync('components/Settings.tsx', code);
