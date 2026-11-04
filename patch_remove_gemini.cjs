const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// 1. Remove GoogleGenAI import
code = code.replace(/import \{ GoogleGenAI \} from "@google\/genai";\n/, '');

// 2. Remove states
code = code.replace(/  const \[showLoginModal, setShowLoginModal\] = useState\(false\);\n/, '');
code = code.replace(/  const \[isProcessingLogin, setIsProcessingLogin\] = useState\(false\);\n/, '');
code = code.replace(/  const \[loginEmail, setLoginEmail\] = useState\(''\);\n/, '');

// 3. Remove handleGmailLogin function completely
code = code.replace(/  \/\/ --- Gmail Login \/ Auto-fill Logic ---[\s\S]*?\/\/ --- Render Functions ---/, '// --- Render Functions ---');

// 4. Remove Connect Google Button
code = code.replace(/                \{\/\* Connect Google Button \*\/\}[\s\S]*?<\/button>\n\n/, '');

// 5. Remove Login Modal
code = code.replace(/      \{\/\* Login Modal \*\/\}[\s\S]*?<\/div>\n      \)\}\n/, '');

fs.writeFileSync('App.tsx', code);
