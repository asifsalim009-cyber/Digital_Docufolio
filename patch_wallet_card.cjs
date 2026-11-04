const fs = require('fs');
let code = fs.readFileSync('components/Wallet.tsx', 'utf8');

// 1. Update imports
const newImports = `import { Plus, Search, FileText, Calendar, User, X, UploadCloud, Trash2, ExternalLink, RefreshCw, AlertCircle, ChevronRight, Sparkles, Loader2, Users, Download, Eye, Image as ImageIcon, ChevronDown, ChevronUp, Mic, MicOff, ArrowLeft, Save, Briefcase, Lock, Share2, Landmark, GraduationCap, HeartPulse, Car, WalletCards, ShieldCheck, Building2 } from 'lucide-react';`;
code = code.replace(/import { Plus, Search.*from 'lucide-react';/, newImports);

// 2. Define the helper logic inside the DocumentCard function, or right above it.
const cardStartRegex = /const DocumentCard: React.FC<\{ doc: StoredDocument \}> = \(\{ doc \}\) => \{/;

const newCardStr = `
  const getDocumentCategoryMeta = (type: DocumentType | string) => {
    switch(type) {
      case DocumentType.ID_CARD:
      case DocumentType.PASSPORT:
      case DocumentType.KRA_PIN:
      case DocumentType.BIRTH_CERTIFICATE:
      case DocumentType.TAX_CERTIFICATE:
        return { icon: Landmark, color: 'text-indigo-600', bg: 'bg-indigo-100', gradient: 'from-indigo-500 to-blue-600' };
      
      case DocumentType.STUDENTS_CARD:
        return { icon: GraduationCap, color: 'text-amber-600', bg: 'bg-amber-100', gradient: 'from-amber-400 to-orange-500' };
        
      case DocumentType.MEDICAL_INSURANCE:
      case DocumentType.HOSPITAL_CARD:
        return { icon: HeartPulse, color: 'text-rose-600', bg: 'bg-rose-100', gradient: 'from-rose-400 to-red-500' };
        
      case DocumentType.DRIVERS_LICENSE:
      case DocumentType.VEHICLE_INSURANCE:
      case DocumentType.VEHICLE_DETAILS:
        return { icon: Car, color: 'text-emerald-600', bg: 'bg-emerald-100', gradient: 'from-emerald-400 to-teal-600' };
        
      case DocumentType.BUSINESS_LICENSE:
      case DocumentType.INCORPORATION_CERTIFICATE:
      case DocumentType.EMPLOYMENT_CARD:
      case DocumentType.STAFF_DETAILS:
        return { icon: Building2, color: 'text-sky-600', bg: 'bg-sky-100', gradient: 'from-sky-500 to-blue-700' };
        
      case DocumentType.SHOPPING_CARD:
      case DocumentType.REWARD_CARD:
      case DocumentType.CONTRACT:
      case DocumentType.ASSET_RECORD:
        return { icon: WalletCards, color: 'text-purple-600', bg: 'bg-purple-100', gradient: 'from-purple-500 to-fuchsia-600' };
        
      default:
        return { icon: ShieldCheck, color: 'text-slate-600', bg: 'bg-slate-100', gradient: 'from-slate-600 to-slate-800' };
    }
  };

  const DocumentCard: React.FC<{ doc: StoredDocument }> = ({ doc }) => {
     const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();
     const meta = getDocumentCategoryMeta(doc.type);
     const Icon = meta.icon;

     return (
        <div 
            onClick={() => setSelectedDoc(doc)}
            className="group bg-white rounded-3xl border border-sand-200 shadow-sm hover:shadow-xl hover:border-gold-300 transition-all cursor-pointer relative overflow-hidden flex flex-col h-56 p-5 ring-1 ring-black/5"
        >
            {/* Elegant Gradient Header */}
            <div className={\`absolute top-0 left-0 w-full h-24 bg-gradient-to-br \${meta.gradient} opacity-90\`} />
            
            {/* Top Bar with Icon & Actions */}
            <div className="relative z-10 flex justify-between items-start mb-auto">
                 <div className={\`w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-md \${meta.color} ring-1 ring-black/5\`}>
                    <Icon size={24} strokeWidth={1.5} />
                 </div>
                 
                 <div className="flex items-center gap-1.5">
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       setSharingDoc(doc);
                     }}
                     className="bg-white/90 hover:bg-white text-forest-800 hover:text-gold-600 backdrop-blur-md p-2 rounded-xl shadow-sm transition-all border border-sand-100"
                     title="Share Document (View Once)"
                   >
                     <Share2 size={14} />
                   </button>
                 </div>
            </div>

            {/* Bottom Content Area */}
            <div className="relative z-10 mt-6 pt-2">
                <p className={\`text-[10px] font-bold uppercase tracking-wider mb-1 opacity-90 truncate \${meta.color}\`}>
                    {doc.type === DocumentType.OTHER_DOCUMENT ? (doc.customType || 'Document') : doc.type}
                </p>
                <h3 className="font-display font-bold text-lg leading-tight mb-3 truncate text-forest-900">
                    {doc.customName || doc.type}
                </h3>
                
                <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="flex items-center gap-1 bg-sand-100 text-forest-700 px-2.5 py-1 rounded-lg">
                        <Users size={12} /> {doc.ownerName}
                    </span>
                    {doc.expiryDate && (
                        <span className={\`flex items-center gap-1 px-2.5 py-1 rounded-lg \${isExpired ? 'bg-red-50 text-red-600 ring-1 ring-red-200' : 'bg-sand-100 text-forest-600'}\`}>
                            {isExpired ? <AlertCircle size={12} /> : <Calendar size={12} />} 
                            {isExpired ? 'Expired' : \`Exp: \${doc.expiryDate}\`}
                        </span>
                    )}
                </div>
            </div>
            
            {/* Hover Action Gradient overlay */}
            <div className="absolute inset-0 bg-forest-900/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
     );
  };
`;

code = code.replace(/const DocumentCard: React\.FC<\{ doc: StoredDocument \}> = \(\{ doc \}\) => \{[\s\S]*?return \([\s\S]*?<\/div>\s*\);\s*\};/m, newCardStr);

fs.writeFileSync('components/Wallet.tsx', code);
