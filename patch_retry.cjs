const fs = require('fs');

const retryFunc = `const generateContentWithRetry = async (ai, model, params, retries = 3, initialDelay = 2000) => {
  let currentDelay = initialDelay;
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent({ model, ...params });
    } catch (error) {
      const isRateLimit = error.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED');
      const isBusy = error.status === 503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE') || error?.message?.includes('high demand');
      
      if (i === retries - 1) {
        if (isBusy) throw new Error("AI models are currently experiencing high demand. Please try again later.");
        if (isRateLimit) throw new Error("AI Quota Exceeded. Please try again later.");
        throw error;
      }
      if (!isRateLimit && !isBusy) {
        throw error;
      }
      console.log(\`Rate limit or server busy hit. Retrying in \${currentDelay}ms...\`);
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= 2; // Exponential backoff
    }
  }
  throw new Error("Max retries exceeded");
};`;

function patchFile(filename) {
    let code = fs.readFileSync(filename, 'utf8');
    
    // Find the old generateContentWithRetry block
    const startIdx = code.indexOf("const generateContentWithRetry");
    if (startIdx !== -1) {
        let endIdx = code.indexOf("};", startIdx);
        if (endIdx !== -1) {
            code = code.substring(0, startIdx) + retryFunc + code.substring(endIdx + 2);
            fs.writeFileSync(filename, code);
        }
    }
}

patchFile('server.ts');
patchFile('components/Journal.tsx');
patchFile('components/Expenditures.tsx');
patchFile('components/Wallet.tsx');
