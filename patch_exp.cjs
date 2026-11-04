const fs = require('fs');
let code = fs.readFileSync('components/Expenditures.tsx', 'utf8');

code = code.replace(
  `onNavigateToPlans?: () => void;`,
  `onNavigateToPlans?: () => void;\n  onUseAiCredit?: (amount?: number) => boolean;`
);

code = code.replace(
  `onDeleteRecurring,
  onNavigateToPlans
}) => {`,
  `onDeleteRecurring,
  onNavigateToPlans,
  onUseAiCredit
}) => {`
);

// 1. handleReceiptScan
code = code.replace(
  `const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {`,
  `const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onUseAiCredit && !onUseAiCredit(1)) {
        setParseError("You have no AI credits remaining. Please upgrade your plan.");
        return;
    }`
);

// 2. handleAskAi
code = code.replace(
  `const handleAskAi = async () => {
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);`,
  `const handleAskAi = async () => {
    if (!aiQuery.trim()) return;
    if (onUseAiCredit && !onUseAiCredit(1)) {
        setAiAnswer("You have no AI credits remaining. Please upgrade your plan.");
        return;
    }
    setIsAiLoading(true);`
);

fs.writeFileSync('components/Expenditures.tsx', code);
