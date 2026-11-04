const fs = require('fs');
let code = fs.readFileSync('components/Wallet.tsx', 'utf8');

const oldModalLink = `<a 
                   href={previewFile.url} 
                   download={previewFile.name}
                   onClick={(e) => e.stopPropagation()}
                   className="absolute bottom-8 text-white bg-white/10 hover:bg-white/20 backdrop-blur-md px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all"
               >
                   <Download size={18} /> Download Original File
               </a>`;

const newModalLink = `<div className="absolute bottom-8 flex gap-4">
                 <button 
                     onClick={(e) => { e.stopPropagation(); handleDownload(previewFile.url, previewFile.name, previewFile.type); }}
                     className="text-white bg-white/10 hover:bg-white/20 backdrop-blur-md px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all"
                 >
                     <Download size={18} /> Download
                 </button>
                 <button 
                     onClick={(e) => { e.stopPropagation(); handleDriveUpload(previewFile.url, previewFile.name, previewFile.type); }}
                     className="text-white bg-white/10 hover:bg-sky-500/50 backdrop-blur-md px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all"
                 >
                     <Cloud size={18} /> Save to Drive
                 </button>
               </div>`;

code = code.replace(oldModalLink, newModalLink);
fs.writeFileSync('components/Wallet.tsx', code);
