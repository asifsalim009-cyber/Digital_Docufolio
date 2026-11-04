const fs = require('fs');
let code = fs.readFileSync('components/Wallet.tsx', 'utf8');

const importsToAdd = `import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Media } from '@capacitor-community/media';
import { uploadToGoogleDrive } from '../drive';
`;
code = code.replace(`import { auth, db }`, importsToAdd + `import { auth, db }`);

// We'll create a handleDownload function
const handleDownloadFn = `  const handleDownload = async (url: string, filename: string, mimeType?: string) => {
    if (Capacitor.isNativePlatform()) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          // Check if it's an image
          if (mimeType && mimeType.startsWith('image/')) {
            // Save to photos
            const savedFile = await Filesystem.writeFile({
              path: filename,
              data: base64data.split(',')[1],
              directory: Directory.Cache
            });
            await Media.savePhoto({ path: savedFile.uri });
            alert('Saved to Photo Gallery!');
          } else {
            // Save to documents
            await Filesystem.writeFile({
              path: filename,
              data: base64data.split(',')[1],
              directory: Directory.Documents
            });
            alert('Saved to Documents!');
          }
        };
      } catch (err: any) {
        console.error('Download error:', err);
        alert('Failed to save file natively');
      }
    } else {
      // Web fallback
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDriveUpload = async (url: string, filename: string, mimeType?: string) => {
    try {
      await uploadToGoogleDrive(url, filename, mimeType || 'application/octet-stream');
      alert('Successfully saved to Google Drive!');
    } catch (err: any) {
      console.error(err);
      alert('Failed to upload to Google Drive.');
    }
  };
`;

code = code.replace(`  const [filterType, setFilterType]`, handleDownloadFn + `\n  const [filterType, setFilterType]`);

// Update the selected document download button
const oldDownloadLink = `<a 
                                  href={selectedDoc.files[0].url} 
                                  download={selectedDoc.files[0].name}
                                  className="flex-1 py-3 bg-white border border-sand-200 text-forest-900 rounded-xl font-bold text-sm hover:bg-sand-50 flex items-center justify-center gap-2 transition-all shadow-sm"
                                >
                                    <Download size={16} /> Download
                                </a>`;

const newDownloadLink = `<button 
                                  onClick={() => handleDownload(selectedDoc.files[0].url, selectedDoc.files[0].name, selectedDoc.files[0].type)}
                                  className="flex-1 py-3 bg-white border border-sand-200 text-forest-900 rounded-xl font-bold text-sm hover:bg-sand-50 flex items-center justify-center gap-2 transition-all shadow-sm"
                                >
                                    <Download size={16} /> Download
                                </button>
                                <button 
                                  onClick={() => handleDriveUpload(selectedDoc.files[0].url, selectedDoc.files[0].name, selectedDoc.files[0].type)}
                                  className="flex-1 py-3 bg-white border border-sand-200 text-sky-600 rounded-xl font-bold text-sm hover:bg-sand-50 flex items-center justify-center gap-2 transition-all shadow-sm"
                                >
                                    <Cloud size={16} /> Save to Drive
                                </button>`;

code = code.replace(oldDownloadLink, newDownloadLink);

// Add Cloud icon import
code = code.replace(`import { Plus, Search,`, `import { Plus, Search, Cloud,`);

fs.writeFileSync('components/Wallet.tsx', code);
