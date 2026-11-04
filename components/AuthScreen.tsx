import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { INITIAL_PROFILE } from '../constants';
import { ShieldCheck, Loader2, Lock, Sparkles } from 'lucide-react';
import firebaseConfig from '../firebase-applet-config.json';

type NativeGoogleAuthPlugin = { signIn: () => Promise<{ idToken: string }> };
const NativeGoogleAuth = registerPlugin<NativeGoogleAuthPlugin>('GoogleAuth');

export const AuthScreen: React.FC = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);

  const finishFirebaseLogin = async (idToken: string) => {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCred = await signInWithCredential(auth, credential);

    await setDoc(doc(db, 'users', userCred.user.uid), {
      ...INITIAL_PROFILE,
      email: userCred.user.email,
      fullName: userCred.user.displayName || INITIAL_PROFILE.fullName,
      profileImage: userCred.user.photoURL || INITIAL_PROFILE.profileImage
    }, { merge: true });
  };

  const handleNativeGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await NativeGoogleAuth.signIn();
      if (!result?.idToken) throw new Error('Google did not return an ID token.');
      await finishFirebaseLogin(result.idToken);
    } catch (err: any) {
      console.error('Native Google Login Error:', err);
      setError(err?.message || 'Google authentication failed');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;

    let timeoutId: any;
    const initGsi = () => {
      const google = (window as any).google;
      if (google && btnRef.current) {
        google.accounts.id.initialize({
          client_id: firebaseConfig.oAuthClientId || '393681011941-m5r8dpkm1cu82gs34kdvigbofmtet92e.apps.googleusercontent.com',
          callback: async (response: any) => {
            setError('');
            setLoading(true);
            try {
              await finishFirebaseLogin(response.credential);
            } catch (err: any) {
              console.error('Web Google Login Error:', err);
              setError(err.message || 'Authentication failed');
              setLoading(false);
            }
          }
        });
        google.accounts.id.renderButton(btnRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'continue_with_google',
          width: 280
        });
      } else {
        timeoutId = setTimeout(initGsi, 500);
      }
    };

    initGsi();
    return () => clearTimeout(timeoutId);
  }, []);


  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-2xl p-8 sm:p-10 rounded-3xl border border-white/10 shadow-2xl text-white relative z-10">
        
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="relative mb-4 group">
            {!imgError ? (
              <img
                src="/logo.png"
                alt="Digital DocuFolio"
                onError={() => setImgError(true)}
                className="w-24 h-24 object-contain rounded-2xl drop-shadow-[0_10px_25px_rgba(0,112,243,0.4)] p-1 bg-white/5 border border-white/10"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-sky-500/30 border border-white/20">
                <ShieldCheck size={40} />
              </div>
            )}
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">Digital DocuFolio</h1>
          <p className="text-sky-300/90 text-sm font-medium mt-1">Your Digital Documents. Always With You.</p>
          <div className="mt-3 flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-300 text-xs font-semibold">
            <Lock size={12} />
            <span>Encrypted Cloud Vault &amp; Multi-Device Sync</span>
          </div>
        </div>

        <div className="space-y-4 flex flex-col items-center w-full">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-xs w-full text-center">{error}</div>}
          
          {Capacitor.isNativePlatform() ? (
            <button
              type="button"
              onClick={handleNativeGoogleSignIn}
              disabled={loading}
              className="w-full max-w-[280px] h-11 rounded-md bg-white text-slate-800 font-semibold text-sm shadow-sm hover:bg-slate-100 disabled:opacity-60 transition-colors flex items-center justify-center gap-3"
            >
              <span className="text-lg font-bold">G</span>
              <span>Continue with Google</span>
            </button>
          ) : (
            <div ref={btnRef} className="w-full flex justify-center mt-2 min-h-[44px]"></div>
          )}
          
          {loading && (
             <div className="flex items-center justify-center gap-2 text-sky-400 font-bold mt-4">
                 <Loader2 className="animate-spin" size={20} />
                 <span className="text-sm">Securing your vault session...</span>
             </div>
          )}
        </div>

        {/* Feature Badges Footer */}
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-400 font-medium">
          <div className="flex flex-col items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>View Once Share</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Real-Time Sync</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Smart Alarms</span>
          </div>
        </div>

        {/* Support Link */}
        <div className="mt-6 text-center">
          <a href="mailto:Support@aerscankenya.co.ke" className="text-xs text-sky-400/80 hover:text-sky-300 underline transition-colors">
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
};
