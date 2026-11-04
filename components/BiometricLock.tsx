import React, { useState, useEffect } from 'react';
import { Fingerprint, Lock, ShieldAlert } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';


interface BiometricLockProps {
  onUnlock: () => void;
  onCancel?: () => void;
  credentialId?: string;
}

export const BiometricLock: React.FC<BiometricLockProps> = ({ onUnlock, onCancel, credentialId }) => {
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const base64ToBuffer = (base64: string): ArrayBuffer => {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const handleUnlock = async () => {
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
      }
      setError(null);

      const challenge = window.crypto.getRandomValues(new Uint8Array(32));
      
      const allowCredentials = credentialId ? [{
        type: "public-key" as const,
        id: base64ToBuffer(credentialId),
      }] : [];

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
          userVerification: "required",
          timeout: 60000
        }
      });

      if (credential) {
        onUnlock();
      } else {
        setError("Authentication failed.");
      }
    } catch (err: any) {
      if (err.message && err.message.includes("publickey-credentials-get")) {
        setError("Browser restricts Biometrics in preview. Please open in a new tab.");
      } else if (err.name === 'NotAllowedError') {
        setError("Biometric authentication was cancelled.");
      } else {
        setError(err.message || "Authentication failed. Please try again.");
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Auto trigger unlock when screen appears
  useEffect(() => {
    const timer = setTimeout(() => {
      handleUnlock();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col items-center justify-center p-6 text-white backdrop-blur-xl">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-900/20 via-slate-950 to-black pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full animate-fadeIn">
        <div className="w-24 h-24 bg-sky-500/10 rounded-full flex items-center justify-center mb-8 border border-sky-500/30 shadow-[0_0_50px_rgba(14,165,233,0.2)]">
          <Lock size={40} className="text-sky-400" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">App Locked</h1>
        <p className="text-slate-400 text-center mb-10">
          Digital DocuFolio is secured. Use your FaceID or Fingerprint to unlock.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 w-full">
            <ShieldAlert size={18} className="text-rose-400 mt-0.5 shrink-0" />
            <p className="text-sm text-rose-300">{error}</p>
          </div>
        )}

        <button
          onClick={handleUnlock}
          disabled={isAuthenticating}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <Fingerprint size={20} />
          {isAuthenticating ? "Verifying..." : "Unlock Application"}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-4 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
