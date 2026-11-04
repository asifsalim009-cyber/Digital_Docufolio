const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const creditHandlerStr = `
  const handleUpdateProfile = async (updated: UserProfile) => {
    // If plan changed, reset credits based on plan
    let newProfile = { ...updated };
    if (profile?.plan !== updated.plan || updated.aiCreditsTotal === undefined) {
      let credits = 10; // Basic
      if (updated.plan === SubscriptionPlan.PREMIUM) credits = 50;
      if (updated.plan === SubscriptionPlan.PRO) credits = 150;
      if (updated.plan === SubscriptionPlan.ELITE) credits = 500;
      if (updated.plan === SubscriptionPlan.BUSINESS) credits = 2000;
      
      newProfile.aiCreditsTotal = credits;
      // Only reset remaining if it's undefined or they changed plans
      if (profile?.plan !== updated.plan || updated.aiCreditsRemaining === undefined) {
         newProfile.aiCreditsRemaining = credits;
      }
    }
    setProfile(newProfile); // optimistic update
    if (user) await setDoc(doc(db, 'users', user.uid), newProfile, { merge: true });
  };

  const handleUseAiCredit = (amount: number = 1): boolean => {
    if (!profile) return false;
    const remaining = profile.aiCreditsRemaining !== undefined ? profile.aiCreditsRemaining : 0;
    if (remaining >= amount) {
      const newProfile = {
        ...profile,
        aiCreditsRemaining: remaining - amount
      };
      setProfile(newProfile);
      if (user) setDoc(doc(db, 'users', user.uid), newProfile, { merge: true });
      return true;
    }
    return false;
  };
`;

code = code.replace(
  /const handleUpdateProfile = async \(newProfile: UserProfile\) => \{\s*setProfile\(newProfile\); \/\/ optimistic update\s*if \(user\) await setDoc\(doc\(db, 'users', user\.uid\), newProfile, \{ merge: true \}\);\s*\};/g,
  creditHandlerStr
);

// We didn't match the standard `handleUpdateProfile = (updated: UserProfile) => {` earlier because of the async nature.
// My previous replacement in update_app.cjs likely didn't match anything, so the tags are probably still untampered if the first one failed. 
// Wait, the tag replacement might have succeeded!
// Let's ensure the tag replacement happens.

code = code.replace(/<Wallet\s+profile=\{profile\}/g, '<Wallet\n                   profile={profile}\n                   onUseAiCredit={handleUseAiCredit}');
code = code.replace(/<Journal\s+profile=\{profile\}/g, '<Journal\n                   profile={profile}\n                   onUseAiCredit={handleUseAiCredit}');
code = code.replace(/<Expenditures\s+profile=\{profile\}/g, '<Expenditures\n                   profile={profile}\n                   onUseAiCredit={handleUseAiCredit}');
code = code.replace(/<Profile\s+profile=\{profile\}/g, '<Profile\n                 profile={profile}\n                 onUseAiCredit={handleUseAiCredit}');
code = code.replace(/<BusinessProfile\s+profile=\{profile\}/g, '<BusinessProfile\n                 profile={profile}\n                 onUseAiCredit={handleUseAiCredit}');

fs.writeFileSync('App.tsx', code);
