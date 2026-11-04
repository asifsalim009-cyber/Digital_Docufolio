const fs = require('fs');
let code = fs.readFileSync('components/Settings.tsx', 'utf8');
code = code.replace(
  "  onReplayTutorial\n}) => {\n  const [activeTab, setActiveTab] = useState<'account' | 'plan' | 'notifications' | 'security' | 'support'>('account');",
  "  onReplayTutorial,\n  initialTab = 'account'\n}) => {\n  const [activeTab, setActiveTab] = useState<'account' | 'plan' | 'notifications' | 'security' | 'support'>(initialTab);\n  React.useEffect(() => { setActiveTab(initialTab); }, [initialTab]);"
);
fs.writeFileSync('components/Settings.tsx', code);
