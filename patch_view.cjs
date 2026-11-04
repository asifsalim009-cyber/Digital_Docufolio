const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const targetStr = `const [currentView, setCurrentView] = useState<AppView>(() => {
    const saved = sessionStorage.getItem('modernFolio_view');
    return saved ? (saved as AppView) : AppView.PROFILE;
  });`;

const replacementStr = `const [currentView, setCurrentView] = useState<AppView>(AppView.PROFILE);`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  console.log('Successfully patched currentView initialization');
} else {
  console.log('Could not find target string in App.tsx');
  // Try finding it ignoring whitespace
  const regex = /const \[currentView, setCurrentView\] = useState<AppView>\(\(\) => \{[^}]+\}\);/m;
  if (regex.test(code)) {
    code = code.replace(regex, replacementStr);
    console.log('Successfully patched currentView initialization using regex');
  } else {
    console.log('Could not find target string even with regex');
  }
}

fs.writeFileSync('App.tsx', code);
