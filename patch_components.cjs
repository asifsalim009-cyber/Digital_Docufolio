const fs = require('fs');

const retryFunc = `
// Utility for AI retries to handle 429 and 503 errors
const generateContentWithRetry = async (ai, model, params, retries = 3, initialDelay = 2000) => {
  let currentDelay = initialDelay;
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent({ model, ...params });
    } catch (error) {
      const isRateLimit = error.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED');
      const isBusy = error.status === 503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE') || error?.message?.includes('high demand');
      if (i === retries - 1 || (!isRateLimit && !isBusy)) {
        throw error;
      }
      console.log(\`Rate limit or server busy hit. Retrying in \${currentDelay}ms...\`);
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= 2; // Exponential backoff
    }
  }
  throw new Error("Max retries exceeded");
};
`;

function patchFile(filename) {
    let code = fs.readFileSync(filename, 'utf8');
    if (!code.includes('generateContentWithRetry')) {
        code = code.replace("import { GoogleGenAI } from \"@google/genai\";", "import { GoogleGenAI } from \"@google/genai\";\n" + retryFunc);
        if (code.includes('generateContentWithRetry')) {
             code = code.replace(/await ai\.models\.generateContent\(\{\s*model:\s*'gemini-[^']+',\s*contents:/g, "await generateContentWithRetry(ai, 'gemini-3.7-flash', {\ncontents:");
             fs.writeFileSync(filename, code);
        }
    }
}

patchFile('components/Journal.tsx');
patchFile('components/Expenditures.tsx');
