const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// We need to intercept TabNav's onChangeView. 
// TabNav is rendered like: <TabNav currentView={currentView} onChangeView={setCurrentView} profile={profile} />
// We'll replace setCurrentView with a custom handler.

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

// Insert the handler right before the return statement of App component
code = code.replace(
  /return \(\s*<div className="flex h-screen bg-forest-950 text-sand-50/g,
  handlerStr + '\n  return (\n    <div className="flex h-screen bg-forest-950 text-sand-50'
);

// Replace onChangeView={setCurrentView} with onChangeView={handleNavChange} for TabNav
code = code.replace(
  /<TabNav\s+currentView=\{currentView\}\s+onChangeView=\{setCurrentView\}/g,
  '<TabNav currentView={currentView} onChangeView={handleNavChange}'
);

fs.writeFileSync('App.tsx', code);
