import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Toast } from '@capacitor/toast';

export interface DownloadResult {
  success: boolean;
  uri?: string;
  filename: string;
  error?: string;
}

/**
 * Extracts clean base64 data from various input types:
 * - base64 data URLs (data:...)
 * - Blob / File objects
 * - Object URLs (blob:...)
 * - Remote / Relative URLs (http://, https://, /...)
 * - Raw base64 strings
 */
async function extractBase64Data(source: string | Blob): Promise<string> {
  if (source instanceof Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.substring(result.indexOf(',') + 1));
      };
      reader.onerror = reject;
      reader.readAsDataURL(source);
    });
  }

  if (typeof source === 'string') {
    if (source.startsWith('data:')) {
      return source.substring(source.indexOf(',') + 1);
    }
    if (source.startsWith('blob:') || source.startsWith('http://') || source.startsWith('https://') || source.startsWith('/')) {
      const response = await fetch(source);
      const blob = await response.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.substring(result.indexOf(',') + 1));
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    // Assume raw base64 string
    return source;
  }

  throw new Error('Unsupported source format for download.');
}

/**
 * Universal download helper that works seamlessly across:
 * 1. Native Android Studio build (via Capacitor Filesystem + Native Share Sheet + Toast feedback)
 * 2. Mobile and desktop web browsers (via standard dynamic <a> tag download)
 * 3. Handles Blob, base64 data URL, blob URL, and remote endpoints.
 */
export const downloadFileHelper = async (
  source: string | Blob,
  filename: string,
  mimeType: string = 'application/octet-stream'
): Promise<DownloadResult> => {
  // Sanitize filename to prevent invalid characters in Android file systems
  const cleanFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');

  try {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      // 1. Extract base64 payload
      const base64Data = await extractBase64Data(source);

      // 2. Request storage permissions if needed (graceful check)
      try {
        const permStatus = await Filesystem.checkPermissions();
        if (permStatus.publicStorage === 'prompt' || permStatus.publicStorage === 'prompt-with-rationale') {
          await Filesystem.requestPermissions();
        }
      } catch (permErr) {
        // Scoped storage on modern Android versions does not require publicStorage permission
        console.debug('Storage permission check skipped:', permErr);
      }

      // 3. Write file to device: Try Documents directory first, fall back to Cache if restricted
      let savedFile: { uri: string };
      try {
        savedFile = await Filesystem.writeFile({
          path: cleanFilename,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true
        });
      } catch (docErr) {
        console.warn('Writing to Documents directory failed, writing to Cache directory:', docErr);
        savedFile = await Filesystem.writeFile({
          path: cleanFilename,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true
        });
      }

      // 4. Notify user via native Toast
      try {
        await Toast.show({
          text: `Saved ${cleanFilename} to device`,
          duration: 'short',
          position: 'bottom'
        });
      } catch (tErr) {
        // Non-critical if toast is unavailable
      }

      // 5. Open native Android Share / Save Sheet so user can choose target app (Downloads, Drive, Files, WhatsApp, etc.)
      try {
        await Share.share({
          title: cleanFilename,
          text: `Download ${cleanFilename}`,
          url: savedFile.uri,
          dialogTitle: `Save or open ${cleanFilename}`
        });
      } catch (shareErr: any) {
        // If user dismisses/cancels the share sheet, that is not an error — the file is already safely written to storage
        console.log('Native share dialog closed or completed:', shareErr);
      }

      return {
        success: true,
        uri: savedFile.uri,
        filename: cleanFilename
      };
    } else {
      // Browser / PWA environment
      let downloadUrl = '';
      let revokeUrl = false;

      if (source instanceof Blob) {
        downloadUrl = URL.createObjectURL(source);
        revokeUrl = true;
      } else if (typeof source === 'string') {
        if (source.startsWith('data:') || source.startsWith('blob:') || source.startsWith('http://') || source.startsWith('https://')) {
          downloadUrl = source;
        } else {
          // Raw base64 string
          downloadUrl = `data:${mimeType};base64,${source}`;
        }
      }

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = cleanFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      if (revokeUrl) {
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
      }

      return {
        success: true,
        filename: cleanFilename
      };
    }
  } catch (err: any) {
    console.error('Download helper error:', err);
    // If native write failed unexpectedly, try browser fallback as last resort
    try {
      if (typeof source === 'string' && (source.startsWith('http://') || source.startsWith('https://'))) {
        window.open(source, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = typeof source === 'string' ? source : URL.createObjectURL(source);
        a.download = cleanFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      return { success: true, filename: cleanFilename };
    } catch (fallbackErr) {
      alert(`Unable to save ${cleanFilename}. Please verify app storage permissions in device settings.`);
      return { success: false, filename: cleanFilename, error: String(err?.message || err) };
    }
  }
};
