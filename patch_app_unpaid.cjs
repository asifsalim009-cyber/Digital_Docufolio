const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// We will inject the logic near "const handleNavChange = (view: AppView) => {"

const unpaidCheck = `
  const isUnpaid = profile?.subscriptionStatus === 'unpaid' || profile?.subscriptionStatus === 'past_due';
`;

code = code.replace(
  "const handleNavChange = (view: AppView) => {",
  unpaidCheck + "\n  const handleNavChange = (view: AppView) => {"
);

// Lock navigation
code = code.replace(
  "setCurrentView(view);",
  "if (isUnpaid) {\n      alert('Please renew your subscription to access this feature.');\n      setCurrentView(AppView.PLANS);\n      return;\n    }\n    setCurrentView(view);"
);

// If isUnpaid and they are not on AppView.PLANS, force render it.
// Actually, it's better to force `currentView` in an effect.
const forceEffect = `
  useEffect(() => {
    if (isUnpaid && currentView !== AppView.PLANS && currentView !== AppView.SETTINGS) {
      setCurrentView(AppView.PLANS);
    }
  }, [isUnpaid, currentView]);
`;

code = code.replace(
  "// --- View: Main Application ---",
  "// --- View: Main Application ---\n" + forceEffect
);

// In the TabNav component, if we can't easily lock it, the alert will work. But we can also pass isUnpaid to hide files.

fs.writeFileSync('App.tsx', code);
