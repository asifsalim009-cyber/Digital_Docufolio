const fs = require('fs');
let code = fs.readFileSync('components/Wallet.tsx', 'utf8');

code = code.replace(
`    } catch (error: any) {
      console.error("Scan failed", error);
      const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED');
      if (isRateLimit) {
         setScanMessage("System busy (Quota Exceeded). Please try again later.");
      } else {
         setScanMessage("Could not extract details automatically.");
      }
    }`,
`    } catch (error: any) {
      console.error("Scan failed", error);
      setScanMessage(error.message || "Could not extract details automatically.");
    }`
);

code = code.replace(
`    } catch (error: any) {
        console.error("Scan failed", error);
        const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED');
        if (isRateLimit) {
           setScanMessage("System busy (Quota Exceeded). Please try again later.");
        } else {
           setScanMessage("Could not extract details automatically.");
        }
    }`,
`    } catch (error: any) {
        console.error("Scan failed", error);
        setScanMessage(error.message || "Could not extract details automatically.");
    }`
);

fs.writeFileSync('components/Wallet.tsx', code);
