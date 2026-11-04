const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const handlerStr = `
  const handleNavChange = (view: AppView) => {
    if (view === AppView.EXPENDITURES && (!profile?.plan || profile.plan === SubscriptionPlan.BASIC)) {
      alert("The Expense & Budget Tracker is a Premium feature. Please upgrade your plan to access it.");
      setCurrentView(AppView.PLANS);
      return;
    }
    setCurrentView(view);
  };
`;

code = code.replace(
  /return \(\s*<>\s*\{isLocked && \(/g,
  handlerStr + '\n  return (\n    <>\n      {isLocked && ('
);

fs.writeFileSync('App.tsx', code);
