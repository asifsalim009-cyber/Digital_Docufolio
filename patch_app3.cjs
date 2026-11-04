const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// Replace onNavigateToPlans
code = code.replace(/onNavigateToPlans=\{\(\) => setCurrentView\(AppView\.SETTINGS\)\}/g, "onNavigateToPlans={() => setCurrentView(AppView.PLANS)}");

// Replace Settings render
code = code.replace(
  "{currentView === AppView.SETTINGS && (",
  "{(currentView === AppView.SETTINGS || currentView === AppView.PLANS) && ("
);

// We need to inject initialTab and key to Settings
// We'll just replace "<Settings " with "<Settings key={currentView} initialTab={currentView === AppView.PLANS ? 'plan' : 'account'} "
// Let's do it on the specific block so we don't break anything.
let parts = code.split("{(currentView === AppView.SETTINGS || currentView === AppView.PLANS) && (\n                 <Settings ");
if(parts.length === 2) {
  code = parts[0] + "{(currentView === AppView.SETTINGS || currentView === AppView.PLANS) && (\n                 <Settings key={currentView} initialTab={currentView === AppView.PLANS ? 'plan' : 'account'} " + parts[1];
}

fs.writeFileSync('App.tsx', code);
