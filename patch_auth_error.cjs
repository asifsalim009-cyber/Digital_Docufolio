const fs = require('fs');
let code = fs.readFileSync('components/AuthScreen.tsx', 'utf8');

code = code.replace(
  /catch \(err: any\) \{[\s\S]*?setError\(err\.message \|\| 'Authentication failed'\);/,
  `catch (err: any) {
      console.error("Login Error:", err);
      let errorMsg = err.message || 'Authentication failed';
      if (errorMsg.includes('unauthorized-domain')) {
          errorMsg = "Domain not authorized. Please add this URL to your Firebase Console -> Authentication -> Settings -> Authorized Domains.";
      } else if (errorMsg.includes('popup-blocked') || errorMsg.includes('popup-closed-by-user')) {
          errorMsg = "Popup was blocked or closed. Please allow popups or try opening the app in a new tab.";
      } else if (errorMsg.includes('operation-not-allowed')) {
          errorMsg = "Google Sign-In is not enabled. Please enable it in the Firebase Console.";
      }
      setError(errorMsg);`
);

fs.writeFileSync('components/AuthScreen.tsx', code);
