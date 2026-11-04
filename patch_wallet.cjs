const fs = require('fs');
let code = fs.readFileSync('components/Wallet.tsx', 'utf8');

// 1. Intercept Category Changes
const categoryGuard = `
  const handleCategoryClick = (cat: 'PERSONAL' | 'OTHERS' | 'BUSINESS') => {
    if (cat === 'OTHERS' && (currentPlan === SubscriptionPlan.BASIC || currentPlan === SubscriptionPlan.PREMIUM)) {
       alert("The 'Family & Others' document vault is a Pro feature. Please upgrade to access it.");
       onNavigateToPlans();
       return;
    }
    if (cat === 'BUSINESS' && currentPlan !== SubscriptionPlan.BUSINESS) {
       alert("The Business document vault requires the Business plan. Please upgrade to access it.");
       onNavigateToPlans();
       return;
    }
    setActiveCategory(cat);
  };
`;

code = code.replace(
  `const [activeCategory, setActiveCategory] = useState<'PERSONAL' | 'OTHERS' | 'BUSINESS'>('PERSONAL');`,
  `const [activeCategory, setActiveCategory] = useState<'PERSONAL' | 'OTHERS' | 'BUSINESS'>('PERSONAL');\n${categoryGuard}`
);

// Replace button onClick handlers to use handleCategoryClick
code = code.replace(
  /onClick=\{\(\) => setActiveCategory\('PERSONAL'\)\}/g,
  `onClick={() => handleCategoryClick('PERSONAL')}`
);
code = code.replace(
  /onClick=\{\(\) => setActiveCategory\('OTHERS'\)\}/g,
  `onClick={() => handleCategoryClick('OTHERS')}`
);
code = code.replace(
  /onClick=\{\(\) => setActiveCategory\('BUSINESS'\)\}/g,
  `onClick={() => handleCategoryClick('BUSINESS')}`
);

// 2. Intercept Google Calendar Toggle
const calendarGuard = `onChange={(e) => {
                                if (e.target.checked && (currentPlan === SubscriptionPlan.BASIC || currentPlan === SubscriptionPlan.PREMIUM)) {
                                    alert("Google Calendar Auto-Sync is a Pro feature. Please upgrade to enable it.");
                                    onNavigateToPlans();
                                    return;
                                }
                                setNewDoc({...newDoc, syncToGoogleCalendar: e.target.checked});
                            }}`;

code = code.replace(
  /onChange=\{\(e\) => setNewDoc\(\{\.\.\.newDoc, syncToGoogleCalendar: e.target.checked\}\)\}/g,
  calendarGuard
);

fs.writeFileSync('components/Wallet.tsx', code);
