const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  `const remaining = profile.aiCreditsRemaining !== undefined ? profile.aiCreditsRemaining : 0;`,
  `// Default to basic 10 credits if not yet initialized
    const remaining = profile.aiCreditsRemaining !== undefined ? profile.aiCreditsRemaining : (profile.plan === SubscriptionPlan.BUSINESS ? 2000 : profile.plan === SubscriptionPlan.ELITE ? 500 : profile.plan === SubscriptionPlan.PRO ? 150 : profile.plan === SubscriptionPlan.PREMIUM ? 50 : 10);
    const total = profile.aiCreditsTotal !== undefined ? profile.aiCreditsTotal : remaining;`
);

code = code.replace(
  `aiCreditsRemaining: remaining - amount`,
  `aiCreditsRemaining: remaining - amount,
        aiCreditsTotal: total`
);

fs.writeFileSync('App.tsx', code);
