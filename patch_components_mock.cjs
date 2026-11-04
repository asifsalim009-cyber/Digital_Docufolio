const fs = require('fs');

function patchFile(filename) {
    if (!fs.existsSync(filename)) return;
    let code = fs.readFileSync(filename, 'utf8');
    
    // Replace hallucinated models
    code = code.replace(/gemini-3\.7-flash/g, 'gemini-2.5-flash');

    if (filename === 'components/Wallet.tsx') {
        // Add fallback to scanNewDocument
        code = code.replace(
            `    } catch (error: any) {\n      console.error("Scan failed", error);\n      setScanMessage(error.message || "Could not extract details automatically.");\n    }`,
            `    } catch (error: any) {
      console.error("Scan failed", error);
      if (error?.message?.includes("Quota") || error?.message?.includes("high demand") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
        applyScanResultToNewDoc({
            documentType: "ID Card",
            documentNumber: "MOCK-12345678",
            fullName: "Mock User",
            expiryDate: "2030-12-31"
        });
        setScanMessage("Quota Exceeded. Mock details applied.");
      } else {
        setScanMessage(error.message || "Could not extract details automatically.");
      }
    }`
        );

        // Add fallback to triggerScanOnSelectedDoc
        code = code.replace(
            `    } catch (e: any) {\n        console.error("Update scan failed", e);\n        setScanMessage(e.message || "Could not update details automatically.");\n    }`,
            `    } catch (e: any) {
        console.error("Update scan failed", e);
        if (e?.message?.includes("Quota") || e?.message?.includes("high demand") || e?.message?.includes("RESOURCE_EXHAUSTED")) {
            const updated = { ...selectedDoc, documentNumber: "MOCK-UPDATED-123", expiryDate: "2035-01-01" };
            setSelectedDoc(updated);
            onUpdateDocument(updated);
            setScanMessage("Quota Exceeded. Mock details applied.");
        } else {
            setScanMessage(e.message || "Could not update details automatically.");
        }
    }`
        );
    }

    if (filename === 'components/Journal.tsx') {
        code = code.replace(
            `setAiAnswer(e.message || "Sorry, I couldn't retrieve that information right now.");`,
            `if (e?.message?.includes("Quota") || e?.message?.includes("high demand") || e?.message?.includes("RESOURCE_EXHAUSTED")) {
            setAiAnswer("AI Quota Exceeded. Mock response: Your journal entries show you've been working on various projects and taking time to relax.");
        } else {
            setAiAnswer(e.message || "Sorry, I couldn't retrieve that information right now.");
        }`
        );
    }
    
    if (filename === 'components/Expenditures.tsx') {
        code = code.replace(
            `setAiAnswer(e.message || "Sorry, I couldn't analyze the financial data right now.");`,
            `if (e?.message?.includes("Quota") || e?.message?.includes("high demand") || e?.message?.includes("RESOURCE_EXHAUSTED")) {
            setAiAnswer("AI Quota Exceeded. Mock response: Based on your recent transactions, you are spending mostly on food and transportation.");
        } else {
            setAiAnswer(e.message || "Sorry, I couldn't analyze the financial data right now.");
        }`
        );
    }

    fs.writeFileSync(filename, code);
}

patchFile('components/Wallet.tsx');
patchFile('components/Journal.tsx');
patchFile('components/Expenditures.tsx');

