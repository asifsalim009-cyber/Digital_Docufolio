const fs = require('fs');
let code = fs.readFileSync('components/Monetization.tsx', 'utf8');

const tableBodyStr = `<tbody className="divide-y divide-sand-100">
                <tr>
                  <td className="py-3 px-3 font-semibold text-forest-900">Document Vault Storage</td>
                  <td className="py-3 px-3 text-slate-600">10 Documents</td>
                  <td className="py-3 px-3 text-amber-700 font-bold">200 Documents</td>
                  <td className="py-3 px-3 text-sky-700 font-bold">1,000 Documents</td>
                  <td className="py-3 px-3 text-purple-700 font-bold">5,000 Documents</td>
                  <td className="py-3 px-3 text-emerald-800 font-bold">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-forest-900">Max File Size (Upload)</td>
                  <td className="py-3 px-3 text-slate-600">2 MB</td>
                  <td className="py-3 px-3 text-amber-700 font-bold">5 MB</td>
                  <td className="py-3 px-3 text-sky-700 font-bold">15 MB</td>
                  <td className="py-3 px-3 text-purple-700 font-bold">50 MB</td>
                  <td className="py-3 px-3 text-emerald-800 font-bold">100 MB</td>
                </tr>`;

const regexBody = /<tbody className="divide-y divide-sand-100">\s*<tr>\s*<td className="py-3 px-3 font-semibold text-forest-900">Document Vault Storage<\/td>[\s\S]*?<\/tr>/;
code = code.replace(regexBody, tableBodyStr);

fs.writeFileSync('components/Monetization.tsx', code);
