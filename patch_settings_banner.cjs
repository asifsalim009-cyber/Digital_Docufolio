const fs = require('fs');
let code = fs.readFileSync('components/Settings.tsx', 'utf8');

const injection = `
  const isUnpaid = profile.subscriptionStatus === 'unpaid' || profile.subscriptionStatus === 'past_due';
  const getMonthsUnpaid = () => {
    if (!profile.lastPaymentDate || profile.subscriptionStatus === 'active') return 0;
    const lastPayment = new Date(profile.lastPaymentDate);
    const now = new Date();
    return (now.getFullYear() - lastPayment.getFullYear()) * 12 + now.getMonth() - lastPayment.getMonth();
  };
  const monthsUnpaid = getMonthsUnpaid();
`;

code = code.replace(
  "const [logoError, setLogoError] = useState(false);",
  "const [logoError, setLogoError] = useState(false);\n" + injection
);

const bannerCode = `
      {isUnpaid && (
        <div className={\`max-w-5xl mx-auto mb-6 p-4 rounded-2xl border \${monthsUnpaid >= 3 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-amber-50 border-amber-200 text-amber-900'}\`}>
          <div className="flex items-start gap-3">
            <div className={\`p-2 rounded-xl \${monthsUnpaid >= 3 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}\`}>
              <Shield size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                {monthsUnpaid >= 3 ? "CRITICAL: Account Scheduled for Deletion" : "Subscription Past Due"}
              </h3>
              <p className="text-sm mt-1">
                {monthsUnpaid >= 3 
                  ? "Your subscription has been unpaid for over 3 months. Your files are temporarily hidden, and your data is scheduled for auto-deletion. Please pay immediately to recover your data." 
                  : "Your subscription is past due. Your files have been temporarily hidden. Once paid, they can be instantly recovered."}
              </p>
              {activeTab !== 'plan' && (
                <button 
                  onClick={() => setActiveTab('plan')}
                  className={\`mt-3 px-4 py-2 rounded-lg font-bold text-sm transition-colors \${monthsUnpaid >= 3 ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}\`}
                >
                  View Plans & Renew
                </button>
              )}
            </div>
          </div>
        </div>
      )}
`;

code = code.replace(
  "{/* Top Header Card with Brand Logo */}",
  bannerCode + "\n      {/* Top Header Card with Brand Logo */}"
);

fs.writeFileSync('components/Settings.tsx', code);
