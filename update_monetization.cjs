const fs = require('fs');
let code = fs.readFileSync('components/Monetization.tsx', 'utf8');

// 1. Insert ELITE plan
const elitePlanStr = `    {
      id: SubscriptionPlan.ELITE,
      name: "Elite",
      badge: "Advanced Features",
      badgeColor: "bg-purple-500/10 text-purple-700 border border-purple-500/20",
      price: { monthly: "KES 3,000/mo", yearly: "KES 30,000/yr", monthlyNum: 3000, yearlyNum: 30000 },
      description: "Advanced analytics, multiple users, and specialized integrations.",
      icon: <Star className="text-purple-600" size={24} />,
      iconBg: "bg-purple-500/10 text-purple-700",
      btnStyle: "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/30",
      features: [
        "Everything in Pro Suite",
        "Advanced Ledger Analytics",
        "Multi-User Financial Collaboration (Up to 3)",
        "Custom Export Formats (QBO, CSV, PDF)",
        "Priority Live Chat Support",
        "API Integrations (Beta)"
      ]
    },
`;

if (!code.includes('id: SubscriptionPlan.ELITE')) {
    code = code.replace(
      `    {\n      id: SubscriptionPlan.BUSINESS,`,
      elitePlanStr + `    {\n      id: SubscriptionPlan.BUSINESS,`
    );
}

// 2. Update table headers
code = code.replace(
  `<th className="py-3 px-3 font-bold text-sky-600">Pro (KES 1,000)</th>`,
  `<th className="py-3 px-3 font-bold text-sky-600">Pro (KES 1,000)</th>\n                  <th className="py-3 px-3 font-bold text-purple-600">Elite (KES 3,000)</th>`
);

// 3. Update table rows
// Replace specific lines in the table to inject the 4th column.
const replacements = [
  {
    search: `<td className="py-3 px-3 text-sky-700 font-bold">Unlimited</td>\n                  <td className="py-3 px-3 text-emerald-800 font-bold">Unlimited</td>`,
    replace: `<td className="py-3 px-3 text-sky-700 font-bold">Unlimited</td>\n                  <td className="py-3 px-3 text-purple-700 font-bold">Unlimited</td>\n                  <td className="py-3 px-3 text-emerald-800 font-bold">Unlimited</td>`
  },
  {
    search: `<td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                </tr>`,
    replace: `<td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                </tr>`
  },
  {
    search: `<td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                </tr>`,
    replace: `<td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                </tr>`
  },
  {
    search: `<td className="py-3 px-3 text-slate-400">Not Included</td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>`,
    replace: `<td className="py-3 px-3 text-slate-400">Not Included</td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>`
  },
  {
    search: `<td className="py-3 px-3 text-slate-400">Not Included</td>\n                  <td className="py-3 px-3 text-slate-400">Not Included</td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>`,
    replace: `<td className="py-3 px-3 text-slate-400">Not Included</td>\n                  <td className="py-3 px-3 text-slate-400">Not Included</td>\n                  <td className="py-3 px-3 text-slate-400">Not Included</td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>`
  },
  {
    search: `<td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>`,
    replace: `<td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>`
  },
  {
    search: `<td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>`,
    replace: `<td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>\n                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>`
  },
  {
    search: `<td className="py-3 px-3 text-sky-800 font-semibold">Priority Email</td>\n                  <td className="py-3 px-3 text-emerald-800 font-bold">24/7 Dedicated Priority</td>`,
    replace: `<td className="py-3 px-3 text-sky-800 font-semibold">Priority Email</td>\n                  <td className="py-3 px-3 text-purple-800 font-semibold">Live Chat Priority</td>\n                  <td className="py-3 px-3 text-emerald-800 font-bold">24/7 Dedicated Priority</td>`
  }
];

// We'll just replace row by row cleanly by matching the exact td rows.
// Actually, using regular expressions to just find all rows and insert a 5th td might be cleaner.
// A row has: <td>1</td><td>2</td><td>3</td><td>4</td><td>5</td>. We want to insert <td>4.5</td>.

const tableBodyStr = `<tbody className="divide-y divide-sand-100">
                <tr>
                  <td className="py-3 px-3 font-semibold text-forest-900">Document Vault Storage</td>
                  <td className="py-3 px-3 text-slate-600">10 Documents</td>
                  <td className="py-3 px-3 text-amber-700 font-bold">1,000 Documents</td>
                  <td className="py-3 px-3 text-sky-700 font-bold">Unlimited</td>
                  <td className="py-3 px-3 text-purple-700 font-bold">Unlimited</td>
                  <td className="py-3 px-3 text-emerald-800 font-bold">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-forest-900">Expenses & Budgets Suite</td>
                  <td className="py-3 px-3 text-slate-400">Not Included</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-forest-900">M-PESA SMS Auto-Parser</td>
                  <td className="py-3 px-3 text-slate-400">Not Included</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-forest-900">AI Document OCR Extraction</td>
                  <td className="py-3 px-3 text-slate-400">Not Included</td>
                  <td className="py-3 px-3 text-slate-400">Not Included</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-forest-900">Business & Employee Vault</td>
                  <td className="py-3 px-3 text-slate-400">Not Included</td>
                  <td className="py-3 px-3 text-slate-400">Not Included</td>
                  <td className="py-3 px-3 text-slate-400">Not Included</td>
                  <td className="py-3 px-3 text-slate-400">Not Included</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-forest-900">Cloud Sync & Multi-Device</td>
                  <td className="py-3 px-3 text-slate-400">Local Only</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-forest-900">View-Once Secure Sharing</td>
                  <td className="py-3 px-3 text-slate-400">Not Included</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                  <td className="py-3 px-3 text-emerald-600 font-bold"><Check size={16} /></td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold text-forest-900">Support Level</td>
                  <td className="py-3 px-3 text-slate-600">Community</td>
                  <td className="py-3 px-3 text-forest-800">Standard Email</td>
                  <td className="py-3 px-3 text-sky-800 font-semibold">Priority Email</td>
                  <td className="py-3 px-3 text-purple-800 font-semibold">Live Chat Priority</td>
                  <td className="py-3 px-3 text-emerald-800 font-bold">24/7 Dedicated Priority</td>
                </tr>
              </tbody>`;

const regexBody = /<tbody className="divide-y divide-sand-100">[\s\S]*?<\/tbody>/;
code = code.replace(regexBody, tableBodyStr);

fs.writeFileSync('components/Monetization.tsx', code);
