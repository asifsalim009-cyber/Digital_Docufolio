const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldParseCatch = `    } catch (error: any) {
      console.error("Gemini parse error:", error);
      // Fallback for quota exceeded
      if (error?.message?.includes("Quota Exceeded") || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("high demand") || error?.message?.includes("UNAVAILABLE")) {
         return res.json({
            amount: 150.00,
            recipient: "Mock Parsed Store (AI Quota Exceeded)",
            date: new Date().toISOString().split('T')[0],
            paymentMethod: "Card",
            reference: "MOCK-12345",
            type: "expense"
         });
      }
      res.status(500).json({ error: error.message || "Failed to parse receipt" });
    }`;

const newParseCatch = `    } catch (error: any) {
      // Fallback for quota exceeded
      if (error?.message?.includes("Quota Exceeded") || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("high demand") || error?.message?.includes("UNAVAILABLE")) {
         return res.json({
            amount: 150.00,
            recipient: "Mock Parsed Store (AI Quota Exceeded)",
            date: new Date().toISOString().split('T')[0],
            paymentMethod: "Card",
            reference: "MOCK-12345",
            type: "expense"
         });
      }
      console.error("Gemini parse error:", error);
      res.status(500).json({ error: error.message || "Failed to parse receipt" });
    }`;

const oldDiscoverCatch = `    } catch (error: any) {
      console.error("Gemini discover error:", error);
      let errMsg = "Failed to discover socials";
      if (error?.message?.includes("Quota Exceeded") || error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("high demand") || error?.message?.includes("UNAVAILABLE")) {
        // Provide mock fallback
        return res.json({
            data: {
               email: req.body?.email || "mock@example.com",
               linkedin: "https://linkedin.com/in/mock-profile",
               twitter: "https://twitter.com/mockuser"
            },
            sources: []
        });
      }
      if (error?.message) {
        errMsg = error.message;
      }
      res.status(500).json({ error: errMsg });
    }`;

const newDiscoverCatch = `    } catch (error: any) {
      if (error?.message?.includes("Quota Exceeded") || error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("high demand") || error?.message?.includes("UNAVAILABLE")) {
        // Provide mock fallback
        return res.json({
            data: {
               email: req.body?.email || "mock@example.com",
               linkedin: "https://linkedin.com/in/mock-profile",
               twitter: "https://twitter.com/mockuser"
            },
            sources: []
        });
      }
      console.error("Gemini discover error:", error);
      let errMsg = "Failed to discover socials";
      if (error?.message) {
        errMsg = error.message;
      }
      res.status(500).json({ error: errMsg });
    }`;

code = code.replace(oldParseCatch, newParseCatch);
code = code.replace(oldDiscoverCatch, newDiscoverCatch);

fs.writeFileSync('server.ts', code);
