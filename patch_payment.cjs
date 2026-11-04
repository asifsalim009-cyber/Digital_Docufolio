const fs = require('fs');
let code = fs.readFileSync('components/Monetization.tsx', 'utf8');

if (!code.includes("import { Capacitor }")) {
  code = code.replace(
    `import { SubscriptionPlan } from '../types';`,
    `import { SubscriptionPlan } from '../types';\nimport { Capacitor } from '@capacitor/core';`
  );
}

const nativeCheckStr = `
  const isAndroid = Capacitor.getPlatform() === 'android';
`;

code = code.replace(
  `const Monetization: React.FC<MonetizationProps> = ({ currentPlan, onUpgrade }) => {`,
  `const Monetization: React.FC<MonetizationProps> = ({ currentPlan, onUpgrade }) => {\n${nativeCheckStr}`
);

// We should replace "M-PESA Express Checkout" text based on isAndroid
code = code.replace(
  `M-PESA Express Checkout`,
  `{isAndroid ? 'Google Play Upgrade' : 'M-PESA Express Checkout'}`
);

code = code.replace(
  `A Safaricom M-PESA prompt has been sent to <strong className="text-forest-900">+{phoneNumber}</strong>. Please enter your M-PESA PIN to authorize.`,
  `{isAndroid ? 'Opening Google Play Billing flow...' : \`A Safaricom M-PESA prompt has been sent to +\${phoneNumber}. Please enter your M-PESA PIN to authorize.\`}`
);

code = code.replace(
  `Upgrading to <strong className="text-forest-900">{selectedPlan.name}</strong> ({billingCycle})`,
  `Upgrading to <strong className="text-forest-900">{selectedPlan.name}</strong> ({billingCycle}) {isAndroid && 'via Google Play'}`
);

code = code.replace(
  `M-PESA Registered Phone Number`,
  `{isAndroid ? 'Confirm Google Account ID / Phone' : 'M-PESA Registered Phone Number'}`
);

code = code.replace(
  `Send STK Push Prompt`,
  `{isAndroid ? 'Proceed to Google Play' : 'Send STK Push Prompt'}`
);

// Modify the faqs
code = code.replace(
  `q: "How does the M-PESA payment process work?",`,
  `q: isAndroid ? "How does the Google Play payment process work?" : "How does the M-PESA payment process work?",`
);

code = code.replace(
  `a: "When you select your plan and click 'Pay Now', an instant M-PESA STK push prompt will appear directly on your phone. Simply enter your M-PESA PIN to confirm the payment, and your subscription activates automatically within seconds."`,
  `a: isAndroid ? "When you select your plan and click 'Pay Now', the standard Google Play Billing popup will appear. You can pay securely using the payment methods linked to your Google account." : "When you select your plan and click 'Pay Now', an instant M-PESA STK push prompt will appear directly on your phone. Simply enter your M-PESA PIN to confirm the payment, and your subscription activates automatically within seconds."`
);

fs.writeFileSync('components/Monetization.tsx', code);
