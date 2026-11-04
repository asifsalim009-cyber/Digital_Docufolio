const fs = require('fs');
let code = fs.readFileSync('components/Settings.tsx', 'utf8');

const debugCode = `
            {activeTab === 'plan' && profile && (
              <div className="mt-8 p-4 bg-slate-100 border border-slate-300 rounded-xl">
                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Lock size={16} /> Debug Testing Options (Dev Only)</h4>
                <div className="flex gap-2">
                  <button onClick={() => onUpdateProfile && onUpdateProfile({ ...profile, subscriptionStatus: 'unpaid', lastPaymentDate: new Date(Date.now() - 30*24*60*60*1000).toISOString() })} className="px-3 py-1 bg-amber-500 text-white rounded text-xs">Simulate Unpaid (1m)</button>
                  <button onClick={() => onUpdateProfile && onUpdateProfile({ ...profile, subscriptionStatus: 'unpaid', lastPaymentDate: new Date(Date.now() - 100*24*60*60*1000).toISOString() })} className="px-3 py-1 bg-red-500 text-white rounded text-xs">Simulate Unpaid (3m+)</button>
                  <button onClick={() => onUpdateProfile && onUpdateProfile({ ...profile, subscriptionStatus: 'active', lastPaymentDate: new Date().toISOString() })} className="px-3 py-1 bg-emerald-500 text-white rounded text-xs">Set Active</button>
                </div>
              </div>
            )}
`;

code = code.replace(
  "<Monetization",
  debugCode + "\n          <Monetization"
);

fs.writeFileSync('components/Settings.tsx', code);
