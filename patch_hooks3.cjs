const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const injection = `
  const isUnpaid = profile?.subscriptionStatus === 'unpaid' || profile?.subscriptionStatus === 'past_due';

  React.useEffect(() => {
    if (isUnpaid && currentView !== AppView.PLANS && currentView !== AppView.SETTINGS) {
      setCurrentView(AppView.PLANS);
    }
  }, [isUnpaid, currentView]);
`;

code = code.replace("  if (shareToken) {", injection + "\n  if (shareToken) {");

fs.writeFileSync('App.tsx', code);
