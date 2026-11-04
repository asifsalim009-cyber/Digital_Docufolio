const fs = require('fs');
let code = fs.readFileSync('components/BiometricLock.tsx', 'utf8');

const importReplacement = `import { Fingerprint, Lock, ShieldAlert } from 'lucide-react';\nimport { Capacitor } from '@capacitor/core';\nimport { NativeBiometric } from '@capgo/capacitor-native-biometric';\n`;
code = code.replace(`import { Fingerprint, Lock, ShieldAlert } from 'lucide-react';`, importReplacement);

const unlockTarget = `  const handleUnlock = async () => {
    if (!window.PublicKeyCredential) {
      setError("Biometrics not supported on this browser.");
      return;
    }

    try {
      setIsAuthenticating(true);`;

const newUnlock = `  const handleUnlock = async () => {
    try {
      setIsAuthenticating(true);
      setError(null);

      if (Capacitor.isNativePlatform()) {
        try {
          await NativeBiometric.verifyIdentity({
            reason: "Authenticate to unlock",
            title: "Unlock Digital DocuFolio",
            subtitle: "Security Verification",
            description: "Verify your identity to access your portfolio."
          });
          onUnlock();
          return;
        } catch (err: any) {
          setError(err.message || "Biometric authentication failed.");
          setIsAuthenticating(false);
          return;
        }
      }

      if (!window.PublicKeyCredential) {
        setError("Biometrics not supported on this browser.");
        setIsAuthenticating(false);
        return;
      }`;

code = code.replace(unlockTarget, newUnlock);

fs.writeFileSync('components/BiometricLock.tsx', code);
