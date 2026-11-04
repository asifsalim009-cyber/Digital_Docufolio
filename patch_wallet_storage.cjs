const fs = require('fs');
let code = fs.readFileSync('components/Wallet.tsx', 'utf8');

const getPlanLimitsStr = `
const getPlanLimits = (plan: SubscriptionPlan) => {
  switch (plan) {
    case SubscriptionPlan.BUSINESS: return { maxDocs: Infinity, maxFileSizeMB: 100 };
    case SubscriptionPlan.ELITE: return { maxDocs: 5000, maxFileSizeMB: 50 };
    case SubscriptionPlan.PRO: return { maxDocs: 1000, maxFileSizeMB: 15 };
    case SubscriptionPlan.PREMIUM: return { maxDocs: 200, maxFileSizeMB: 5 };
    case SubscriptionPlan.BASIC:
    default: return { maxDocs: 10, maxFileSizeMB: 2 };
  }
};
`;

code = code.replace(
  `const Wallet: React.FC<WalletProps>`,
  getPlanLimitsStr + `\nconst Wallet: React.FC<WalletProps>`
);

// Inject doc count check in handleSaveDocument
code = code.replace(
  `const handleSaveDocument = async () => {
    if (newDoc.files.length === 0) {
      alert("Please upload at least one image or PDF of the document.");
      return;
    }`,
  `const handleSaveDocument = async () => {
    if (newDoc.files.length === 0) {
      alert("Please upload at least one image or PDF of the document.");
      return;
    }
    const limits = getPlanLimits(currentPlan);
    if (documents.length >= limits.maxDocs) {
      alert(\`Your current plan allows up to \${limits.maxDocs} documents. Please upgrade to add more.\`);
      return;
    }`
);

// Replace hardcoded 2MB checks with plan-specific checks
// There are two places: 
// 1. if (file.size > 2 * 1024 * 1024) { alert("PDF is too large (over 2MB). It may not save correctly."); }
// 2. if (file.size > 2 * 1024 * 1024) { alert("File is too large (over 2MB). It may not save correctly."); }

code = code.replace(
  /if \(file\.size > 2 \* 1024 \* 1024\) {\s*alert\("PDF is too large \(over 2MB\)\. It may not save correctly\."\);\s*}/g,
  `const limits = getPlanLimits(currentPlan);
          if (file.size > limits.maxFileSizeMB * 1024 * 1024) {
             alert(\`File is too large (\${(file.size / (1024*1024)).toFixed(1)}MB). Your plan limits uploads to \${limits.maxFileSizeMB}MB.\`);
             return; // block it
          }`
);

code = code.replace(
  /if \(file\.size > 2 \* 1024 \* 1024\) {\s*alert\("File is too large \(over 2MB\)\. It may not save correctly\."\);\s*}/g,
  `const limits = getPlanLimits(currentPlan);
               if (file.size > limits.maxFileSizeMB * 1024 * 1024) {
                  alert(\`File is too large (\${(file.size / (1024*1024)).toFixed(1)}MB). Your plan limits uploads to \${limits.maxFileSizeMB}MB.\`);
                  return; // block it
               }`
);

fs.writeFileSync('components/Wallet.tsx', code);
