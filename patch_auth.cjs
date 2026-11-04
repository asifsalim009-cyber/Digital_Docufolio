const fs = require('fs');
let code = fs.readFileSync('components/AuthScreen.tsx', 'utf8');

code = code.replace(
  /import \{ signInWithEmailAndPassword, createUserWithEmailAndPassword \} from 'firebase\/auth';/,
  `import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';`
);

code = code.replace(
  /const \[isLogin, setIsLogin\] = useState\(true\);[\s\S]*?const handleSubmit = async \(e: React.FormEvent\) => \{[\s\S]*?finally \{\n      setLoading\(false\);\n    \}\n  \};/,
  `const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCred = await signInWithPopup(auth, provider);
      
      // Initialize user profile in Firestore if it doesn't exist
      await setDoc(doc(db, 'users', userCred.user.uid), {
        ...INITIAL_PROFILE,
        email: userCred.user.email,
        fullName: userCred.user.displayName || INITIAL_PROFILE.fullName,
        profileImage: userCred.user.photoURL || INITIAL_PROFILE.profileImage
      }, { merge: true });
      
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };`
);

code = code.replace(
  /<form onSubmit=\{handleSubmit\} className="space-y-4 relative z-10">[\s\S]*?<\/form>/,
  `
        <div className="space-y-4 relative z-10">
          {error && <div className="p-3 bg-red-100 text-red-700 rounded-xl text-sm">{error}</div>}
          
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white text-forest-900 border border-sand-300 font-bold rounded-xl px-4 py-3 hover:bg-sand-50 transition-all flex items-center justify-center gap-3 mt-2 shadow-sm disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
            )}
            Continue with Google
          </button>
        </div>
  `
);

code = code.replace(
  /<div className="mt-6 text-center relative z-10">[\s\S]*?<\/div>/,
  ``
);

fs.writeFileSync('components/AuthScreen.tsx', code);
