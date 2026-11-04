import React, { useState } from 'react';
import { 
  BookOpen, 
  FileText, 
  CreditCard, 
  Lock, 
  Monitor, 
  Lightbulb, 
  CheckCircle2, 
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

const chapters = [
  {
    id: 'vault',
    title: '1. Secure Document Vault',
    icon: <FileText size={20} />,
    iconStyle: 'text-blue-600',
    iconBgStyle: 'bg-blue-100 text-blue-600',
    description: 'Learn how to store, tag, and set expiry alerts for important files.',
    content: (
      <div className="space-y-4 text-sm text-forest-700">
        <p>The Document Vault is your encrypted digital filing cabinet. Use it to store IDs, contracts, and certificates securely.</p>
        
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-4">
          <h4 className="font-bold text-blue-900 flex items-center gap-2 mb-2">
            <Lightbulb size={16} className="text-blue-600" />
            <span>Example: Uploading a Passport</span>
          </h4>
          <ol className="list-decimal pl-5 space-y-2 text-blue-800">
            <li>Navigate to the <strong>Vault</strong> tab and tap the <strong>+ Upload Document</strong> button.</li>
            <li>Select your Passport PDF or scan it using your camera.</li>
            <li>Set the <strong>Category</strong> to "Identity".</li>
            <li><strong>Crucial Step:</strong> Set the <strong>Expiry Date</strong> to your passport's expiration (e.g., Jan 15, 2030).</li>
            <li><em>Result:</em> Digital DocuFolio will automatically email you 30 days before it expires, ensuring you never miss a renewal!</li>
          </ol>
        </div>
      </div>
    )
  },
  {
    id: 'expenses',
    title: '2. Expense & Budget Tracking',
    icon: <CreditCard size={20} />,
    iconStyle: 'text-emerald-600',
    iconBgStyle: 'bg-emerald-100 text-emerald-600',
    description: 'Automate your finances with M-PESA parsing and visual budgets.',
    content: (
      <div className="space-y-4 text-sm text-forest-700">
        <p>Track where every shilling goes. You can log expenses manually or paste SMS receipts for automatic categorization.</p>
        
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mt-4">
          <h4 className="font-bold text-emerald-900 flex items-center gap-2 mb-2">
            <Zap size={16} className="text-emerald-600" />
            <span>Example: M-PESA Auto-Parsing</span>
          </h4>
          <ul className="space-y-3 text-emerald-800">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
              <span><strong>The Action:</strong> You pay for groceries at Naivas and receive an M-PESA SMS.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
              <span><strong>The Input:</strong> Open the Wallet tab, click "Paste SMS", and paste: <em>"QKX9... Confirmed. Ksh 4,500 paid to Naivas Supermarket on 12/10/26..."</em></span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
              <span><strong>The Magic:</strong> The app instantly detects the amount (4,500), the vendor (Naivas), categorizes it as "Groceries", and deducts it from your monthly budget!</span>
            </li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'security',
    title: '3. Biometric & View-Once Security',
    icon: <Lock size={20} />,
    iconStyle: 'text-amber-600',
    iconBgStyle: 'bg-amber-100 text-amber-600',
    description: 'Keep prying eyes away from your sensitive data.',
    content: (
      <div className="space-y-4 text-sm text-forest-700">
        <p>Your financial and personal data is protected by military-grade AES-256 encryption. You can add an extra layer of physical security.</p>
        
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mt-4">
          <h4 className="font-bold text-amber-900 flex items-center gap-2 mb-2">
            <ShieldCheck size={16} className="text-amber-600" />
            <span>Example: Enabling FaceID / Fingerprint</span>
          </h4>
          <ol className="list-decimal pl-5 space-y-2 text-amber-800">
            <li>Go to <strong>Settings &gt; Biometrics & PIN</strong>.</li>
            <li>Toggle <strong>Enable Biometric Lock</strong>. Your browser/device will prompt you to scan your face or fingerprint.</li>
            <li><strong>The Result:</strong> If you leave the app idle or refresh the page, the screen will blur and lock. Your documents and wallet balances cannot be viewed until you authenticate again.</li>
          </ol>
        </div>
      </div>
    )
  },
  {
    id: 'windows',
    title: '4. Windows Desktop Integration',
    icon: <Monitor size={20} />,
    iconStyle: 'text-indigo-600',
    iconBgStyle: 'bg-indigo-100 text-indigo-600',
    description: 'Learn how the native offline .exe supercharges your workflow.',
    content: (
      <div className="space-y-4 text-sm text-forest-700">
        <p>The Windows version is designed for high-speed office environments where you need offline access and hardware scanner support.</p>
        
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mt-4">
          <h4 className="font-bold text-indigo-900 flex items-center gap-2 mb-2">
            <Monitor size={16} className="text-indigo-600" />
            <span>Example: Hardware Scanning</span>
          </h4>
          <p className="text-indigo-800 mb-2">Instead of taking photos with your phone, use your office scanner:</p>
          <ol className="list-decimal pl-5 space-y-2 text-indigo-800">
            <li>Place a stack of receipts in your physical scanner.</li>
            <li>Right-click the DocuFolio icon in your Windows System Tray and click <strong>"Quick Scan"</strong>.</li>
            <li>The app directly communicates with your scanner, crops the receipts, encrypts them locally, and syncs them to your mobile app automatically.</li>
          </ol>
        </div>
      </div>
    )
  }
];

const TutorialGuide: React.FC = () => {
  const [activeChapter, setActiveChapter] = useState(chapters[0].id);

  return (
    <div className="bg-white rounded-2xl border border-sand-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[400px]">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-1/3 bg-sand-50 border-b md:border-b-0 md:border-r border-sand-200 flex flex-col">
        <div className="p-4 border-b border-sand-200 bg-sand-100/50">
          <h3 className="font-display font-bold text-forest-900 flex items-center gap-2">
            <BookOpen size={18} className="text-amber-600" />
            <span>Interactive Masterclass</span>
          </h3>
          <p className="text-[11px] text-forest-500 mt-1 uppercase tracking-wider font-bold">Select a module to learn</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chapters.map((chapter) => {
            const isActive = activeChapter === chapter.id;
            return (
              <button
                key={chapter.id}
                onClick={() => setActiveChapter(chapter.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                  isActive 
                    ? 'bg-white shadow-sm border border-sand-200' 
                    : 'hover:bg-sand-100/80 border border-transparent'
                }`}
              >
                <div className={`mt-0.5 ${isActive ? chapter.iconStyle : 'text-forest-400'}`}>
                  {chapter.icon}
                </div>
                <div>
                  <div className={`font-bold text-sm ${isActive ? 'text-forest-900' : 'text-forest-600'}`}>
                    {chapter.title}
                  </div>
                  <div className={`text-xs mt-0.5 ${isActive ? 'text-forest-600' : 'text-forest-400 line-clamp-1'}`}>
                    {chapter.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full md:w-2/3 p-6 md:p-8 bg-white">
        {chapters.map((chapter) => (
          <div 
            key={chapter.id} 
            className={activeChapter === chapter.id ? 'block animate-fadeIn' : 'hidden'}
          >
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 shadow-inner ${chapter.iconBgStyle}`}>
              {chapter.icon}
            </div>
            <h2 className="text-2xl font-display font-bold text-forest-900 mb-2">
              {chapter.title}
            </h2>
            <p className="text-forest-500 mb-6 border-b border-sand-100 pb-4">
              {chapter.description}
            </p>
            
            <div className="prose prose-sm prose-forest">
              {chapter.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TutorialGuide;
