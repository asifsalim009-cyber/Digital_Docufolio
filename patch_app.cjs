const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  "{currentView === AppView.SETTINGS && (\n                 <Settings \n                   profile={profile}",
  "{(currentView === AppView.SETTINGS || currentView === AppView.PLANS) && (\n                 <Settings \n                   key={currentView} \n                   initialTab={currentView === AppView.PLANS ? 'plan' : 'account'}\n                   profile={profile}"
);

// We also need to fix all onNavigateToPlans to navigate to AppView.PLANS
code = code.replace(/setCurrentView\(AppView\.SETTINGS\)/g, "setCurrentView(AppView.PLANS)");

// But wait, the SettingsIcon button also calls setCurrentView(AppView.SETTINGS), that should stay AppView.SETTINGS!
// Ah, let's revert the naive regex.
