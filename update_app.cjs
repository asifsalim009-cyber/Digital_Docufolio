const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// Inject the credit handler
const creditHandlerStr = `
  const handleUpdateProfile = (updated: UserProfile) => {
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
    setProfile(newProfile);
  };

  const handleUseAiCredit = (amount: number = 1): boolean => {
    if (!profile) return false;
    const remaining = profile.aiCreditsRemaining !== undefined ? profile.aiCreditsRemaining : 0;
    if (remaining >= amount) {
      setProfile({
        ...profile,
        aiCreditsRemaining: remaining - amount
      });
      return true;
    }
    return false;
  };
`;

code = code.replace(
  /const handleUpdateProfile = \(updated: UserProfile\) => \{\s*setProfile\(updated\);\s*\};/g,
  creditHandlerStr
);

// Add onUseAiCredit prop to Journal, Expenditures, Wallet, and Profile?
// Wait, I can just pass `handleUseAiCredit` to the components that need it, 
// but first I should just define it. I'll add `onUseAiCredit={handleUseAiCredit}` to their instantiations.

const injectProp = (componentName, codeStr) => {
  const regex = new RegExp(`(<${componentName}\\s[^>]*?)(/?>)`, 'g');
  // Need to make sure we don't accidentally match something else, so just a simple replace
  // Better to just replace the exact tags
  return codeStr; 
};

// Actually, I can use a simpler replacement for the component renders
code = code.replace(/<Wallet\s+profile=\{profile\}/g, '<Wallet\n                   profile={profile}\n                   onUseAiCredit={handleUseAiCredit}');
code = code.replace(/<Journal\s+profile=\{profile\}/g, '<Journal\n                   profile={profile}\n                   onUseAiCredit={handleUseAiCredit}');
code = code.replace(/<Expenditures\s+profile=\{profile\}/g, '<Expenditures\n                   profile={profile}\n                   onUseAiCredit={handleUseAiCredit}');
code = code.replace(/<Profile\s+profile=\{profile\}/g, '<Profile\n                 profile={profile}\n                 onUseAiCredit={handleUseAiCredit}');

fs.writeFileSync('App.tsx', code);
