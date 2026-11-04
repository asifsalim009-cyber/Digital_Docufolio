const fs = require('fs');
let code = fs.readFileSync('components/Settings.tsx', 'utf8');

const importReplacement = `import { Capacitor } from '@capacitor/core';\nimport { NativeBiometric } from '@capgo/capacitor-native-biometric';\n\ninterface SettingsProps`;
code = code.replace(`interface SettingsProps`, importReplacement);

const toggleTarget = `  const handleToggleBiometric = async () => {
    if (!onUpdateProfile) return;

    if (profile.biometricEnabled) {
      onUpdateProfile({ ...profile, biometricEnabled: false, biometricCredentialId: undefined });
      return;
    }`;

const newToggle = `  const handleToggleBiometric = async () => {
    if (!onUpdateProfile) return;

    if (profile.biometricEnabled) {
      onUpdateProfile({ ...profile, biometricEnabled: false, biometricCredentialId: undefined });
      return;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await NativeBiometric.isAvailable();
        if (!result.isAvailable) {
          alert("Biometrics not available or not configured on this device.");
          return;
        }
        
        await NativeBiometric.verifyIdentity({
          reason: "Authenticate to enable Biometric Lock",
          title: "Enable Biometric Lock",
          subtitle: "Digital DocuFolio",
          description: "Verify your identity to lock the app."
        });
        
        onUpdateProfile({ 
          ...profile, 
          biometricEnabled: true, 
          biometricCredentialId: "native_capacitor" 
        });
        return;
      } catch (err: any) {
        alert(err.message || "Failed to setup native biometric lock. Please try again.");
        return;
      }
    }`;

code = code.replace(toggleTarget, newToggle);

fs.writeFileSync('components/Settings.tsx', code);
