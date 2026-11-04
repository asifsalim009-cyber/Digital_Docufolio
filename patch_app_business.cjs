const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  /import Profile from '\.\/components\/Profile';/,
  "import Profile from './components/Profile';\nimport BusinessProfile from './components/BusinessProfile';"
);

code = code.replace(
  /\{currentView === AppView\.PROFILE && \(\n                 <Profile profile=\{profile\} onUpdateProfile=\{handleUpdateProfile\} \/>\n               \)\}/,
  `{currentView === AppView.PROFILE && profile.plan === SubscriptionPlan.BUSINESS && (
                 <BusinessProfile profile={profile} onUpdateProfile={handleUpdateProfile} />
               )}
               {currentView === AppView.PROFILE && profile.plan !== SubscriptionPlan.BUSINESS && (
                 <Profile profile={profile} onUpdateProfile={handleUpdateProfile} />
               )}`
);

fs.writeFileSync('App.tsx', code);
