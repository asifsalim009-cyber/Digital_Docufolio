const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const retryFunc = `
const generateContentWithRetry = async (ai, model, params, retries = 3, initialDelay = 2000) => {
  let currentDelay = initialDelay;
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent({ model, ...params });
    } catch (error) {
      const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED');
      const isBusy = error.status === 503 || error.message?.includes('503') || error.message?.includes('UNAVAILABLE') || error.message?.includes('high demand');
      if (i === retries - 1 || (!isRateLimit && !isBusy)) {
        throw error;
      }
      console.log(\`Rate limit or busy. Retrying in \${currentDelay}ms...\`);
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= 2;
    }
  }
  throw new Error("Max retries exceeded");
};
`;

code = code.replace("import { GoogleGenAI, Type } from \"@google/genai\";\n\nasync function startServer() {", "import { GoogleGenAI, Type } from \"@google/genai\";\n" + retryFunc + "\nasync function startServer() {");

// Replace direct calls to generateContent in server.ts
// There are three calls to `await ai.models.generateContent({` in server.ts.
// Let's replace them one by one or generally.
code = code.replace(/await ai\.models\.generateContent\(\{/g, "await generateContentWithRetry(ai, 'gemini-3.7-flash', {");
// But wait, the original calls also specify the model:
// `model: "gemini-3.7-flash",` or `model: 'gemini-3.7-flash',` inside the params object.
// That's fine, the retry function does: `{ model, ...params }`. So passing it twice in params doesn't hurt.
// Wait, generateContentWithRetry requires `model` as a separate argument.
fs.writeFileSync('server.ts', code);
