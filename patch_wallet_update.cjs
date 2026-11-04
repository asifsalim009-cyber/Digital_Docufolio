const fs = require('fs');
let code = fs.readFileSync('components/Wallet.tsx', 'utf8');

code = code.replace(
`    } catch (e: any) {
        console.error("Update scan failed", e);
        const isRateLimit = e.status === 429 || e.message?.includes('429') || e.message?.includes('quota') || e.message?.includes('RESOURCE_EXHAUSTED');
        if (isRateLimit) {
           setScanMessage("System busy (Quota Exceeded). Please try again later.");
        } else {
           setScanMessage("Could not update details automatically.");
        }
    }`,
`    } catch (e: any) {
        console.error("Update scan failed", e);
        setScanMessage(e.message || "Could not update details automatically.");
    }`
);
fs.writeFileSync('components/Wallet.tsx', code);
