export const uploadToGoogleDrive = async (fileUrl: string, fileName: string, mimeType: string) => {
  return new Promise((resolve, reject) => {
    try {
      const google = (window as any).google;
      if (!google) throw new Error('Google Identity Services not loaded');

      const client = google.accounts.oauth2.initTokenClient({
        client_id: '393681011941-m5r8dpkm1cu82gs34kdvigbofmtet92e.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: async (response: any) => {
          if (response.error !== undefined) {
            reject(response);
          }
          
          try {
            // Fetch the file as a blob
            const fileRes = await fetch(fileUrl);
            const blob = await fileRes.blob();
            
            // Create multipart request for Google Drive
            const metadata = {
              name: fileName,
              mimeType: mimeType || blob.type || 'application/octet-stream',
            };
            
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', blob);
            
            const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
              method: 'POST',
              headers: {
                Authorization: 'Bearer ' + response.access_token,
              },
              body: form,
            });
            
            if (!uploadRes.ok) {
               const err = await uploadRes.json();
               throw new Error(err.error?.message || 'Failed to upload to Drive');
            }
            
            const data = await uploadRes.json();
            resolve(data);
          } catch (e) {
            reject(e);
          }
        },
      });
      client.requestAccessToken();
    } catch (e) {
      reject(e);
    }
  });
};
