const fs = require('fs');
let code = fs.readFileSync('components/Journal.tsx', 'utf8');

const guardStr = `const handleAddEntry = () => {
    if (!newEntry.content.trim()) return;
    
    // Feature Enforcement: Max 1 entry per day on Free plan
    if (currentPlan === SubscriptionPlan.BASIC) {
        const todayStr = new Date().toISOString().split('T')[0];
        const todaysEntries = entries.filter(e => e.date.startsWith(todayStr));
        if (todaysEntries.length >= 1) {
            alert("Free plan is limited to 1 journal entry per day. Please upgrade for unlimited entries!");
            if (onNavigateToPlans) onNavigateToPlans();
            return;
        }
    }`;

code = code.replace(
  /const handleAddEntry = \(\) => \{\s*if \(\!newEntry.content.trim\(\)\) return;/g,
  guardStr
);

fs.writeFileSync('components/Journal.tsx', code);
