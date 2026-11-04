const fs = require('fs');
let code = fs.readFileSync('components/Wallet.tsx', 'utf8');

const invalidTarget = `{selectedDoc.files.length > 0 && (
                                <button 
                                  onClick={() => handleDownload(selectedDoc.files[0].url, selectedDoc.files[0].name, selectedDoc.files[0].type)}
                                  className="flex-1 py-3 bg-white border border-sand-200 text-forest-900 rounded-xl font-bold text-sm hover:bg-sand-50 flex items-center justify-center gap-2 transition-all shadow-sm"
                                >
                                    <Download size={16} /> Download
                                </button>
                                <button 
                                  onClick={() => handleDriveUpload(selectedDoc.files[0].url, selectedDoc.files[0].name, selectedDoc.files[0].type)}
                                  className="flex-1 py-3 bg-white border border-sand-200 text-sky-600 rounded-xl font-bold text-sm hover:bg-sand-50 flex items-center justify-center gap-2 transition-all shadow-sm"
                                >
                                    <Cloud size={16} /> Save to Drive
                                </button>
                            )}`;

const validTarget = `{selectedDoc.files.length > 0 && (
                                <>
                                  <button 
                                    onClick={() => handleDownload(selectedDoc.files[0].url, selectedDoc.files[0].name, selectedDoc.files[0].type)}
                                    className="flex-1 py-3 bg-white border border-sand-200 text-forest-900 rounded-xl font-bold text-sm hover:bg-sand-50 flex items-center justify-center gap-2 transition-all shadow-sm"
                                  >
                                      <Download size={16} /> Download
                                  </button>
                                  <button 
                                    onClick={() => handleDriveUpload(selectedDoc.files[0].url, selectedDoc.files[0].name, selectedDoc.files[0].type)}
                                    className="flex-1 py-3 bg-white border border-sand-200 text-sky-600 rounded-xl font-bold text-sm hover:bg-sand-50 flex items-center justify-center gap-2 transition-all shadow-sm"
                                  >
                                      <Cloud size={16} /> Save to Drive
                                  </button>
                                </>
                            )}`;

code = code.replace(invalidTarget, validTarget);
fs.writeFileSync('components/Wallet.tsx', code);
