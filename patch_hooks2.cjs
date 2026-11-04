const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const targetStr = `  const unreadCount = notifications.filter(n => !n.read).length;

  if (shareToken) {`;

code = code.replace(targetStr, `  const unreadCount = notifications.filter(n => !n.read).length;

  const isUnpaid = profile?.subscriptionStatus === 'unpaid' || profile?.subscriptionStatus === 'past_due';

  useEffect(() => {
    if (isUnpaid && currentView !== AppView.PLANS && currentView !== AppView.SETTINGS) {
      setCurrentView(AppView.PLANS);
    }
  }, [isUnpaid, currentView]);

  if (shareToken) {`);

fs.writeFileSync('App.tsx', code);
