const fs = require('fs');
let code = fs.readFileSync('components/Monetization.tsx', 'utf8');

const targetStr = `totalPrice: billingCycle === 'yearly' ? selectedPlan.price.yearlyNum.toString() : selectedPlan.price.monthlyNum.toString(),
                          currencyCode: 'USD',
                          countryCode: 'US',`;

const replacementStr = `totalPrice: ((billingCycle === 'yearly' ? selectedPlan.price.yearlyNum : selectedPlan.price.monthlyNum) / 130).toFixed(2),
                          currencyCode: 'USD',
                          countryCode: 'KE',`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  console.log('Successfully patched GooglePayButton transaction info');
} else {
  console.log('Could not find target string in Monetization.tsx');
}

// Add a note above the button to show the USD equivalent
const gpayNoteTarget = `<GooglePayButton`;
const gpayNoteReplacement = `<p className="text-xs text-forest-500 font-bold mb-2">Google Pay (Converted to USD at ~130 KES/USD): ${"$"}{((billingCycle === 'yearly' ? selectedPlan.price.yearlyNum : selectedPlan.price.monthlyNum) / 130).toFixed(2)}</p>
                    <GooglePayButton`;

if (code.includes(gpayNoteTarget) && !code.includes('Converted to USD')) {
  code = code.replace(gpayNoteTarget, gpayNoteReplacement);
  console.log('Successfully added USD conversion note');
}

fs.writeFileSync('components/Monetization.tsx', code);
