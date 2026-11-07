import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const downloadFileHelper = async (url: string, filename: string, mimeType: string = 'application/octet-stream') => {
  try {
    if (Capacitor.isNativePlatform()) {
      if (url.startsWith('data:')) {
        const base64Data = url.split(',')[1] || url;
        const savedFile = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Documents,
        });
        await Share.share({
          title: filename,
          text: `Download ${filename}`,
          url: savedFile.uri,
          dialogTitle: `Download ${filename}`
        });
      } else {
        window.open(url, '_blank');
      }
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch (err) {
    console.error("Download helper error:", err);
    try {
      window.open(url, '_blank');
    } catch (e) {
      alert("Unable to download file automatically. Please check permissions.");
    }
  }
};
